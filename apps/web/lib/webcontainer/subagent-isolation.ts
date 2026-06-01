import type { WebContainer } from '@webcontainer/api'
import type { SubagentIsolationAdapter, SubagentIsolationScope } from '@/lib/agent/harness/types'

interface SnapshotEntry {
  path: string
  content: string
}

interface WebContainerIsolationOptions {
  root?: string
  excludeDirectories?: string[]
}

const DEFAULT_EXCLUDE_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'coverage',
  '.panda/snapshots',
  '.panda/worktrees',
])

export function createWebContainerSubagentIsolationAdapter(
  webcontainer: WebContainer,
  options: WebContainerIsolationOptions = {}
): SubagentIsolationAdapter {
  const root = normalizeAbsolutePath(options.root ?? '/')
  const excludeDirectories = new Set([
    ...DEFAULT_EXCLUDE_DIRECTORIES,
    ...(options.excludeDirectories ?? []),
  ])

  return {
    createSnapshotScope: async ({ childSessionID, agentName }) => {
      const before = await captureWebContainerSnapshot(webcontainer, root, excludeDirectories)
      return {
        id: `snapshot:${childSessionID}`,
        mode: 'snapshot',
        async diff() {
          const after = await captureWebContainerSnapshot(webcontainer, root, excludeDirectories)
          return summarizeSnapshotDiff(before, after)
        },
        async complete() {
          // Snapshot mode is review-first: leave the parent workspace unchanged by default.
          // A future merge/review command can use diff() to materialize accepted changes.
        },
        async restore() {
          await restoreWebContainerSnapshot(webcontainer, root, before, excludeDirectories)
        },
        async cleanup() {
          void agentName
        },
      } satisfies SubagentIsolationScope
    },
    createWorktreeScope: async ({ childSessionID }) => {
      const snapshot = await captureWebContainerSnapshot(webcontainer, root, excludeDirectories)
      const worktreePath = `/.panda/worktrees/${sanitizePathSegment(childSessionID)}`
      await writeSnapshotToRoot(webcontainer, worktreePath, snapshot)
      return {
        id: `worktree:${childSessionID}`,
        mode: 'worktree',
        worktreePath,
        async diff() {
          const after = await captureWebContainerSnapshot(
            webcontainer,
            worktreePath,
            excludeDirectories
          )
          return summarizeSnapshotDiff(snapshot, after)
        },
        async complete() {
          // Worktree scopes are isolated by path. Do not auto-merge into root;
          // parent review/merge must explicitly accept a generated patch.
        },
        async cleanup() {
          await removePath(webcontainer, worktreePath)
        },
      } satisfies SubagentIsolationScope
    },
  }
}

async function captureWebContainerSnapshot(
  webcontainer: WebContainer,
  root: string,
  excludeDirectories: Set<string>
): Promise<SnapshotEntry[]> {
  const files: SnapshotEntry[] = []
  await walk(webcontainer, root, root, excludeDirectories, files)
  return files.sort((a, b) => a.path.localeCompare(b.path))
}

async function walk(
  webcontainer: WebContainer,
  absolutePath: string,
  root: string,
  excludeDirectories: Set<string>,
  files: SnapshotEntry[]
): Promise<void> {
  const fs = webcontainer.fs as unknown as {
    readdir: (
      path: string,
      options?: { withFileTypes?: boolean }
    ) => Promise<
      Array<string | { name: string; isDirectory?: () => boolean; isFile?: () => boolean }>
    >
    readFile: (path: string, encoding: 'utf-8') => Promise<string>
  }

  let entries: Array<string | { name: string; isDirectory?: () => boolean; isFile?: () => boolean }>
  try {
    entries = await fs.readdir(absolutePath, { withFileTypes: true })
  } catch {
    return
  }

  for (const entry of entries) {
    const name = typeof entry === 'string' ? entry : entry.name
    const childPath = joinAbsolutePath(absolutePath, name)
    const relativePath = stripRoot(childPath, root)
    if (excludeDirectories.has(name) || excludeDirectories.has(relativePath)) continue

    const isDirectory = typeof entry === 'string' ? undefined : entry.isDirectory?.()
    if (isDirectory === true) {
      await walk(webcontainer, childPath, root, excludeDirectories, files)
      continue
    }

    try {
      const content = await fs.readFile(childPath, 'utf-8')
      files.push({ path: relativePath, content })
    } catch {
      // Binary or unreadable files are intentionally skipped. Subagent isolation
      // is for source/workspace text state, not large opaque artifacts.
    }
  }
}

