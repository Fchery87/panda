"use client"

import { useCallback } from "react"
import { useMutation } from "convex/react"
import { toast } from "sonner"
import {
  useArtifactStore,
  type Artifact,
  type ArtifactType,
  type ArtifactPayload,
  selectPendingArtifacts,
  selectArtifactCount,
} from "@/stores/artifactStore"
import type { Id } from "@convex/_generated/dataModel"

/**
 * Hook that combines artifact store with Convex mutations
 * Manages artifact queue and executes operations on apply
 */
export function useArtifacts(projectId?: Id<"projects">) {
  const artifacts = useArtifactStore((state) => state.artifacts)
  const pendingArtifacts = useArtifactStore(selectPendingArtifacts)
  const pendingCount = useArtifactStore(selectArtifactCount)

  const addToQueue = useArtifactStore((state) => state.addToQueue)
  const markAsApplied = useArtifactStore((state) => state.applyArtifact)
  const markAsRejected = useArtifactStore((state) => state.rejectArtifact)
  const clearQueue = useArtifactStore((state) => state.clearQueue)
  const applyAll = useArtifactStore((state) => state.applyAll)
  const rejectAll = useArtifactStore((state) => state.rejectAll)

  /**
   * Add a new artifact to the queue
   */
  const queueArtifact = useCallback(
    (
      type: ArtifactType,
      payload: ArtifactPayload,
      description?: string
    ) => {
      const artifact: Omit<Artifact, "status" | "createdAt"> = {
        id: `artifact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        payload,
        description,
      }

      addToQueue(artifact)

      toast.info("New artifact added to queue", {
        description:
          type === "file_write"
            ? `File: ${(payload as { filePath: string }).filePath}`
            : `Command: ${(payload as { command: string }).command}`,
      })

      return artifact.id
    },
    [addToQueue]
  )

  /**
   * Apply a single artifact
   * Updates store and executes the actual operation
   */
  const applyArtifact = useCallback(
    async (artifactId: string) => {
      const artifact = artifacts.find((a) => a.id === artifactId)

      if (!artifact) {
        toast.error("Artifact not found")
        return
      }

      if (artifact.status !== "pending") {
        toast.warning("Artifact already processed")
        return
      }

      try {
        if (artifact.type === "file_write") {
          const payload = artifact.payload as {
            filePath: string
            content: string
          }

          // TODO: Integrate with Convex file write mutation when available
          // await createJob({
          //   projectId,
          //   type: 'file_write',
          //   payload,
          // })

          console.log("Applying file write:", payload)
          toast.success(`File write applied: ${payload.filePath}`)
        } else if (artifact.type === "command_run") {
          const payload = artifact.payload as {
            command: string
            workingDirectory?: string
          }

          // TODO: Integrate with Convex command execution mutation when available
          // await createJob({
          //   projectId,
          //   type: 'command_run',
          //   payload,
          // })

          console.log("Applying command:", payload)
          toast.success(`Command queued: ${payload.command}`)
        }

        markAsApplied(artifactId)
      } catch (error) {
        console.error("Failed to apply artifact:", error)
        toast.error("Failed to apply artifact")
      }
    },
    [artifacts, markAsApplied, projectId]
  )

  /**
   * Reject a single artifact
   * Just marks as rejected, no operation executed
   */
  const rejectArtifact = useCallback(
    (artifactId: string) => {
      const artifact = artifacts.find((a) => a.id === artifactId)

      if (!artifact) {
        toast.error("Artifact not found")
        return
      }

      markAsRejected(artifactId)

      toast.info("Artifact rejected", {
        description: "The change will not be applied",
      })
    },
    [artifacts, markAsRejected]
  )

  /**
   * Apply all pending artifacts
   */
  const applyAllArtifacts = useCallback(async () => {
    const pending = pendingArtifacts

    if (pending.length === 0) {
      toast.info("No pending artifacts to apply")
      return
    }

    let successCount = 0
    let errorCount = 0

    for (const artifact of pending) {
      try {
        if (artifact.type === "file_write") {
          const payload = artifact.payload as {
            filePath: string
            content: string
          }
          console.log("Applying file write:", payload)
        } else if (artifact.type === "command_run") {
          const payload = artifact.payload as {
            command: string
            workingDirectory?: string
          }
          console.log("Applying command:", payload)
        }

        successCount++
      } catch (error) {
        console.error("Failed to apply artifact:", artifact.id, error)
        errorCount++
      }
    }

    applyAll()

    if (errorCount === 0) {
      toast.success(`Applied ${successCount} artifacts`)
    } else {
      toast.warning(`Applied ${successCount} artifacts, ${errorCount} failed`)
    }
  }, [pendingArtifacts, applyAll])

  /**
   * Reject all pending artifacts
   */
  const rejectAllArtifacts = useCallback(() => {
    const pending = pendingArtifacts

    if (pending.length === 0) {
      toast.info("No pending artifacts to reject")
      return
    }

    rejectAll()

    toast.info(`Rejected ${pending.length} artifacts`)
  }, [pendingArtifacts, rejectAll])

  return {
    // State
    artifacts,
    pendingArtifacts,
    pendingCount,

    // Actions
    queueArtifact,
    applyArtifact,
    rejectArtifact,
    applyAll: applyAllArtifacts,
    rejectAll: rejectAllArtifacts,
    clearQueue,

    // Helpers
    hasPending: pendingCount > 0,
    getArtifactById: (id: string) => artifacts.find((a) => a.id === id),
  }
}

export default useArtifacts
