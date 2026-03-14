import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { isAuthenticatedNextjs } from '@convex-dev/auth/nextjs/server'

const execFileAsync = promisify(execFile)

interface GitRequest {
  action?: 'restore'
  hash?: string
  command?: string
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

export async function POST(req: Request) {
  if (!(await isAuthenticatedNextjs())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json()) as GitRequest

  try {
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

    if (body.command === 'git diff --name-only HEAD') {
      return Response.json(await runGit(['diff', '--name-only', 'HEAD']))
    }

    if (body.command === 'git add -A && git write-tree') {
      await runGit(['add', '-A'])
      return Response.json(await runGit(['write-tree']))
    }

    return Response.json({ error: 'Unsupported git command' }, { status: 400 })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Git command failed' },
      { status: 400 }
    )
  }
}
