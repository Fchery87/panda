'use client'

import type { Id } from '@convex/_generated/dataModel'
import {
  buildAdvisorPreflight,
  buildArtifactAdvisorReviewRequest,
  selectAdvisorReviewForTarget,
  type AdvisorPolicy,
  type AdvisorReviewRecord,
} from '@/lib/agent/workflow'
import { getPrimaryArtifactAction, type ArtifactAction } from './executeArtifact'

export interface ArtifactControllerRecord {
  _id: Id<'artifacts'>
  actions: ArtifactAction[]
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rejected'
  createdAt: number
}

type ApplyArtifactResult = { kind: 'file' | 'command'; description: string }

type ApplyArtifactFn = (args: {
  artifactId: Id<'artifacts'>
  action: ArtifactAction
  projectId: Id<'projects'>
  advisorReview?: AdvisorReviewRecord | null
}) => Promise<ApplyArtifactResult>

interface ArtifactControllerOptions {
  records: ArtifactControllerRecord[] | undefined
  projectId: Id<'projects'>
  applyArtifact: ApplyArtifactFn
  updateArtifactStatus: (args: {
    id: Id<'artifacts'>
    status: ArtifactControllerRecord['status']
  }) => Promise<unknown>
  advisorReview?: AdvisorReviewRecord | null
  advisorReviews?: AdvisorReviewRecord[]
  advisorPolicy?: AdvisorPolicy
}

export function createArtifactController({
  records,
  projectId,
  applyArtifact,
  updateArtifactStatus,
  advisorReview = null,
  advisorReviews,
  advisorPolicy,
}: ArtifactControllerOptions) {
  const allRecords = records ?? []
  const pendingRecords = allRecords.filter(
    (record) => record.status === 'pending' || record.status === 'in_progress'
  )

  return {
    records: allRecords,
    pendingRecords,
    async applyOne(artifactId: Id<'artifacts'> | string) {
      const record = pendingRecords.find((artifact) => artifact._id === artifactId)
      const action = record ? getPrimaryArtifactAction(record) : null
      if (!record || !action) return null

      const preflight = advisorPolicy
        ? buildAdvisorPreflight({
            policy: advisorPolicy,
            changedFiles: action.type === 'file_write' ? [action.payload.filePath] : [],
            commands: action.type === 'command_run' ? [action.payload.command] : [],
          })
        : null
      const matchedAdvisorReview =
        advisorReview ??
        selectAdvisorReviewForTarget(advisorReviews, {
          artifactId: String(record._id),
          gates: preflight?.gates,
        })

      return await applyArtifact({
        artifactId: record._id,
        action,
        projectId,
        advisorReview: matchedAdvisorReview,
      })
    },
    requestAdvisorReview(artifactId: Id<'artifacts'> | string) {
      const record = pendingRecords.find((artifact) => artifact._id === artifactId)
      const action = record ? getPrimaryArtifactAction(record) : null
      if (!record || !action || !advisorPolicy) return null
      return buildArtifactAdvisorReviewRequest({
        artifactId: String(record._id),
        action,
        policy: advisorPolicy,
      })
    },
    async rejectOne(artifactId: Id<'artifacts'> | string) {
      const record = pendingRecords.find((artifact) => artifact._id === artifactId)
      if (!record) return

      await updateArtifactStatus({ id: record._id, status: 'rejected' })
    },
    async applyAll() {
      const results: ApplyArtifactResult[] = []
      for (const record of pendingRecords) {
        const result = await this.applyOne(record._id)
        if (result) results.push(result)
      }
      return results
    },
    async rejectAll() {
      for (const record of pendingRecords) {
        await updateArtifactStatus({ id: record._id, status: 'rejected' })
      }
    },
  }
}
