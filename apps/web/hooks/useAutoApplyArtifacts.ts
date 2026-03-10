'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useConvex, useMutation, useQuery } from 'convex/react'
import { toast } from 'sonner'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { shouldAutoApplyArtifact, type AgentPolicy } from '@/lib/agent/automationPolicy'
import { applyArtifact, getPrimaryArtifactAction } from '@/lib/artifacts/executeArtifact'

type ArtifactRecord = {
  _id: Id<'artifacts'>
  actions: Array<Record<string, unknown>>
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rejected'
}

type PendingArtifact = {
  id: Id<'artifacts'>
  type: 'file_write' | 'command_run'
  payload: Record<string, unknown>
}

export function useAutoApplyArtifacts(args: {
  projectId: Id<'projects'>
  chatId: Id<'chats'> | null | undefined
  policy: AgentPolicy | null
}) {
  const artifactRecords = useQuery(
    api.artifacts.list,
    args.chatId ? { chatId: args.chatId } : 'skip'
  ) as ArtifactRecord[] | undefined

  const pendingArtifacts = useMemo(() => {
    return (artifactRecords || [])
      .filter((a) => a.status === 'pending')
      .map((record) => {
        const action = getPrimaryArtifactAction(record)
        if (!action) return null
        return {
          id: record._id,
          type: action.type,
          payload: action.payload,
        }
      })
      .filter(Boolean) as PendingArtifact[]
  }, [artifactRecords])

  const convex = useConvex()
  const upsertFile = useMutation(api.files.upsert)
  const createAndExecuteJob = useMutation(api.jobs.createAndExecute)
  const updateJobStatus = useMutation(api.jobs.updateStatus)
  const updateArtifactStatus = useMutation(api.artifacts.updateStatus)

  const processingRef = useRef<Set<string>>(new Set())

  const policy = useMemo<AgentPolicy>(() => {
    return (
      args.policy ?? {
        autoApplyFiles: false,
        autoRunCommands: false,
        allowedCommandPrefixes: [],
      }
    )
  }, [args.policy])

  useEffect(() => {
    if (pendingArtifacts.length === 0) return

    for (const artifact of pendingArtifacts) {
      if (processingRef.current.has(artifact.id)) continue

      const shouldApply = shouldAutoApplyArtifact(policy, {
        type: artifact.type,
        payload: artifact.payload,
      })
      if (!shouldApply) continue

      processingRef.current.add(artifact.id)

      void (async () => {
        try {
          const result = await applyArtifact({
            artifactId: artifact.id,
            action: { type: artifact.type, payload: artifact.payload },
            projectId: args.projectId,
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
          })

          if (result.kind === 'file') {
            toast.success('File applied', {
              description: result.description,
            })
          }
        } catch (error) {
          toast.error('Auto-apply failed', {
            description: error instanceof Error ? error.message : String(error),
          })
        } finally {
          processingRef.current.delete(artifact.id)
        }
      })()
    }
  }, [
    pendingArtifacts,
    policy,
    args.projectId,
    convex,
    upsertFile,
    createAndExecuteJob,
    updateJobStatus,
    updateArtifactStatus,
  ])
}
