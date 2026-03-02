import { NextRequest } from 'next/server'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { isAuthenticatedNextjs } from '@convex-dev/auth/nextjs/server'
import { redactError } from '@/lib/security/redact'

interface ExecuteRequest {
  command: string
  workingDirectory?: string
  timeoutMs?: number
}

interface ExecuteResponse {
  stdout: string
  stderr: string
  exitCode: number
  durationMs: number
  timedOut: boolean
}

const DEFAULT_TIMEOUT_MS = 60_000
const MAX_OUTPUT_BYTES = 1024 * 1024 // 1MB safety cap
const ALLOWED_COMMANDS = new Set([
  'bun',
  'bunx',
  'npm',
  'npx',
  'git',
  'node',
  'ls',
  'cat',
  'pwd',
  'echo',
])
const SHELL_META_CHARS = /[|&;<>`]/u

const SSRF_PATTERNS = [
  /169\.254\.\d+\.\d+/, // AWS/GCP metadata
  /127\.\d+\.\d+\.\d+/, // Loopback
  /0\.0\.0\.0/, // Wildcard bind
  /localhost/i, // localhost
  /\[::1\]/, // IPv6 loopback
  /10\.\d+\.\d+\.\d+/, // Private Class A
  /172\.(1[6-9]|2\d|3[01])\.\d+\.\d+/, // Private Class B
  /192\.168\.\d+\.\d+/, // Private Class C
]

function clampTimeout(value: number | undefined): number {
  if (!value || !Number.isFinite(value)) return DEFAULT_TIMEOUT_MS
  return Math.max(1_000, Math.min(value, 5 * 60_000))
}

function resolveWorkingDirectory(workingDirectory?: string): string {
  const root = process.cwd()
  if (!workingDirectory) return root

  const resolved = path.resolve(root, workingDirectory)
  if (!resolved.startsWith(root)) {
    throw new Error('Invalid workingDirectory: must stay within project root')
  }
  return resolved
}

function tokenizeCommand(command: string): string[] {
  if (SHELL_META_CHARS.test(command) || command.includes('\n') || command.includes('\r')) {
    throw new Error('Shell operators are not allowed')
  }

  const tokens = command.match(/"[^"]*"|'[^']*'|\S+/g) ?? []
  if (tokens.length === 0) {
    throw new Error('command is required')
  }

  return tokens.map((token) => {
    if (
      (token.startsWith('"') && token.endsWith('"')) ||
      (token.startsWith("'") && token.endsWith("'"))
    ) {
      return token.slice(1, -1)
    }
    return token
  })
}

function buildSafeChildEnv(): NodeJS.ProcessEnv {
  return {
    NODE_ENV: process.env.NODE_ENV,
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    TMPDIR: process.env.TMPDIR,
    TEMP: process.env.TEMP,
    TMP: process.env.TMP,
    CI: process.env.CI,
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticatedNextjs())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: ExecuteRequest
  try {
    body = (await req.json()) as ExecuteRequest
  } catch (error) {
    void error
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const command = body.command?.trim()
  if (!command) {
    return Response.json({ error: 'command is required' }, { status: 400 })
  }

  const timeoutMs = clampTimeout(body.timeoutMs)
  let cwd: string
  try {
    cwd = resolveWorkingDirectory(body.workingDirectory)
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Invalid workingDirectory' },
      { status: 400 }
    )
  }

  const startedAt = Date.now()
  let commandTokens: string[]
  try {
    commandTokens = tokenizeCommand(command)
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Invalid command' },
      { status: 400 }
    )
  }

  const [bin, ...args] = commandTokens
  if (!ALLOWED_COMMANDS.has(bin)) {
    return Response.json({ error: `Command not allowed: ${bin}` }, { status: 403 })
  }

  // SSRF Protection: Block args targeting internal/metadata endpoints
  for (const arg of args) {
    if (SSRF_PATTERNS.some((p) => p.test(arg))) {
      return Response.json(
        { error: 'Blocked: argument targets a restricted network address' },
        { status: 403 }
      )
    }
  }

  const result = await new Promise<ExecuteResponse>((resolve) => {
    const child = spawn(bin, args, {
      cwd,
      shell: false,
      env: buildSafeChildEnv(),
    })

    let stdout = ''
    let stderr = ''
    let stdoutBytes = 0
    let stderrBytes = 0
    let timedOut = false

    const timeout = setTimeout(() => {
      timedOut = true
      child.kill('SIGTERM')
      setTimeout(() => {
        if (!child.killed) child.kill('SIGKILL')
      }, 2_000)
    }, timeoutMs)

    child.stdout?.on('data', (chunk: Buffer) => {
      if (stdoutBytes >= MAX_OUTPUT_BYTES) return
      const text = chunk.toString('utf8')
      stdoutBytes += Buffer.byteLength(text)
      if (stdoutBytes <= MAX_OUTPUT_BYTES) {
        stdout += text
      }
    })

    child.stderr?.on('data', (chunk: Buffer) => {
      if (stderrBytes >= MAX_OUTPUT_BYTES) return
      const text = chunk.toString('utf8')
      stderrBytes += Buffer.byteLength(text)
      if (stderrBytes <= MAX_OUTPUT_BYTES) {
        stderr += text
      }
    })

    child.on('close', (code) => {
      clearTimeout(timeout)
      resolve({
        stdout,
        stderr: timedOut ? `${stderr}\nProcess timed out after ${timeoutMs}ms`.trim() : stderr,
        exitCode: timedOut ? 124 : (code ?? 1),
        durationMs: Date.now() - startedAt,
        timedOut,
      })
    })

    child.on('error', (error) => {
      clearTimeout(timeout)
      resolve({
        stdout,
        stderr: `${stderr}\n${error.message}`.trim(),
        exitCode: 1,
        durationMs: Date.now() - startedAt,
        timedOut,
      })
    })
  })

  return Response.json({
    ...result,
    stderr: redactError(result.stderr),
  })
}
