'use client'

import React, { useMemo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Package, Check, X, Trash2, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { ArtifactCard } from './ArtifactCard'
import { cn } from '@/lib/utils'
import { useConvex, useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { toast } from 'sonner'
import { applyArtifact, getPrimaryArtifactAction } from '@/lib/artifacts/executeArtifact'

type ArtifactRecord = {
  _id: Id<'artifacts'>
  actions: Array<Record<string, unknown>>
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rejected'
  createdAt: number
}

interface ArtifactPanelProps {
  projectId: Id<'projects'>
  chatId: Id<'chats'> | null | undefined
  isOpen?: boolean
  onClose?: () => void
  position?: 'right' | 'floating'
}

type ArtifactCardData = React.ComponentProps<typeof ArtifactCard>['artifact']
type MappedArtifact = ArtifactCardData & { rawStatus: ArtifactRecord['status'] }

function asArtifactId(id: string): Id<'artifacts'> {
  return id as Id<'artifacts'>
}

function mapStatusToCardStatus(
  status: ArtifactRecord['status']
): 'pending' | 'applied' | 'rejected' {
  if (status === 'completed') return 'applied'
  if (status === 'failed' || status === 'rejected') return 'rejected'
  return 'pending'
}

export function ArtifactPanel({
  projectId,
  chatId,
  isOpen = true,
  onClose,
  position = 'right',
}: ArtifactPanelProps) {
  const records = useQuery(api.artifacts.list, chatId ? { chatId } : 'skip') as
    | ArtifactRecord[]
    | undefined

  const convex = useConvex()
  const upsertFile = useMutation(api.files.upsert)
  const createAndExecuteJob = useMutation(api.jobs.createAndExecute)
  const updateJobStatus = useMutation(api.jobs.updateStatus)
  const updateArtifactStatus = useMutation(api.artifacts.updateStatus)

  const [isApplying, setIsApplying] = useState(false)

  const mappedArtifacts = useMemo(() => {
    return (records || [])
      .map((record) => {
        const action = getPrimaryArtifactAction(record)
        if (!action) return null

        return {
          id: record._id,
          type: action.type,
          payload: action.payload as unknown,
          createdAt: record.createdAt,
          description: action.type === 'file_write' ? 'File change queued' : 'Command queued',
          status: mapStatusToCardStatus(record.status),
          rawStatus: record.status,
        }
      })
      .filter(Boolean) as MappedArtifact[]
  }, [records])

  const pendingArtifacts = useMemo(
    () => mappedArtifacts.filter((a) => a.rawStatus === 'pending' || a.rawStatus === 'in_progress'),
    [mappedArtifacts]
  )
  const appliedArtifacts = useMemo(
    () => mappedArtifacts.filter((a) => a.rawStatus === 'completed'),
    [mappedArtifacts]
  )
  const rejectedArtifacts = useMemo(
    () => mappedArtifacts.filter((a) => a.rawStatus === 'failed' || a.rawStatus === 'rejected'),
    [mappedArtifacts]
  )

  const pendingCount = pendingArtifacts.length
  const totalCount = mappedArtifacts.length

  const handleApply = useCallback(
    async (id: string) => {
      const artifact = pendingArtifacts.find((a) => a.id === id)
      if (!artifact) return

      setIsApplying(true)
      try {
        const result = await applyArtifact({
          artifactId: asArtifactId(artifact.id),
          action: {
            type: artifact.type,
            payload: artifact.payload as unknown as Record<string, unknown>,
          },
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
        })
        toast.success(result.kind === 'file' ? 'Applied file change' : 'Executed command', {
          description: result.description,
        })
      } catch (error) {
        toast.error('Failed to apply artifact', {
          description: error instanceof Error ? error.message : String(error),
        })
      } finally {
        setIsApplying(false)
      }
    },
    [
      pendingArtifacts,
      projectId,
      convex,
      upsertFile,
      createAndExecuteJob,
      updateJobStatus,
      updateArtifactStatus,
    ]
  )

  const handleReject = useCallback(
    async (id: string) => {
      const artifact = pendingArtifacts.find((a) => a.id === id)
      if (!artifact) return
      await updateArtifactStatus({ id: asArtifactId(artifact.id), status: 'rejected' })
    },
    [pendingArtifacts, updateArtifactStatus]
  )

  const handleApplyAll = useCallback(async () => {
    if (pendingArtifacts.length === 0) return
    setIsApplying(true)
    try {
      for (const artifact of pendingArtifacts) {
        try {
          await applyArtifact({
            artifactId: asArtifactId(artifact.id),
            action: {
              type: artifact.type,
              payload: artifact.payload as unknown as Record<string, unknown>,
            },
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
          })
        } catch (error) {
          toast.error('Failed to apply artifact', {
            description: error instanceof Error ? error.message : String(error),
          })
          break
        }
      }
    } finally {
      setIsApplying(false)
    }
  }, [
    pendingArtifacts,
    projectId,
    convex,
    upsertFile,
    createAndExecuteJob,
    updateJobStatus,
    updateArtifactStatus,
  ])

  const handleRejectAll = useCallback(async () => {
    for (const artifact of pendingArtifacts) {
      await updateArtifactStatus({ id: asArtifactId(artifact.id), status: 'rejected' })
    }
  }, [pendingArtifacts, updateArtifactStatus])

  const handleClearAll = useCallback(async () => {
    for (const artifact of pendingArtifacts) {
      await updateArtifactStatus({ id: asArtifactId(artifact.id), status: 'rejected' })
    }
  }, [pendingArtifacts, updateArtifactStatus])

  if (!isOpen) return null

  const panelContent = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'surface-1 flex h-full flex-col border-l',
        position === 'right' && 'h-full w-full',
        position === 'floating' &&
          'fixed bottom-4 right-4 top-14 z-50 max-h-[calc(100vh-4.5rem)] w-96 border'
      )}
    >
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="panel-header shrink-0 border-b"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <span className="font-mono text-xs font-medium uppercase tracking-wide">Artifacts</span>
            {pendingCount > 0 && (
              <Badge
                variant="outline"
                className="rounded-none border-primary px-1.5 text-[10px] text-primary"
              >
                {pendingCount}
              </Badge>
            )}
          </div>

          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-7 w-7 rounded-none"
              aria-label="Close panel"
              title="Close panel (Esc)"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </motion.div>

      {pendingCount > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="border-b px-4 py-3"
        >
          <div className="flex gap-2">
            <Button
              onClick={handleApplyAll}
              disabled={isApplying}
              className="h-9 flex-1 rounded-none text-xs"
              size="sm"
            >
              <Check className="mr-1.5 h-3.5 w-3.5" />
              Apply All ({pendingCount})
            </Button>
            <Button
              onClick={handleRejectAll}
              disabled={isApplying}
              variant="outline"
              className="h-9 flex-1 rounded-none text-xs"
              size="sm"
            >
              <X className="mr-1.5 h-3.5 w-3.5" />
              Reject All
            </Button>
          </div>
        </motion.div>
      )}

      <ScrollArea className="flex-1">
        <div className="space-y-3 p-4">
          <AnimatePresence mode="popLayout">
            {mappedArtifacts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <motion.div
                  initial={{ y: 10 }}
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="mb-4 border bg-muted p-4"
                >
                  <Package className="h-8 w-8 text-slate-400" />
                </motion.div>
                <h3 className="mb-1 text-sm font-semibold text-muted-foreground">
                  No artifacts in queue
                </h3>
                <p className="max-w-[200px] text-xs text-muted-foreground/70">
                  AI-generated changes will appear here for your review
                </p>
              </motion.div>
            ) : (
              <>
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

      {totalCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-t p-4"
        >
          <Button
            onClick={handleClearAll}
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Pending Artifacts
          </Button>
        </motion.div>
      )}
    </motion.div>
  )

  if (position === 'right') return panelContent
  return <AnimatePresence>{isOpen && panelContent}</AnimatePresence>
}
