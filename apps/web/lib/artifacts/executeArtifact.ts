'use client'

import type { Id } from '@convex/_generated/dataModel'
import { api } from '@convex/_generated/api'
import type { ConvexReactClient } from 'convex/react'
import { executeQueuedJob } from '@/lib/jobs/executeJob'
import { normalizeProjectFilePath } from '@/lib/project-files/path'
import { buildAdvisorPreflight, enforceAdvisorReview, type AdvisorPolicy, type AdvisorReview } from '@/lib/agent/workflow'

export type ArtifactAction =
  | {
      type: 'file_write'
      payload: {
        filePath: string
        content: string
        originalContent?: string | null
      }
    }
  | {
      type: 'command_run'
      payload: {
        command: string
        workingDirectory?: string
      }
    }

export type ArtifactRecordStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'rejected'

export function inferArtifactJobType(command: string) {
  const cmdLower = command.toLowerCase()
  if (cmdLower.includes('build') || cmdLower.includes('compile')) return 'build' as const
  if (cmdLower.includes('test')) return 'test' as const
  if (cmdLower.includes('deploy')) return 'deploy' as const
  if (cmdLower.includes('lint')) return 'lint' as const
  if (cmdLower.includes('format')) return 'format' as const
  return 'cli' as const
}

export function getPrimaryArtifactAction(record: {
  actions: ArtifactAction[]
}): ArtifactAction | null {
  const action = record.actions?.[0]
  if (!action || (action.type !== 'file_write' && action.type !== 'command_run')) return null
  return action
}

interface ApplyArtifactOptions {
  artifactId: Id<'artifacts'>
  action: ArtifactAction
  projectId: Id<'projects'>
  convex: ConvexReactClient
  upsertFile: (args: {
    id?: Id<'files'>
    projectId: Id<'projects'>
    path: string
    content: string
    isBinary: boolean
  }) => Promise<unknown>
  createAndExecuteJob: (args: {
    projectId: Id<'projects'>
    type: 'cli' | 'build' | 'test' | 'deploy' | 'lint' | 'format'
    command: string
    workingDirectory?: string
  }) => Promise<{ jobId: Id<'jobs'> }>
  updateJobStatus: (
    jobId: Id<'jobs'>,
    status: 'running' | 'completed' | 'failed',
    updates?: {
      logs?: string[]
      output?: string
      error?: string
      startedAt?: number
      completedAt?: number
    }
  ) => Promise<unknown>
  updateArtifactStatus: (args: {
    id: Id<'artifacts'>
    status: ArtifactRecordStatus
  }) => Promise<unknown>
  writeFileToRuntime?: (path: string, content: string) => Promise<unknown>
  advisorPolicy?: AdvisorPolicy
  advisorApproved?: boolean
  advisorReview?: AdvisorReview | null
}

export async function applyArtifact({
  artifactId,
  action,
  projectId,
  convex,
  upsertFile,
  createAndExecuteJob,
  updateJobStatus,
  updateArtifactStatus,
  writeFileToRuntime,
  advisorPolicy,
  advisorApproved = false,
  advisorReview = null,
}: ApplyArtifactOptions): Promise<{ kind: 'file' | 'command'; description: string }> {
  await updateArtifactStatus({ id: artifactId, status: 'in_progress' })

  try {
    if (advisorPolicy) {
      const preflight = buildAdvisorPreflight({
        policy: advisorPolicy,
        changedFiles: action.type === 'file_write' ? [normalizeProjectFilePath(action.payload.filePath)] : [],
        commands: action.type === 'command_run' ? [action.payload.command] : [],
      })
      if (preflight.required && !advisorApproved) {
        const decision = enforceAdvisorReview({
          required: true,
          gates: preflight.gates,
          review: advisorReview,
        })
        if (!decision.canContinue) {
          throw new Error(decision.message || preflight.message)
        }
      }
    }

    if (action.type === 'file_write') {
      const filePath = normalizeProjectFilePath(action.payload.filePath)
      if (!filePath) {
        throw new Error('Artifact file path is empty after normalization')
      }

      const existing = await convex.query(api.files.getByPath, {
        projectId,
        path: filePath,
      })

      await upsertFile({
        id: existing?._id,
        projectId,
        path: filePath,
        content: action.payload.content,
        isBinary: false,
      })

      const verified = await convex.query(api.files.getByPath, {
        projectId,
        path: filePath,
      })
      if (!verified || verified.path !== filePath) {
        throw new Error(`File artifact was applied but not verified in the project file tree: ${filePath}`)
      }

      await writeFileToRuntime?.(filePath, action.payload.content)

      await updateArtifactStatus({ id: artifactId, status: 'completed' })
      return { kind: 'file', description: filePath }
    }

    const { jobId } = await createAndExecuteJob({
      projectId,
      type: inferArtifactJobType(action.payload.command),
      command: action.payload.command,
      workingDirectory: action.payload.workingDirectory,
    })

    await executeQueuedJob({
      jobId,
      command: action.payload.command,
      workingDirectory: action.payload.workingDirectory,
      updateJobStatus,
    })

    await updateArtifactStatus({ id: artifactId, status: 'completed' })
    return { kind: 'command', description: action.payload.command }
  } catch (error) {
    await updateArtifactStatus({ id: artifactId, status: 'failed' })
    throw error
  }
}
