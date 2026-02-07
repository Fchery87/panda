import { spawn } from 'node:child_process'
import type { RunnerResult, SearchRunOptions } from './types'

const DEFAULT_MAX_OUTPUT_BYTES = 512 * 1024

export async function runSearchCommand(
  command: string,
  args: string[],
  options: SearchRunOptions
): Promise<RunnerResult> {
  const startedAt = Date.now()
  const maxOutputBytes = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES

  return new Promise<RunnerResult>((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      shell: false,
      env: process.env,
    })

    let stdout = ''
    let stderr = ''
    let stdoutBytes = 0
    let stderrBytes = 0
    let timedOut = false
    let truncated = false

    const timeout = setTimeout(() => {
      timedOut = true
      child.kill('SIGTERM')
      setTimeout(() => {
        if (!child.killed) child.kill('SIGKILL')
      }, 1500)
    }, options.timeoutMs)

    child.stdout?.on('data', (chunk: Buffer) => {
      if (stdoutBytes >= maxOutputBytes) {
        truncated = true
        return
      }
      const text = chunk.toString('utf8')
      const size = Buffer.byteLength(text)
      stdoutBytes += size
      if (stdoutBytes > maxOutputBytes) {
        truncated = true
        const allowed = Math.max(0, maxOutputBytes - (stdoutBytes - size))
        stdout += text.slice(0, allowed)
        return
      }
      stdout += text
    })

    child.stderr?.on('data', (chunk: Buffer) => {
      if (stderrBytes >= maxOutputBytes) {
        truncated = true
        return
      }
      const text = chunk.toString('utf8')
      const size = Buffer.byteLength(text)
      stderrBytes += size
      if (stderrBytes > maxOutputBytes) {
        truncated = true
        const allowed = Math.max(0, maxOutputBytes - (stderrBytes - size))
        stderr += text.slice(0, allowed)
        return
      }
      stderr += text
    })

    child.on('error', (error) => {
      clearTimeout(timeout)
      resolve({
        stdout,
        stderr: `${stderr}\n${error.message}`.trim(),
        exitCode: 1,
        durationMs: Date.now() - startedAt,
        timedOut,
        truncated,
      })
    })

    child.on('close', (code) => {
      clearTimeout(timeout)
      const timeoutSuffix = timedOut ? `\nProcess timed out after ${options.timeoutMs}ms` : ''
      resolve({
        stdout,
        stderr: `${stderr}${timeoutSuffix}`.trim(),
        exitCode: timedOut ? 124 : (code ?? 1),
        durationMs: Date.now() - startedAt,
        timedOut,
        truncated,
      })
    })
  })
}
