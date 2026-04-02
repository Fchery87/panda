import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { isAuthenticatedNextjs } from '@/lib/auth/nextjs'

const execFileAsync = promisify(execFile)

interface DiffRequest {
  from?: string
  to: string
}

function isValidHash(hash: string): boolean {
  return /^[0-9a-f]{6,64}$/iu.test(hash)
}

export async function POST(req: Request) {
  if (!(await isAuthenticatedNextjs())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json()) as DiffRequest
  if (!body.to || !isValidHash(body.to) || (body.from && !isValidHash(body.from))) {
    return Response.json({ error: 'Invalid diff hashes' }, { status: 400 })
  }

  try {
    const args = body.from ? ['diff', body.from, body.to] : ['diff', body.to]
    const result = await execFileAsync('git', args, {
      cwd: process.cwd(),
      maxBuffer: 1024 * 1024,
    })
    return Response.json({ diff: result.stdout })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to build diff' },
      { status: 400 }
    )
  }
}
