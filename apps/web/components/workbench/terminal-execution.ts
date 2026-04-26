import type { Id } from '@convex/_generated/dataModel'
import type { Job } from '@/hooks/useJobs'

export type TerminalJob = Job | LocalTerminalJob

export interface LocalTerminalJob {
  _id: `local_${string}`
  _creationTime: number
  projectId: Id<'projects'> | 'local'
  type: 'cli'
  status: Job['status']
  command: string
  logs: string[]
  output?: string
  error?: string
  createdAt: number
  startedAt?: number
  completedAt?: number
}

export function createLocalTerminalJob(command: string, now = Date.now()): LocalTerminalJob {
  return {
    _id: `local_${now.toString(36)}`,
    _creationTime: now,
    projectId: 'local',
    type: 'cli',
    status: 'running',
    command,
    logs: [`[${new Date(now).toISOString()}] Running locally: ${command}`],
    createdAt: now,
    startedAt: now,
  }
}

export function mergeTerminalJobs(jobs: Job[], localJobs: LocalTerminalJob[]): TerminalJob[] {
  return [...localJobs, ...jobs]
}

export function getTerminalRunningCount(jobs: TerminalJob[]): number {
  return jobs.filter((job) => job.status === 'running' || job.status === 'queued').length
}

export function isLocalTerminalJobId(jobId: TerminalJob['_id']): jobId is LocalTerminalJob['_id'] {
  return String(jobId).startsWith('local_')
}
