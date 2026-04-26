'use client'

import type { Id } from '@convex/_generated/dataModel'
import type { WebContainer } from '@webcontainer/api'
import { spawnInContainer } from '@/lib/webcontainer/process-adapter'

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

  if (webcontainer) {
    await updateJobStatus(jobId, 'running', {
      startedAt,
      logs: [startedLog],
    })

    try {
      const result = await spawnInContainer(webcontainer, command, { onOutput })
      const payload = {
        ...result,
        durationMs: Date.now() - startedAt,
        timedOut: false,
      }

      await updateJobStatus(jobId, payload.exitCode === 0 ? 'completed' : 'failed', {
        completedAt: Date.now(),
        output: payload.stdout || undefined,
        error: payload.stderr || undefined,
        logs: [startedLog, `[${new Date().toISOString()}] Exit code: ${payload.exitCode}`],
      })

      return payload
    } catch (error) {
      const message = error instanceof Error ? error.message : 'WebContainer execution failed'
      await updateJobStatus(jobId, 'failed', {
        completedAt: Date.now(),
        error: message,
      })
      throw error
    }
  }

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
