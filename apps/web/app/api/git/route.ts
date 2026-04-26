// apps/web/app/api/git/route.ts
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { isAuthenticatedNextjs } from '@/lib/auth/nextjs'
import { requireLocalWorkspaceApiEnabled } from '../local-workspace-gate'

const execFileAsync = promisify(execFile)

interface GitRequest {
  action?: 'restore'
  hash?: string
  command?: string
  // For stage/unstage
  paths?: string[]
  // For commit
  message?: string
  // For log
  limit?: number
  // For checkout
  branch?: string
}

async function runGit(args: string[]) {
  const result = await execFileAsync('git', args, {
    cwd: process.cwd(),
    maxBuffer: 1024 * 1024,
  })
  return { stdout: result.stdout, stderr: result.stderr, exitCode: 0 }
}

function isValidHash(hash: string): boolean {
  return /^[0-9a-f]{6,64}$/iu.test(hash)
}

function isValidBranchName(name: string): boolean {
  // Reject shell metacharacters and path traversal
  return /^[a-zA-Z0-9_\-./]+$/.test(name) && !name.includes('..')
}

function isValidPath(p: string): boolean {
  return !p.includes('..') && !p.startsWith('/')
}

export async function POST(req: Request) {
  if (!(await isAuthenticatedNextjs())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const workspaceApiGate = requireLocalWorkspaceApiEnabled()
  if (workspaceApiGate) return workspaceApiGate

  const body = (await req.json()) as GitRequest

  try {
    // --- Existing: snapshot restore ---
    if (body.action === 'restore') {
      if (!body.hash || !isValidHash(body.hash)) {
        return Response.json({ error: 'Invalid snapshot hash' }, { status: 400 })
      }
      const readTree = await runGit(['read-tree', body.hash])
      const checkout = await runGit(['checkout-index', '-a', '-f'])
      return Response.json({
        stdout: `${readTree.stdout}${checkout.stdout}`,
        stderr: `${readTree.stderr}${checkout.stderr}`,
        exitCode: 0,
      })
    }

    if (!body.command) {
      return Response.json({ error: 'command is required' }, { status: 400 })
    }

    switch (body.command) {
      // --- Existing commands (preserved) ---
      case 'git diff --name-only HEAD':
        return Response.json(await runGit(['diff', '--name-only', 'HEAD']))

      case 'git add -A && git write-tree':
        await runGit(['add', '-A'])
        return Response.json(await runGit(['write-tree']))

      // --- New: status ---
      case 'status': {
        const branchResult = await runGit(['rev-parse', '--abbrev-ref', 'HEAD'])
        const branch = branchResult.stdout.trim()

        const statusResult = await runGit(['status', '--porcelain=v1', '-uall'])
        const lines = statusResult.stdout.split('\n').filter(Boolean)

        const staged: string[] = []
        const unstaged: string[] = []
        const untracked: string[] = []

        for (const line of lines) {
          const x = line[0] // index status
          const y = line[1] // worktree status
          const file = line.slice(3)

          if (x === '?' && y === '?') {
            untracked.push(file)
          } else {
            if (x !== ' ' && x !== '?') staged.push(file)
            if (y !== ' ' && y !== '?') unstaged.push(file)
          }
        }

        return Response.json({ branch, staged, unstaged, untracked })
      }

      // --- New: log ---
      case 'log': {
        const limit = Math.min(body.limit ?? 20, 100)
        const logResult = await runGit([
          'log',
          `--max-count=${limit}`,
          '--format=%H%x00%an%x00%ae%x00%aI%x00%s',
        ])
        const commits = logResult.stdout
          .split('\n')
          .filter(Boolean)
          .map((line) => {
            const [hash, author, email, date, message] = line.split('\x00')
            return { hash, author, email, date, message }
          })

        return Response.json({ commits })
      }

      // --- New: branch-list ---
      case 'branch-list': {
        const currentResult = await runGit(['rev-parse', '--abbrev-ref', 'HEAD'])
        const current = currentResult.stdout.trim()

        const branchesResult = await runGit(['branch', '--format=%(refname:short)'])
        const branches = branchesResult.stdout.split('\n').filter(Boolean)

        return Response.json({ current, branches })
      }

      // --- New: stage ---
      case 'stage': {
        if (!body.paths?.length || !body.paths.every(isValidPath)) {
          return Response.json({ error: 'Valid paths[] required' }, { status: 400 })
        }
        return Response.json(await runGit(['add', '--', ...body.paths]))
      }

      // --- New: unstage ---
      case 'unstage': {
        if (!body.paths?.length || !body.paths.every(isValidPath)) {
          return Response.json({ error: 'Valid paths[] required' }, { status: 400 })
        }
        return Response.json(await runGit(['reset', 'HEAD', '--', ...body.paths]))
      }

      // --- New: commit ---
      case 'commit': {
        if (!body.message || body.message.length > 1000) {
          return Response.json({ error: 'message required (max 1000 chars)' }, { status: 400 })
        }
        return Response.json(await runGit(['commit', '-m', body.message]))
      }

      // --- New: checkout branch ---
      case 'checkout': {
        if (!body.branch || !isValidBranchName(body.branch)) {
          return Response.json({ error: 'Valid branch name required' }, { status: 400 })
        }
        return Response.json(await runGit(['checkout', body.branch]))
      }

      // --- New: diff (staged) ---
      case 'diff-staged':
        return Response.json(await runGit(['diff', '--cached']))

      // --- New: diff (unstaged) ---
      case 'diff-unstaged':
        return Response.json(await runGit(['diff']))

      default:
        return Response.json({ error: 'Unsupported git command' }, { status: 400 })
    }
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Git command failed' },
      { status: 400 }
    )
  }
}