async function restoreWebContainerSnapshot(
  webcontainer: WebContainer,
  root: string,
  snapshot: SnapshotEntry[],
  excludeDirectories: Set<string>
) {
  const current = await captureWebContainerSnapshot(webcontainer, root, excludeDirectories)
  const snapshotPaths = new Set(snapshot.map((entry) => entry.path))

  await Promise.all(
    current
      .filter((entry) => !snapshotPaths.has(entry.path))
      .map((entry) => removePath(webcontainer, joinAbsolutePath(root, entry.path)))
  )
  await writeSnapshotToRoot(webcontainer, root, snapshot)
}

async function writeSnapshotToRoot(
  webcontainer: WebContainer,
  root: string,
  snapshot: SnapshotEntry[]
) {
  for (const entry of snapshot) {
    const destination = joinAbsolutePath(root, entry.path)
    await ensureDirectory(webcontainer, dirname(destination))
    await (
      webcontainer.fs as unknown as { writeFile: (path: string, content: string) => Promise<void> }
    ).writeFile(destination, entry.content)
  }
}

async function ensureDirectory(webcontainer: WebContainer, path: string) {
  await (
    webcontainer.fs as unknown as {
      mkdir: (path: string, options?: { recursive?: boolean }) => Promise<void>
    }
  ).mkdir(path, { recursive: true })
}

async function removePath(webcontainer: WebContainer, path: string) {
  await (
    webcontainer.fs as unknown as {
      rm: (path: string, options?: { recursive?: boolean; force?: boolean }) => Promise<void>
    }
  ).rm(path, { recursive: true, force: true })
}

function summarizeSnapshotDiff(before: SnapshotEntry[], after: SnapshotEntry[]): string {
  const beforeMap = new Map(before.map((entry) => [entry.path, entry.content]))
  const afterMap = new Map(after.map((entry) => [entry.path, entry.content]))
  const added = [...afterMap.keys()].filter((path) => !beforeMap.has(path))
  const deleted = [...beforeMap.keys()].filter((path) => !afterMap.has(path))
  const modified = [...afterMap.keys()].filter(
    (path) => beforeMap.has(path) && beforeMap.get(path) !== afterMap.get(path)
  )

  return [
    '# Subagent isolation diff summary',
    added.length ? `Added: ${added.join(', ')}` : 'Added: none',
    modified.length ? `Modified: ${modified.join(', ')}` : 'Modified: none',
    deleted.length ? `Deleted: ${deleted.join(', ')}` : 'Deleted: none',
  ].join('\n')
}

function normalizeAbsolutePath(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return normalized.replace(/\/+$|^$/g, '') || '/'
}

function joinAbsolutePath(base: string, child: string): string {
  const normalizedBase = normalizeAbsolutePath(base)
  const normalizedChild = child.replace(/^\/+|\/+$/g, '')
  if (!normalizedChild) return normalizedBase
  return normalizedBase === '/' ? `/${normalizedChild}` : `${normalizedBase}/${normalizedChild}`
}

function stripRoot(path: string, root: string): string {
  const normalizedRoot = normalizeAbsolutePath(root)
  const normalizedPath = normalizeAbsolutePath(path)
  if (normalizedRoot === '/') return normalizedPath.replace(/^\//, '')
  return normalizedPath.startsWith(`${normalizedRoot}/`)
    ? normalizedPath.slice(normalizedRoot.length + 1)
    : normalizedPath.replace(/^\//, '')
}

function dirname(path: string): string {
  const normalized = normalizeAbsolutePath(path)
  const index = normalized.lastIndexOf('/')
  return index <= 0 ? '/' : normalized.slice(0, index)
}

function sanitizePathSegment(segment: string): string {
  return segment.replace(/[^a-zA-Z0-9._-]/g, '_')
}
