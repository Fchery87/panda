'use client'

import type { Id } from '@convex/_generated/dataModel'
import type { WebContainer } from '@webcontainer/api'
import { executeRuntimeCommand } from './runtime-command-execution'

type JobStatus = 'running' | 'completed' | 'failed'

interface ExecuteJobOptions {
  jobId: Id<'jobs'>
  command: string
  workingDirectory?: string
  updateJobStatus: (
    jobId: Id<'jobs'>,
    status: JobStatus,
    updates?: {
      logs?: string[]
      output?: string
      error?: string
      startedAt?: number
      completedAt?: number
    }
  ) => Promise<unknown>
  webcontainer?: WebContainer | null
  onOutput?: (chunk: string) => void
}

interface ExecuteJobResult {
  stdout: string
  stderr: string
  exitCode: number
  durationMs: number
  timedOut: boolean
}

async function executeViaServerRoute(request: {
  jobId: Id<'jobs'>
  command: string
  workingDirectory?: string
}): Promise<ExecuteJobResult> {
  const executeResponse = await fetch('/api/jobs/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })

  if (!executeResponse.ok) {
    const errorText = await executeResponse.text()
    throw new Error(errorText)
  }

  return (await executeResponse.json()) as ExecuteJobResult
}

export async function executeQueuedJob({
  jobId,
  command,
  workingDirectory,
  updateJobStatus,
  webcontainer,
  onOutput,
}: ExecuteJobOptions): Promise<ExecuteJobResult> {
  const startedAt = Date.now()
  const startedLog = `[${new Date(startedAt).toISOString()}] Running: ${command}`

  await updateJobStatus(jobId, 'running', {
    startedAt,
    logs: [startedLog],
  })

  try {
    const result = await executeRuntimeCommand({
      command,
      workingDirectory,
      webcontainer,
      onOutput,
      serverExecute: async ({ command: serverCommand, workingDirectory: serverWorkingDirectory }) =>
        await executeViaServerRoute({
          jobId,
          command: serverCommand,
          workingDirectory: serverWorkingDirectory,
        }),
    })
    const payload: ExecuteJobResult = {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      durationMs: result.durationMs,
      timedOut: result.timedOut,
    }

    await updateJobStatus(jobId, payload.exitCode === 0 ? 'completed' : 'failed', {
      completedAt: Date.now(),
      output: payload.stdout || undefined,
      error: payload.stderr || undefined,
      logs: [startedLog, `[${new Date().toISOString()}] Exit code: ${payload.exitCode}`],
    })

    return payload
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Command execution failed'
    await updateJobStatus(jobId, 'failed', {
      completedAt: Date.now(),
      error: message,
    })
    throw error
  }
}
