"use client"

import React, { useMemo, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Package, Check, X, Trash2, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { ArtifactCard } from "./ArtifactCard"
import { useArtifactStore } from "@/stores/artifactStore"
import { cn } from "@/lib/utils"
import { useAction, useConvex, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { toast } from "sonner"

interface ArtifactPanelProps {
  projectId: Id<"projects">
  isOpen?: boolean
  onClose?: () => void
  position?: "right" | "floating"
}

// Memoized selectors to prevent infinite loop warnings
const selectArtifacts = (state: { artifacts: any[] }) => state.artifacts
const selectApplyArtifact = (state: { applyArtifact: any }) => state.applyArtifact
const selectRejectArtifact = (state: { rejectArtifact: any }) => state.rejectArtifact
const selectRejectAll = (state: { rejectAll: any }) => state.rejectAll
const selectClearQueue = (state: { clearQueue: any }) => state.clearQueue

export function ArtifactPanel({
  projectId,
  isOpen = true,
  onClose,
  position = "right",
}: ArtifactPanelProps) {
  const artifacts = useArtifactStore(selectArtifacts)
  const applyArtifact = useArtifactStore(selectApplyArtifact)
  const rejectArtifact = useArtifactStore(selectRejectArtifact)
  const rejectAll = useArtifactStore(selectRejectAll)
  const clearQueue = useArtifactStore(selectClearQueue)

  const convex = useConvex()
  const upsertFile = useMutation(api.files.upsert)
  const createAndExecuteJob = useMutation(api.jobs.createAndExecute)
  const executeJob = useAction(api.jobsExecution.execute)

  const [isApplying, setIsApplying] = useState(false)

  // Memoize filtered artifacts to prevent recalculation on every render
  const pendingArtifacts = useMemo(() =>
    artifacts.filter((a) => a.status === "pending"),
    [artifacts]
  )
  const appliedArtifacts = useMemo(() =>
    artifacts.filter((a) => a.status === "applied"),
    [artifacts]
  )
  const rejectedArtifacts = useMemo(() =>
    artifacts.filter((a) => a.status === "rejected"),
    [artifacts]
  )

  const pendingCount = pendingArtifacts.length
  const totalCount = artifacts.length

  const inferJobType = (command: string) => {
    const cmdLower = command.toLowerCase()
    if (cmdLower.includes("build") || cmdLower.includes("compile")) return "build" as const
    if (cmdLower.includes("test")) return "test" as const
    if (cmdLower.includes("deploy")) return "deploy" as const
    if (cmdLower.includes("lint")) return "lint" as const
    if (cmdLower.includes("format")) return "format" as const
    return "cli" as const
  }

  const applyOneArtifact = useCallback(
    async (artifact: any) => {
      if (artifact.type === "file_write") {
        const payload = artifact.payload as { filePath: string; content: string }
        const existing = await convex.query(api.files.getByPath, {
          projectId,
          path: payload.filePath,
        })

        await upsertFile({
          id: existing?._id,
          projectId,
          path: payload.filePath,
          content: payload.content,
          isBinary: false,
        })

        return { kind: "file" as const, description: payload.filePath }
      }

      if (artifact.type === "command_run") {
        const payload = artifact.payload as { command: string; workingDirectory?: string }
        const type = inferJobType(payload.command)
        const { jobId, command, workingDirectory } = await createAndExecuteJob({
          projectId,
          type,
          command: payload.command,
          workingDirectory: payload.workingDirectory,
        })

        // Mark job for external execution (adds logs / status updates).
        await executeJob({ jobId, command, workingDirectory })

        return { kind: "command" as const, description: payload.command }
      }

      throw new Error("Unknown artifact type")
    },
    [convex, createAndExecuteJob, executeJob, projectId, upsertFile]
  )

  const handleApply = useCallback(
    async (id: string) => {
      const artifact = artifacts.find((a) => a.id === id)
      if (!artifact) return

      setIsApplying(true)
      try {
        const result = await applyOneArtifact(artifact)
        applyArtifact(id)
        toast.success(
          result.kind === "file" ? "Applied file change" : "Queued command",
          { description: result.description }
        )
      } catch (error) {
        toast.error("Failed to apply artifact", {
          description: error instanceof Error ? error.message : String(error),
        })
      } finally {
        setIsApplying(false)
      }
    },
    [applyArtifact, applyOneArtifact, artifacts]
  )

  const handleReject = (id: string) => {
    rejectArtifact(id)
  }

  const handleApplyAll = useCallback(async () => {
    if (pendingArtifacts.length === 0) return
    setIsApplying(true)
    try {
      for (const artifact of pendingArtifacts) {
        // Apply sequentially to keep file writes and job creation ordered/predictable.
        try {
          await applyOneArtifact(artifact)
          applyArtifact(artifact.id)
        } catch (error) {
          toast.error("Failed to apply artifact", {
            description: error instanceof Error ? error.message : String(error),
          })
          break
        }
      }
    } finally {
      setIsApplying(false)
    }
  }, [applyArtifact, applyOneArtifact, pendingArtifacts])

  if (!isOpen) return null

  const panelContent = (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
      }}
      className={cn(
        "flex flex-col surface-1 border-l",
        position === "right" && "h-full w-96",
        position === "floating" && "fixed right-4 top-14 bottom-4 w-96 border z-50 max-h-[calc(100vh-4.5rem)]"
      )}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="panel-header border-b shrink-0"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted border rounded-none">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">
                Artifact Queue
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge
                  variant="outline"
                  className="text-xs font-medium"
                >
                  {pendingCount} pending
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {totalCount} total
                </span>
              </div>
            </div>
          </div>

          {onClose && (
            <Button
              variant="outline"
              size="icon"
              onClick={onClose}
              className="rounded-none border hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
              title="Close panel (Esc)"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </motion.div>

      {/* Batch Actions */}
      {pendingCount > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="px-4 py-3 border-b"
        >
          <div className="flex gap-2">
            <Button
              onClick={handleApplyAll}
              disabled={isApplying}
              className="flex-1 h-9 rounded-none text-xs"
              size="sm"
            >
              <Check className="h-3.5 w-3.5 mr-1.5" />
              Apply All ({pendingCount})
            </Button>
            <Button
              onClick={rejectAll}
              disabled={isApplying}
              variant="outline"
              className="flex-1 h-9 rounded-none text-xs"
              size="sm"
            >
              <X className="h-3.5 w-3.5 mr-1.5" />
              Reject All
            </Button>
          </div>
        </motion.div>
      )}

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          <AnimatePresence mode="popLayout">
            {artifacts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <motion.div
                  initial={{ y: 10 }}
                  animate={{ y: [0, -10, 0] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="p-4 bg-muted border mb-4"
                >
                  <Package className="h-8 w-8 text-slate-400" />
                </motion.div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-1">
                  No artifacts in queue
                </h3>
                <p className="text-xs text-muted-foreground/70 max-w-[200px]">
                  AI-generated changes will appear here for your review
                </p>
              </motion.div>
            ) : (
              <>
                {/* Pending Artifacts */}
                {pendingArtifacts.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-3"
                  >
                    <div className="flex items-center gap-2">
                      <Separator className="flex-1" />
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Pending ({pendingArtifacts.length})
                      </span>
                      <Separator className="flex-1" />
                    </div>
                    {pendingArtifacts.map((artifact, index) => (
                      <motion.div
                        key={artifact.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <ArtifactCard
                          artifact={artifact}
                          onApply={handleApply}
                          onReject={handleReject}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                )}

                {/* Applied Artifacts */}
                {appliedArtifacts.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-3"
                  >
                    <div className="flex items-center gap-2">
                      <Separator className="flex-1" />
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Applied ({appliedArtifacts.length})
                      </span>
                      <Separator className="flex-1" />
                    </div>
                    {appliedArtifacts.map((artifact, index) => (
                      <motion.div
                        key={artifact.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <ArtifactCard
                          artifact={artifact}
                          onApply={handleApply}
                          onReject={handleReject}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                )}

                {/* Rejected Artifacts */}
                {rejectedArtifacts.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-3"
                  >
                    <div className="flex items-center gap-2">
                      <Separator className="flex-1" />
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Rejected ({rejectedArtifacts.length})
                      </span>
                      <Separator className="flex-1" />
                    </div>
                    {rejectedArtifacts.map((artifact, index) => (
                      <motion.div
                        key={artifact.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <ArtifactCard
                          artifact={artifact}
                          onApply={handleApply}
                          onReject={handleReject}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </>
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* Footer */}
      {totalCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 border-t"
        >
          <Button
            onClick={clearQueue}
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All Artifacts
          </Button>
        </motion.div>
      )}
    </motion.div>
  )

  if (position === "right") {
    return panelContent
  }

  return (
    <AnimatePresence>
      {isOpen && panelContent}
    </AnimatePresence>
  )
}
