import { NextRequest } from 'next/server'
import { spawn } from 'node:child_process'
import path from 'node:path'

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

export async function POST(req: NextRequest) {
  let body: ExecuteRequest
  try {
    body = (await req.json()) as ExecuteRequest
  } catch {
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

  const result = await new Promise<ExecuteResponse>((resolve) => {
    const child = spawn(command, {
      cwd,
      shell: true,
      env: process.env,
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

  return Response.json(result)
}
