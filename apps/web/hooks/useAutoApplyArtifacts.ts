"use client"

import { useEffect, useMemo, useRef } from "react"
import { useAction, useConvex, useMutation } from "convex/react"
import { toast } from "sonner"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { useArtifactStore } from "@/stores/artifactStore"
import { shouldAutoApplyArtifact, type AgentPolicy } from "@/lib/agent/automationPolicy"

function inferJobType(command: string) {
  const cmdLower = command.toLowerCase()
  if (cmdLower.includes("build") || cmdLower.includes("compile")) return "build" as const
  if (cmdLower.includes("test")) return "test" as const
  if (cmdLower.includes("deploy")) return "deploy" as const
  if (cmdLower.includes("lint")) return "lint" as const
  if (cmdLower.includes("format")) return "format" as const
  return "cli" as const
}

const selectApplyArtifact = (state: { applyArtifact: any }) => state.applyArtifact
const selectArtifacts = (state: { artifacts: any[] }) => state.artifacts

export function useAutoApplyArtifacts(args: {
  projectId: Id<"projects">
  policy: AgentPolicy | null
}) {
  const artifacts = useArtifactStore(selectArtifacts)
  const pendingArtifacts = useMemo(() => artifacts.filter((a) => a.status === "pending"), [artifacts])
  const applyArtifact = useArtifactStore(selectApplyArtifact)

  const convex = useConvex()
  const upsertFile = useMutation(api.files.upsert)
  const createAndExecuteJob = useMutation(api.jobs.createAndExecute)
  const executeJob = useAction(api.jobsExecution.execute)

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
    console.log('[useAutoApplyArtifacts] Effect triggered:', {
      pendingCount: pendingArtifacts.length,
      policy: policy,
      isApplying: isApplyingRef.current,
    })
    
    if (pendingArtifacts.length === 0) {
      console.log('[useAutoApplyArtifacts] No pending artifacts, skipping')
      return
    }
    if (isApplyingRef.current) {
      console.log('[useAutoApplyArtifacts] Already applying, skipping')
      return
    }

    const next = pendingArtifacts[0]!
    console.log('[useAutoApplyArtifacts] Next artifact:', {
      id: next.id,
      type: next.type,
      status: next.status,
    })
    
    const shouldApply = shouldAutoApplyArtifact(policy, next as any)
    console.log('[useAutoApplyArtifacts] Should auto-apply?', shouldApply, 'Policy:', policy)
    
    if (!shouldApply) {
      console.log('[useAutoApplyArtifacts] Auto-apply disabled for this artifact type')
      return
    }

    isApplyingRef.current = true
    console.log('[useAutoApplyArtifacts] Starting auto-apply for:', next.id)

    void (async () => {
      try {
        if (next.type === "file_write") {
          const payload = next.payload as { filePath: string; content: string }
          console.log('[useAutoApplyArtifacts] Auto-applying file write:', payload.filePath)
          
          const existing = await convex.query(api.files.getByPath, {
            projectId: args.projectId,
            path: payload.filePath,
          })
          console.log('[useAutoApplyArtifacts] Existing file:', existing ? 'yes' : 'no')
          
          await upsertFile({
            id: existing?._id,
            projectId: args.projectId,
            path: payload.filePath,
            content: payload.content,
            isBinary: false,
          })
          console.log('[useAutoApplyArtifacts] File upserted successfully')
          
          applyArtifact(next.id)
          console.log('[useAutoApplyArtifacts] Artifact marked as applied')
          return
        }

        if (next.type === "command_run") {
          const payload = next.payload as { command: string; workingDirectory?: string }
          const type = inferJobType(payload.command)
          const { jobId, command, workingDirectory } = await createAndExecuteJob({
            projectId: args.projectId,
            type,
            command: payload.command,
            workingDirectory: payload.workingDirectory,
          })
          await executeJob({ jobId, command, workingDirectory })
          applyArtifact(next.id)
          return
        }
      } catch (error) {
        console.error('[useAutoApplyArtifacts] Auto-apply failed:', error)
        toast.error("Auto-apply failed", {
          description: error instanceof Error ? error.message : String(error),
        })
      } finally {
        isApplyingRef.current = false
        console.log('[useAutoApplyArtifacts] Apply process completed')
      }
    })()
  }, [
    pendingArtifacts,
    policy,
    args.projectId,
    convex,
    upsertFile,
    createAndExecuteJob,
    executeJob,
    applyArtifact,
  ])
}
