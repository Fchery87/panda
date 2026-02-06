'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useConvex, useMutation, useQuery } from 'convex/react'
import { toast } from 'sonner'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { shouldAutoApplyArtifact, type AgentPolicy } from '@/lib/agent/automationPolicy'

type ArtifactAction = {
  type: 'file_write' | 'command_run'
  payload: Record<string, unknown>
}

type ArtifactRecord = {
  _id: Id<'artifacts'>
  actions: Array<Record<string, unknown>>
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rejected'
}

function inferJobType(command: string) {
  const cmdLower = command.toLowerCase()
  if (cmdLower.includes('build') || cmdLower.includes('compile')) return 'build' as const
  if (cmdLower.includes('test')) return 'test' as const
  if (cmdLower.includes('deploy')) return 'deploy' as const
  if (cmdLower.includes('lint')) return 'lint' as const
  if (cmdLower.includes('format')) return 'format' as const
  return 'cli' as const
}

function getPrimaryAction(record: ArtifactRecord): ArtifactAction | null {
  const action = record.actions?.[0] as ArtifactAction | undefined
  if (!action || (action.type !== 'file_write' && action.type !== 'command_run')) return null
  return action
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
        const action = getPrimaryAction(record)
        if (!action) return null
        return {
          id: record._id,
          type: action.type,
          payload: action.payload,
        }
      })
      .filter(Boolean) as Array<{
      id: Id<'artifacts'>
      type: 'file_write' | 'command_run'
      payload: any
    }>
  }, [artifactRecords])

  const convex = useConvex()
  const upsertFile = useMutation(api.files.upsert)
  const createAndExecuteJob = useMutation(api.jobs.createAndExecute)
  const updateJobStatus = useMutation(api.jobs.updateStatus)
  const updateArtifactStatus = useMutation(api.artifacts.updateStatus)

  const isApplyingRef = useRef(false)

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
    if (isApplyingRef.current) return

    const next = pendingArtifacts[0]!
    const shouldApply = shouldAutoApplyArtifact(policy, {
      type: next.type,
      payload: next.payload,
    })
    if (!shouldApply) return

    isApplyingRef.current = true

    void (async () => {
      try {
        await updateArtifactStatus({ id: next.id, status: 'in_progress' })

        if (next.type === 'file_write') {
          const payload = next.payload as { filePath: string; content: string }
          const existing = await convex.query(api.files.getByPath, {
            projectId: args.projectId,
            path: payload.filePath,
          })

          await upsertFile({
            id: existing?._id,
            projectId: args.projectId,
            path: payload.filePath,
            content: payload.content,
            isBinary: false,
          })

          await updateArtifactStatus({ id: next.id, status: 'completed' })
          return
        }

        if (next.type === 'command_run') {
          const payload = next.payload as { command: string; workingDirectory?: string }
          const type = inferJobType(payload.command)
          const { jobId } = await createAndExecuteJob({
            projectId: args.projectId,
            type,
            command: payload.command,
            workingDirectory: payload.workingDirectory,
          })

          const startedAt = Date.now()
          await updateJobStatus({
            id: jobId,
            status: 'running',
            startedAt,
            logs: [`[${new Date(startedAt).toISOString()}] Running: ${payload.command}`],
          })

          const executeResponse = await fetch('/api/jobs/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              command: payload.command,
              workingDirectory: payload.workingDirectory,
            }),
          })

          if (!executeResponse.ok) {
            const errorText = await executeResponse.text()
            await updateJobStatus({
              id: jobId,
              status: 'failed',
              completedAt: Date.now(),
              error: errorText,
            })
            throw new Error(errorText)
          }

          const result = (await executeResponse.json()) as {
            stdout: string
            stderr: string
            exitCode: number
          }
          await updateJobStatus({
            id: jobId,
            status: result.exitCode === 0 ? 'completed' : 'failed',
            completedAt: Date.now(),
            output: result.stdout || undefined,
            error: result.stderr || undefined,
            logs: [
              `[${new Date(startedAt).toISOString()}] Running: ${payload.command}`,
              `[${new Date().toISOString()}] Exit code: ${result.exitCode}`,
            ],
          })

          await updateArtifactStatus({ id: next.id, status: 'completed' })
          return
        }

        await updateArtifactStatus({ id: next.id, status: 'failed' })
      } catch (error) {
        await updateArtifactStatus({ id: next.id, status: 'failed' })
        toast.error('Auto-apply failed', {
          description: error instanceof Error ? error.message : String(error),
        })
      } finally {
        isApplyingRef.current = false
      }
    })()
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
