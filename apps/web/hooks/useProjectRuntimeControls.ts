'use client'

import { useCallback } from 'react'
import type { Id } from '@convex/_generated/dataModel'

type RuntimePreview = {
  status: 'starting' | 'running'
  previewUrl: string
  activeCommand: string
  updatedAt: number
} | null

type JobRecord = {
  _id: Id<'jobs'>
  command: string
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
}

interface UseProjectRuntimeControlsParams {
  projectId: Id<'projects'>
  runtimePreview: RuntimePreview
  files: Array<{ path: string }> | undefined
  jobs: JobRecord[]
  createAndExecute: (input: {
    projectId: Id<'projects'>
    type: 'cli' | 'build' | 'test' | 'deploy' | 'lint' | 'format'
    command: string
    workingDirectory?: string
  }) => Promise<{ jobId: Id<'jobs'>; command: string; workingDirectory?: string } | undefined>
  cancelJob: (jobId: Id<'jobs'>) => Promise<Id<'jobs'>>
  updateProjectRuntimePreview: (runtimePreview: RuntimePreview) => Promise<unknown>
  setActiveCenterTab: (tab: 'editor' | 'diff' | 'preview' | 'logs' | 'tests') => void
  setIsBottomDockOpen: (value: boolean | ((prev: boolean) => boolean)) => void
  setActiveBottomDockTab: (tab: 'terminal' | 'agent-events') => void
  toast: {
    error: (title: string, options?: { description?: string }) => void
  }
}

export function useProjectRuntimeControls({
  projectId,
  runtimePreview,
  files,
  jobs,
  createAndExecute,
  cancelJob,
  updateProjectRuntimePreview,
  setActiveCenterTab,
  setIsBottomDockOpen,
  setActiveBottomDockTab,
  toast,
}: UseProjectRuntimeControlsParams) {
  const previewUrl = runtimePreview?.previewUrl ?? null
  const isPreviewRunning = runtimePreview?.status === 'running'

  const handleOpenPreview = useCallback(() => {
    setActiveCenterTab('preview')
  }, [setActiveCenterTab])

  const handleStartRuntime = useCallback(async () => {
    if (runtimePreview?.status === 'starting' || runtimePreview?.status === 'running') {
      setActiveCenterTab('preview')
      return
    }

    const defaultCommand = files?.some((file) => file.path === 'package.json')
      ? 'bun run dev'
      : 'npm run dev'

    try {
      await updateProjectRuntimePreview({
        status: 'starting',
        previewUrl: 'http://localhost:3000',
        activeCommand: defaultCommand,
        updatedAt: Date.now(),
      })

      const result = await createAndExecute({
        projectId,
        type: 'build',
        command: defaultCommand,
      })

      if (result?.jobId) {
        setIsBottomDockOpen(true)
        setActiveBottomDockTab('terminal')
        setActiveCenterTab('preview')
      }
    } catch (error) {
      toast.error('Failed to start dev server', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
      await updateProjectRuntimePreview(null)
    }
  }, [
    createAndExecute,
    files,
    projectId,
    runtimePreview?.status,
    setActiveBottomDockTab,
    setActiveCenterTab,
    setIsBottomDockOpen,
    toast,
    updateProjectRuntimePreview,
  ])

  const handleStopRuntime = useCallback(async () => {
    const activeCommand = runtimePreview?.activeCommand
    const runningRuntimeJob = jobs.find(
      (job) =>
        job.command === activeCommand && (job.status === 'queued' || job.status === 'running')
    )

    try {
      if (runningRuntimeJob) {
        await cancelJob(runningRuntimeJob._id)
      }
      await updateProjectRuntimePreview(null)
    } catch (error) {
      toast.error('Failed to stop dev server', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }, [cancelJob, jobs, runtimePreview?.activeCommand, toast, updateProjectRuntimePreview])

  const handleOpenTerminal = useCallback(() => {
    setIsBottomDockOpen(true)
    setActiveBottomDockTab('terminal')
  }, [setActiveBottomDockTab, setIsBottomDockOpen])

  return {
    previewUrl,
    isPreviewRunning,
    handleOpenPreview,
    handleOpenTerminal,
    handleStartRuntime,
    handleStopRuntime,
  }
}
