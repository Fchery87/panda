"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Package, Check, X, Trash2, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { ArtifactCard } from "./ArtifactCard"
import { useArtifactStore } from "@/stores/artifactStore"
import { cn } from "@/lib/utils"

interface ArtifactPanelProps {
  isOpen?: boolean
  onClose?: () => void
  position?: "right" | "floating"
}

export function ArtifactPanel({
  isOpen = true,
  onClose,
  position = "right",
}: ArtifactPanelProps) {
  const artifacts = useArtifactStore((state) => state.artifacts)
  const pendingArtifacts = useArtifactStore((state) =>
    state.artifacts.filter((a) => a.status === "pending")
  )
  const appliedArtifacts = useArtifactStore((state) =>
    state.artifacts.filter((a) => a.status === "applied")
  )
  const rejectedArtifacts = useArtifactStore((state) =>
    state.artifacts.filter((a) => a.status === "rejected")
  )

  const applyArtifact = useArtifactStore((state) => state.applyArtifact)
  const rejectArtifact = useArtifactStore((state) => state.rejectArtifact)
  const applyAll = useArtifactStore((state) => state.applyAll)
  const rejectAll = useArtifactStore((state) => state.rejectAll)
  const clearQueue = useArtifactStore((state) => state.clearQueue)

  const pendingCount = pendingArtifacts.length
  const totalCount = artifacts.length

  const handleApply = (id: string) => {
    applyArtifact(id)
  }

  const handleReject = (id: string) => {
    rejectArtifact(id)
  }

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
        "flex flex-col bg-background/95 backdrop-blur-xl border-l shadow-2xl shadow-black/10",
        position === "right" && "h-full w-96",
        position === "floating" && "fixed right-4 top-4 bottom-4 w-96 rounded-2xl border shadow-2xl z-50"
      )}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-5 border-b bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                delay: 0.2,
                type: "spring",
                stiffness: 200,
              }}
              className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-lg shadow-amber-500/30"
            >
              <Layers className="h-5 w-5 text-white" />
            </motion.div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">
                Artifact Queue
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge
                  variant="outline"
                  className="text-xs font-medium border-amber-500/50 text-amber-700 dark:text-amber-400"
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
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full hover:bg-accent"
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
          className="px-4 py-3 border-b bg-muted/30"
        >
          <div className="flex gap-2">
            <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={applyAll}
                className="w-full h-9 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-500/20 text-xs"
                size="sm"
              >
                <Check className="h-3.5 w-3.5 mr-1.5" />
                Apply All ({pendingCount})
              </Button>
            </motion.div>
            <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={rejectAll}
                variant="outline"
                className="w-full h-9 border-rose-500/30 text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:hover:bg-rose-950/30 text-xs"
                size="sm"
              >
                <X className="h-3.5 w-3.5 mr-1.5" />
                Reject All
              </Button>
            </motion.div>
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
                  className="p-4 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-2xl mb-4"
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
                      <span className="text-xs font-medium uppercase tracking-wider text-emerald-600/70">
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
                      <span className="text-xs font-medium uppercase tracking-wider text-rose-600/70">
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
          className="p-4 border-t bg-muted/30"
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
