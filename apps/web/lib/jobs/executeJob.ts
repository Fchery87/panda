'use client'

import type { Id } from '@convex/_generated/dataModel'

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
}

interface ExecuteJobResult {
  stdout: string
  stderr: string
  exitCode: number
  durationMs: number
  timedOut: boolean
}

export async function executeQueuedJob({
  jobId,
  command,
  workingDirectory,
  updateJobStatus,
}: ExecuteJobOptions): Promise<ExecuteJobResult> {
  const startedAt = Date.now()
  const startedLog = `[${new Date(startedAt).toISOString()}] Running: ${command}`

  await updateJobStatus(jobId, 'running', {
    startedAt,
    logs: [startedLog],
  })

  const executeResponse = await fetch('/api/jobs/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jobId,
      command,
      workingDirectory,
    }),
  })

  if (!executeResponse.ok) {
    const errorText = await executeResponse.text()
    await updateJobStatus(jobId, 'failed', {
      completedAt: Date.now(),
      error: errorText,
    })
    throw new Error(errorText)
  }

  const payload = (await executeResponse.json()) as ExecuteJobResult

  await updateJobStatus(jobId, payload.exitCode === 0 ? 'completed' : 'failed', {
    completedAt: Date.now(),
    output: payload.stdout || undefined,
    error: payload.stderr || undefined,
    logs: [startedLog, `[${new Date().toISOString()}] Exit code: ${payload.exitCode}`],
  })

  return payload
}
