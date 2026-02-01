'use client'

import { useCallback } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { toast } from 'sonner'
import type { Id } from '@convex/_generated/dataModel'

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
export type JobType = 'cli' | 'build' | 'test' | 'deploy' | 'lint' | 'format'

export interface Job {
  _id: Id<'jobs'>
  _creationTime: number
  projectId: Id<'projects'>
  type: JobType
  status: JobStatus
  command: string
  logs?: string[]
  output?: string
  error?: string
  createdAt: number
  startedAt?: number
  completedAt?: number
}

export interface JobInput {
  projectId: Id<'projects'>
  type: JobType
  command: string
  workingDirectory?: string
}

/**
 * Hook for managing jobs with real-time Convex subscriptions
 */
export function useJobs(projectId: Id<'projects'>) {
  // Query for job list (auto-updates via Convex subscription)
  const jobs = useQuery(api.jobs.list, { projectId }) as Job[] | undefined

  // Query for real-time log streaming of the most recent running job
  const runningJobs = jobs?.filter((job) => job.status === 'running') || []
  const latestRunningJob = runningJobs[0]

  // Real-time log subscription for the running job
  const streamingLogs = useQuery(
    api.jobs.streamLogs,
    latestRunningJob ? { jobId: latestRunningJob._id } : 'skip'
  )

  // Mutations
  const createJobMutation = useMutation(api.jobs.create)
  const createAndExecuteMutation = useMutation(api.jobs.createAndExecute)
  const updateJobStatusMutation = useMutation(api.jobs.updateStatus)
  const appendLogMutation = useMutation(api.jobs.appendLog)
  const cancelJobMutation = useMutation(api.jobs.cancel)
  const removeJobMutation = useMutation(api.jobs.remove)
  const cleanupOldJobsMutation = useMutation(api.jobs.cleanupOldJobs)

  /**
   * Create a new job (without auto-execution)
   */
  const createJob = useCallback(
    async (input: JobInput) => {
      try {
        const jobId = await createJobMutation({
          projectId: input.projectId,
          type: input.type,
          command: input.command,
        })

        toast.success('Job created', {
          description: `Command: ${input.command}`,
        })

        return jobId
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create job'
        toast.error('Failed to create job', {
          description: message,
        })
        throw error
      }
    },
    [createJobMutation]
  )

  /**
   * Create a new job and execute it immediately
   */
  const createAndExecute = useCallback(
    async (input: JobInput) => {
      try {
        const result = await createAndExecuteMutation({
          projectId: input.projectId,
          type: input.type,
          command: input.command,
          workingDirectory: input.workingDirectory,
        })

        toast.success('Job created and queued for execution', {
          description: `Command: ${input.command}`,
        })

        return result
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create job'
        toast.error('Failed to create job', {
          description: message,
        })
        throw error
      }
    },
    [createAndExecuteMutation]
  )

  /**
   * Update job status
   */
  const updateJobStatus = useCallback(
    async (
      jobId: Id<'jobs'>,
      status: JobStatus,
      updates?: {
        logs?: string[]
        output?: string
        error?: string
        startedAt?: number
        completedAt?: number
      }
    ) => {
      try {
        await updateJobStatusMutation({
          id: jobId,
          status,
          ...updates,
        })

        return jobId
      } catch (error) {
        console.error('Failed to update job status:', error)
        throw error
      }
    },
    [updateJobStatusMutation]
  )

  /**
   * Append a log line to a job
   */
  const appendLog = useCallback(
    async (jobId: Id<'jobs'>, log: string) => {
      try {
        await appendLogMutation({
          id: jobId,
          log,
        })

        return jobId
      } catch (error) {
        console.error('Failed to append log:', error)
        throw error
      }
    },
    [appendLogMutation]
  )

  /**
   * Cancel a running or queued job
   */
  const cancelJob = useCallback(
    async (jobId: Id<'jobs'>) => {
      try {
        await cancelJobMutation({ id: jobId })

        toast.info('Job cancelled')

        return jobId
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to cancel job'
        toast.error('Failed to cancel job', {
          description: message,
        })
        throw error
      }
    },
    [cancelJobMutation]
  )

  /**
   * Delete a job
   */
  const removeJob = useCallback(
    async (jobId: Id<'jobs'>) => {
      try {
        await removeJobMutation({ id: jobId })

        toast.success('Job deleted')

        return jobId
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to delete job'
        toast.error('Failed to delete job', {
          description: message,
        })
        throw error
      }
    },
    [removeJobMutation]
  )

  /**
   * Clean up old completed jobs
   */
  const cleanupOldJobs = useCallback(
    async (olderThanDays: number = 7) => {
      try {
        const deletedCount = await cleanupOldJobsMutation({
          projectId,
          olderThanDays,
        })

        toast.success(`Cleaned up ${deletedCount} old jobs`)

        return deletedCount
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to cleanup jobs'
        toast.error('Failed to cleanup jobs', {
          description: message,
        })
        throw error
      }
    },
    [cleanupOldJobsMutation, projectId]
  )

  /**
   * Get job status badge color
   */
  const getJobStatusColor = useCallback((status: JobStatus): string => {
    switch (status) {
      case 'queued':
        return 'bg-zinc-600 text-zinc-300'
      case 'running':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'failed':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'cancelled':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
      default:
        return 'bg-zinc-600 text-zinc-300'
    }
  }, [])

  /**
   * Check if any job is currently running
   */
  const isAnyJobRunning = (jobs || []).some((job) => job.status === 'running')

  return {
    // Data
    jobs: jobs || [],
    runningJobs,
    latestRunningJob,
    streamingLogs,
    isLoading: jobs === undefined,
    isAnyJobRunning,

    // Actions
    createJob,
    createAndExecute,
    updateJobStatus,
    appendLog,
    cancelJob,
    removeJob,
    cleanupOldJobs,

    // Helpers
    getJobStatusColor,
  }
}

export default useJobs
