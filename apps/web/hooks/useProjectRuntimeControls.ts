'use client'

import { useCallback } from 'react'
import type { Id } from '@convex/_generated/dataModel'

type JobRecord = {
  _id: Id<'jobs'>
  command: string
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
}

interface UseProjectRuntimeControlsParams {
  projectId: Id<'projects'>
  files: Array<{ path: string }> | undefined
  jobs: JobRecord[]
  createAndExecute: (input: {
    projectId: Id<'projects'>
    type: 'cli' | 'build' | 'test' | 'deploy' | 'lint' | 'format'
    command: string
    workingDirectory?: string
  }) => Promise<{ jobId: Id<'jobs'>; command: string; workingDirectory?: string } | undefined>
  cancelJob: (jobId: Id<'jobs'>) => Promise<Id<'jobs'>>
  setIsBottomDockOpen: (value: boolean | ((prev: boolean) => boolean)) => void
  setActiveBottomDockTab: (tab: 'terminal' | 'agent-events') => void
  toast: {
    error: (title: string, options?: { description?: string }) => void
  }
}

export function useProjectRuntimeControls({
  projectId,
  files,
  jobs,
  createAndExecute,
  cancelJob,
  setIsBottomDockOpen,
  setActiveBottomDockTab,
  toast,
}: UseProjectRuntimeControlsParams) {
  const isRuntimeRunning = jobs.some((job) => job.status === 'queued' || job.status === 'running')

  const handleStartRuntime = useCallback(async () => {
    if (isRuntimeRunning) {
      setIsBottomDockOpen(true)
      setActiveBottomDockTab('terminal')
      return
    }

    const defaultCommand = files?.some((file) => file.path === 'package.json')
      ? 'bun run dev'
      : 'npm run dev'

    try {
      const result = await createAndExecute({
        projectId,
        type: 'build',
        command: defaultCommand,
      })

      if (result?.jobId) {
        setIsBottomDockOpen(true)
        setActiveBottomDockTab('terminal')
      }
    } catch (error) {
      toast.error('Failed to start dev server', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }, [
    createAndExecute,
    files,
    isRuntimeRunning,
    projectId,
    setActiveBottomDockTab,
    setIsBottomDockOpen,
    toast,
  ])

  const handleStopRuntime = useCallback(async () => {
    const runningRuntimeJob = jobs.find(
      (job) => job.status === 'queued' || job.status === 'running'
    )

    try {
      if (runningRuntimeJob) {
        await cancelJob(runningRuntimeJob._id)
      }
    } catch (error) {
      toast.error('Failed to stop dev server', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }, [cancelJob, jobs, toast])

  const handleOpenTerminal = useCallback(() => {
    setIsBottomDockOpen(true)
    setActiveBottomDockTab('terminal')
  }, [setActiveBottomDockTab, setIsBottomDockOpen])

  return {
    isRuntimeRunning,
    handleOpenTerminal,
    handleStartRuntime,
    handleStopRuntime,
  }
}
