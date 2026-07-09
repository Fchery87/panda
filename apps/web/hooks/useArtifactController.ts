'use client'

import { useMemo } from 'react'
import { useConvex, useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import {
  createArtifactController,
  type ArtifactControllerRecord,
} from '@/lib/artifacts/artifactController'
import { applyArtifact } from '@/lib/artifacts/executeArtifact'
import type { AdvisorPolicy, AdvisorReviewRecord } from '@/lib/agent/workflow'

interface UseArtifactControllerArgs {
  projectId: Id<'projects'>
  chatId: Id<'chats'> | null | undefined
  writeFileToRuntime?: (path: string, content: string) => Promise<unknown>
  advisorPolicy?: AdvisorPolicy
}

export function useArtifactController({
  projectId,
  chatId,
  writeFileToRuntime,
  advisorPolicy,
}: UseArtifactControllerArgs) {
  const convex = useConvex()
  const records = useQuery(api.artifacts.list, chatId ? { chatId } : 'skip') as
    | ArtifactControllerRecord[]
    | undefined
  const advisorReviews = useQuery(api.advisorReviews.listByChat, chatId ? { chatId } : 'skip') as
    | Array<AdvisorReviewRecord>
    | undefined
  const upsertFile = useMutation(api.files.upsert)
  const createAndExecuteJob = useMutation(api.jobs.createAndExecute)
  const updateJobStatus = useMutation(api.jobs.updateStatus)
  const updateArtifactStatus = useMutation(api.artifacts.updateStatus)

  return useMemo(
    () =>
      createArtifactController({
        records,
        projectId,
        applyArtifact: ({ artifactId, action, advisorPolicy, advisorReview }) =>
          applyArtifact({
            artifactId,
            action,
            projectId,
            convex,
            upsertFile,
            createAndExecuteJob,
            updateJobStatus: (jobId, status, updates) =>
              updateJobStatus({
                id: jobId,
                status,
                ...updates,
              }),
            updateArtifactStatus,
            writeFileToRuntime,
            advisorPolicy,
            advisorReview,
          }),
        updateArtifactStatus,
        advisorReviews,
        advisorPolicy,
      }),
    [
      convex,
      createAndExecuteJob,
      advisorPolicy,
      advisorReviews,
      projectId,
      records,
      updateArtifactStatus,
      updateJobStatus,
      upsertFile,
      writeFileToRuntime,
    ]
  )
}
