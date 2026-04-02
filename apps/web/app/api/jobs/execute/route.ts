import { NextRequest } from 'next/server'
import { spawn } from 'node:child_process'
import { appendFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { isAuthenticatedNextjs } from '@/lib/auth/nextjs'
import { redactError } from '@/lib/security/redact'
import { cleanupJobProcess, registerJobProcess } from '@/lib/jobs/processRegistry'
import { analyzeCommand } from '@/lib/agent/command-analysis'

interface ExecuteRequest {
  jobId?: string
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
const MAX_OUTPUT_BYTES = 1024 * 1024
const ALLOWED_COMMANDS = new Set([
  'bun',
  'bunx',
  'cat',
  'echo',
  'git',
  'grep',
  'head',
  'ls',
  'node',
  'npm',
  'npx',
  'pwd',
  'sed',
  'tail',
  'wc',
])
const DISALLOWED_META_CHARS = /[`;]/u

const SSRF_PATTERNS = [
  /169\.254\.\d+\.\d+/,
  /127\.\d+\.\d+\.\d+/,
  /0\.0\.0\.0/,
  /localhost/i,
  /\[::1\]/,
  /10\.\d+\.\d+\.\d+/,
  /172\.(1[6-9]|2\d|3[01])\.\d+\.\d+/,
  /192\.168\.\d+\.\d+/,
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

function tokenizeSegment(command: string): string[] {
  if (DISALLOWED_META_CHARS.test(command) || command.includes('\n') || command.includes('\r')) {
    throw new Error('Unsupported shell meta characters in command')
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

function validateTokens(tokens: string[]): void {
  const [bin, ...args] = tokens
  if (!ALLOWED_COMMANDS.has(bin)) {
    throw new Error(`Command not allowed: ${bin}`)
  }

  for (const arg of args) {
    if (SSRF_PATTERNS.some((pattern) => pattern.test(arg))) {
      throw new Error('Blocked: argument targets a restricted network address')
    }
  }
}

function parseRedirect(command: string): {
  baseCommand: string
  targetFile: string
  append: boolean
} | null {
  const match = command.match(/^(.*?)(>>|>)\s*([^\s]+)\s*$/u)
  if (!match) return null

  return {
    baseCommand: match[1]?.trim() ?? '',
    targetFile: match[3]?.trim() ?? '',
    append: match[2] === '>>',
  }
}

async function runSingleCommand(
  tokens: string[],
  cwd: string,
  timeoutMs: number,
  jobId?: string
): Promise<ExecuteResponse> {
  validateTokens(tokens)
  const [bin, ...args] = tokens
  const startedAt = Date.now()

  return await new Promise<ExecuteResponse>((resolve) => {
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

    if (jobId) {
      registerJobProcess(jobId, child, timeout)
    }

    child.stdout?.on('data', (chunk: Buffer) => {
      if (stdoutBytes >= MAX_OUTPUT_BYTES) return
      const text = chunk.toString('utf8')
      stdoutBytes += Buffer.byteLength(text)
      if (stdoutBytes <= MAX_OUTPUT_BYTES) stdout += text
    })

    child.stderr?.on('data', (chunk: Buffer) => {
      if (stderrBytes >= MAX_OUTPUT_BYTES) return
      const text = chunk.toString('utf8')
      stderrBytes += Buffer.byteLength(text)
      if (stderrBytes <= MAX_OUTPUT_BYTES) stderr += text
    })

    child.on('close', (code) => {
      if (jobId) {
        cleanupJobProcess(jobId)
      } else {
        clearTimeout(timeout)
      }

      resolve({
        stdout,
        stderr: timedOut ? `${stderr}\nProcess timed out after ${timeoutMs}ms`.trim() : stderr,
        exitCode: timedOut ? 124 : (code ?? 1),
        durationMs: Date.now() - startedAt,
        timedOut,
      })
    })

    child.on('error', (error) => {
      if (jobId) {
        cleanupJobProcess(jobId)
      } else {
        clearTimeout(timeout)
      }

      resolve({
        stdout,
        stderr: `${stderr}\n${error.message}`.trim(),
        exitCode: 1,
        durationMs: Date.now() - startedAt,
        timedOut,
      })
    })
  })
}

async function runPipeline(
  segments: string[],
  cwd: string,
  timeoutMs: number
): Promise<ExecuteResponse> {
  const tokenizedSegments = segments.map(tokenizeSegment)
  tokenizedSegments.forEach(validateTokens)

  const startedAt = Date.now()

  return await new Promise<ExecuteResponse>((resolve) => {
    const children = tokenizedSegments.map(([bin, ...args]) =>
      spawn(bin, args, {
        cwd,
        shell: false,
        env: buildSafeChildEnv(),
        stdio: ['pipe', 'pipe', 'pipe'],
      })
    )

    for (let index = 0; index < children.length - 1; index += 1) {
      children[index]?.stdout?.pipe(children[index + 1]?.stdin ?? null)
    }

    let stdout = ''
    let stderr = ''
    let stdoutBytes = 0
    let stderrBytes = 0
    let timedOut = false
    let pending = children.length
    let finalExitCode = 0

    const timeout = setTimeout(() => {
      timedOut = true
      for (const child of children) {
        child.kill('SIGTERM')
      }
    }, timeoutMs)

    const lastChild = children[children.length - 1]
    lastChild?.stdout?.on('data', (chunk: Buffer) => {
      if (stdoutBytes >= MAX_OUTPUT_BYTES) return
      const text = chunk.toString('utf8')
      stdoutBytes += Buffer.byteLength(text)
      if (stdoutBytes <= MAX_OUTPUT_BYTES) stdout += text
    })

    for (const child of children) {
      child.stderr?.on('data', (chunk: Buffer) => {
        if (stderrBytes >= MAX_OUTPUT_BYTES) return
        const text = chunk.toString('utf8')
        stderrBytes += Buffer.byteLength(text)
        if (stderrBytes <= MAX_OUTPUT_BYTES) stderr += text
      })

      child.on('close', (code) => {
        pending -= 1
        if ((code ?? 0) !== 0 && finalExitCode === 0) {
          finalExitCode = code ?? 1
        }
        if (pending === 0) {
          clearTimeout(timeout)
          resolve({
            stdout,
            stderr: timedOut ? `${stderr}\nProcess timed out after ${timeoutMs}ms`.trim() : stderr,
            exitCode: timedOut ? 124 : finalExitCode,
            durationMs: Date.now() - startedAt,
            timedOut,
          })
        }
      })

      child.on('error', (error) => {
        pending -= 1
        stderr = `${stderr}\n${error.message}`.trim()
        finalExitCode = 1
        if (pending === 0) {
          clearTimeout(timeout)
          resolve({
            stdout,
            stderr,
            exitCode: 1,
            durationMs: Date.now() - startedAt,
            timedOut,
          })
        }
      })
    }
  })
}

async function executeCommandGraph(
  command: string,
  cwd: string,
  timeoutMs: number,
  jobId?: string
): Promise<ExecuteResponse> {
  const redirect = parseRedirect(command)
  if (redirect) {
    const result = await executeCommandGraph(redirect.baseCommand, cwd, timeoutMs, jobId)
    if (result.exitCode === 0) {
      const targetPath = path.resolve(cwd, redirect.targetFile)
      if (!targetPath.startsWith(cwd)) {
        throw new Error('Redirect target must stay within project root')
      }
      if (redirect.append) {
        await appendFile(targetPath, result.stdout, 'utf8')
      } else {
        await writeFile(targetPath, result.stdout, 'utf8')
      }
    }
    return result
  }

  const analysis = analyzeCommand(command)
  if (analysis.kind === 'pipeline') {
    return await runPipeline(analysis.segments, cwd, timeoutMs)
  }

  if (analysis.kind === 'chain') {
    throw new Error('Shell operators are not allowed')
  }

  return await runSingleCommand(tokenizeSegment(command), cwd, timeoutMs, jobId)
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticatedNextjs())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

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

  const analysis = analyzeCommand(command)
  if (analysis.kind === 'chain') {
    return Response.json(
      { error: `${analysis.reason} Split chained commands and run them one at a time.` },
      { status: 400 }
    )
  }

  try {
    const cwd = resolveWorkingDirectory(body.workingDirectory)
    const timeoutMs = clampTimeout(body.timeoutMs)
    const result = await executeCommandGraph(command, cwd, timeoutMs, body.jobId)

    return Response.json({
      ...result,
      stderr: redactError(result.stderr),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid command'
    const status =
      message.includes('Command not allowed') || message.includes('restricted network address')
        ? 403
        : 400
    return Response.json({ error: message }, { status })
  }
}
