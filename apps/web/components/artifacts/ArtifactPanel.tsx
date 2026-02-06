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

type ArtifactAction = {
  type: 'file_write' | 'command_run'
  payload: Record<string, unknown>
}

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
        const action = getPrimaryAction(record)
        if (!action) return null

        return {
          id: record._id,
          type: action.type,
          payload: action.payload as any,
          createdAt: record.createdAt,
          description: action.type === 'file_write' ? 'File change queued' : 'Command queued',
          status: mapStatusToCardStatus(record.status),
          rawStatus: record.status,
        }
      })
      .filter(Boolean) as Array<{
      id: Id<'artifacts'>
      type: 'file_write' | 'command_run'
      payload: any
      createdAt: number
      description: string
      status: 'pending' | 'applied' | 'rejected'
      rawStatus: ArtifactRecord['status']
    }>
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

  const applyOneArtifact = useCallback(
    async (artifact: (typeof pendingArtifacts)[number]) => {
      if (artifact.type === 'file_write') {
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

        return { kind: 'file' as const, description: payload.filePath }
      }

      const payload = artifact.payload as { command: string; workingDirectory?: string }
      const type = inferJobType(payload.command)
      const { jobId } = await createAndExecuteJob({
        projectId,
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

      return { kind: 'command' as const, description: payload.command }
    },
    [convex, createAndExecuteJob, projectId, updateJobStatus, upsertFile]
  )

  const handleApply = useCallback(
    async (id: string) => {
      const artifact = pendingArtifacts.find((a) => a.id === id)
      if (!artifact) return

      setIsApplying(true)
      try {
        await updateArtifactStatus({ id: artifact.id, status: 'in_progress' })
        const result = await applyOneArtifact(artifact)
        await updateArtifactStatus({ id: artifact.id, status: 'completed' })
        toast.success(result.kind === 'file' ? 'Applied file change' : 'Executed command', {
          description: result.description,
        })
      } catch (error) {
        await updateArtifactStatus({ id: artifact.id, status: 'failed' })
        toast.error('Failed to apply artifact', {
          description: error instanceof Error ? error.message : String(error),
        })
      } finally {
        setIsApplying(false)
      }
    },
    [applyOneArtifact, pendingArtifacts, updateArtifactStatus]
  )

  const handleReject = useCallback(
    async (id: string) => {
      const artifact = pendingArtifacts.find((a) => a.id === id)
      if (!artifact) return
      await updateArtifactStatus({ id: artifact.id, status: 'rejected' })
    },
    [pendingArtifacts, updateArtifactStatus]
  )

  const handleApplyAll = useCallback(async () => {
    if (pendingArtifacts.length === 0) return
    setIsApplying(true)
    try {
      for (const artifact of pendingArtifacts) {
        try {
          await updateArtifactStatus({ id: artifact.id, status: 'in_progress' })
          await applyOneArtifact(artifact)
          await updateArtifactStatus({ id: artifact.id, status: 'completed' })
        } catch (error) {
          await updateArtifactStatus({ id: artifact.id, status: 'failed' })
          toast.error('Failed to apply artifact', {
            description: error instanceof Error ? error.message : String(error),
          })
          break
        }
      }
    } finally {
      setIsApplying(false)
    }
  }, [applyOneArtifact, pendingArtifacts, updateArtifactStatus])

  const handleRejectAll = useCallback(async () => {
    for (const artifact of pendingArtifacts) {
      await updateArtifactStatus({ id: artifact.id, status: 'rejected' })
    }
  }, [pendingArtifacts, updateArtifactStatus])

  const handleClearAll = useCallback(async () => {
    for (const artifact of pendingArtifacts) {
      await updateArtifactStatus({ id: artifact.id, status: 'rejected' })
    }
  }, [pendingArtifacts, updateArtifactStatus])

  if (!isOpen) return null

  const panelContent = (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={cn(
        'surface-1 flex flex-col border-l',
        position === 'right' && 'h-full w-96',
        position === 'floating' &&
          'fixed bottom-4 right-4 top-14 z-50 max-h-[calc(100vh-4.5rem)] w-96 border'
      )}
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="panel-header shrink-0 border-b"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-none border bg-muted p-2">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Artifact Queue</h2>
              <div className="mt-0.5 flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-medium">
                  {pendingCount} pending
                </Badge>
                <span className="text-xs text-muted-foreground">{totalCount} total</span>
              </div>
            </div>
          </div>

          {onClose && (
            <Button
              variant="outline"
              size="icon"
              onClick={onClose}
              className="rounded-none border hover:border-destructive hover:bg-destructive/10 hover:text-destructive"
              title="Close panel (Esc)"
            >
              <X className="h-4 w-4" />
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
                          artifact={artifact as any}
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
                          artifact={artifact as any}
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
                          artifact={artifact as any}
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
