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

interface UseArtifactControllerArgs {
  projectId: Id<'projects'>
  chatId: Id<'chats'> | null | undefined
  writeFileToRuntime?: (path: string, content: string) => Promise<unknown>
}

export function useArtifactController({
  projectId,
  chatId,
  writeFileToRuntime,
}: UseArtifactControllerArgs) {
  const convex = useConvex()
  const records = useQuery(api.artifacts.list, chatId ? { chatId } : 'skip') as
    | ArtifactControllerRecord[]
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
        applyArtifact: ({ artifactId, action }) =>
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
          }),
        updateArtifactStatus,
      }),
    [
      convex,
      createAndExecuteJob,
      projectId,
      records,
      updateArtifactStatus,
      updateJobStatus,
      upsertFile,
      writeFileToRuntime,
    ]
  )
}
