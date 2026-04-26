'use client'

import type { Id } from '@convex/_generated/dataModel'
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
}) => Promise<ApplyArtifactResult>

interface ArtifactControllerOptions {
  records: ArtifactControllerRecord[] | undefined
  projectId: Id<'projects'>
  applyArtifact: ApplyArtifactFn
  updateArtifactStatus: (args: {
    id: Id<'artifacts'>
    status: ArtifactControllerRecord['status']
  }) => Promise<unknown>
}

export function createArtifactController({
  records,
  projectId,
  applyArtifact,
  updateArtifactStatus,
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

      return await applyArtifact({
        artifactId: record._id,
        action,
        projectId,
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
