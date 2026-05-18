import { NextRequest } from 'next/server'
import path from 'node:path'
import { readdir, readFile, stat } from 'node:fs/promises'
import { isAuthenticatedNextjs } from '@/lib/auth/nextjs'
import { requireLocalWorkspaceApiEnabled } from '../../local-workspace-gate'

const DEFAULT_MAX_FILES = 500
const MAX_FILE_BYTES = 256 * 1024
const IGNORED_DIRECTORIES = new Set([
  '.git',
  '.next',
  '.turbo',
  'node_modules',
  'dist',
  'build',
  'coverage',
  'test-results',
])

interface LocalWorkspaceFile {
  path: string
  content?: string
  isBinary: boolean
  size: number
}

function clampMaxFiles(value: string | null): number {
  const parsed = value ? Number(value) : DEFAULT_MAX_FILES
  if (!Number.isFinite(parsed)) return DEFAULT_MAX_FILES
  return Math.max(1, Math.min(Math.floor(parsed), 2000))
}

function isWithinWorkspace(targetPath: string): boolean {
  const relativePath = path.relative(/* turbopackIgnore: true */ process.cwd(), targetPath)
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath))
}

function normalizeRelativePath(root: string, filePath: string): string {
  return path.relative(root, filePath).split(path.sep).join('/')
}

function looksBinary(buffer: Buffer): boolean {
  const sample = buffer.subarray(0, Math.min(buffer.length, 512))
  return sample.includes(0)
}

async function scanWorkspace(
  root: string,
  maxFiles: number
): Promise<{
  files: LocalWorkspaceFile[]
  truncated: boolean
}> {
  const files: LocalWorkspaceFile[] = []
  let truncated = false

  async function visit(directory: string): Promise<void> {
    if (files.length >= maxFiles) {
      truncated = true
      return
    }

    const entries = await readdir(directory, { withFileTypes: true })
    entries.sort((a, b) => a.name.localeCompare(b.name))

    for (const entry of entries) {
      if (files.length >= maxFiles) {
        truncated = true
        return
      }

      if (entry.name.startsWith('.') && entry.name !== '.env.example') {
        if (entry.isDirectory()) continue
      }

      const absolute = path.join(directory, entry.name)
      if (!isWithinWorkspace(absolute)) continue

      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORIES.has(entry.name)) continue
        await visit(absolute)
        continue
      }

      if (!entry.isFile()) continue

      const info = await stat(absolute)
      if (info.size > MAX_FILE_BYTES) {
        files.push({
          path: normalizeRelativePath(root, absolute),
          isBinary: true,
          size: info.size,
        })
        continue
      }

      const buffer = await readFile(absolute)
      const isBinary = looksBinary(buffer)
      files.push({
        path: normalizeRelativePath(root, absolute),
        ...(isBinary ? {} : { content: buffer.toString('utf8') }),
        isBinary,
        size: info.size,
      })
    }
  }

  await visit(root)
  return { files, truncated }
}

export async function GET(req: NextRequest) {
  if (!(await isAuthenticatedNextjs())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const workspaceApiGate = requireLocalWorkspaceApiEnabled()
  if (workspaceApiGate) return workspaceApiGate

  const url = new URL(req.url)
  const rootParam = url.searchParams.get('root')
  const root = rootParam
    ? path.resolve(/* turbopackIgnore: true */ process.cwd(), rootParam)
    : /* turbopackIgnore: true */ process.cwd()

  if (!isWithinWorkspace(root)) {
    return Response.json({ error: 'root must stay within the local workspace' }, { status: 400 })
  }

  try {
    const result = await scanWorkspace(root, clampMaxFiles(url.searchParams.get('maxFiles')))
    return Response.json({ root, ...result })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to scan local workspace' },
      { status: 400 }
    )
  }
}
