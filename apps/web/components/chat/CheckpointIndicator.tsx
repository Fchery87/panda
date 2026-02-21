'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { History, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CheckpointIndicatorProps {
  projectId: Id<'projects'>
  chatId: Id<'chats'>
  onRestore?: (checkpointId: Id<'checkpoints'>) => void
  className?: string
}

interface Checkpoint {
  _id: Id<'checkpoints'>
  _creationTime: number
  projectId: Id<'projects'>
  chatId: Id<'chats'>
  name: string
  description?: string
  filesChanged: string[]
  snapshotIds: Id<'fileSnapshots'>[]
  createdAt: number
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'just now'
}

export function CheckpointIndicator({
  projectId: _projectId,
  chatId,
  onRestore,
  className,
}: CheckpointIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)

  const checkpoints = useQuery(api.checkpoints.listByChat, {
    chatId,
    limit: 5,
  }) as Checkpoint[] | undefined

  const restoreCheckpoint = useMutation(api.checkpoints.restore)

  const latestCheckpoint = checkpoints?.[0]

  const handleRestore = async (checkpointId: Id<'checkpoints'>) => {
    setIsRestoring(true)
    try {
      await restoreCheckpoint({ checkpointId })
      onRestore?.(checkpointId)
    } catch (error) {
      console.error('Failed to restore checkpoint:', error)
    } finally {
      setIsRestoring(false)
    }
  }

  if (!checkpoints || checkpoints.length === 0) {
    return null
  }

  return (
    <div className={cn('surface-1 border border-border', className)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-3 py-2 text-left"
      >
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono text-xs">{latestCheckpoint?.name || 'Checkpoint'}</span>
          <span className="font-mono text-xs text-muted-foreground">
            {latestCheckpoint ? formatRelativeTime(latestCheckpoint.createdAt) : ''}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-3 w-3 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden border-t border-border"
          >
            <div className="max-h-48 overflow-y-auto p-2">
              {checkpoints.map((checkpoint: Checkpoint) => (
                <div
                  key={checkpoint._id}
                  className="flex items-center justify-between border-b border-border/50 py-2 last:border-0"
                >
                  <div className="flex-1">
                    <div className="font-mono text-xs">{checkpoint.name}</div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {checkpoint.filesChanged.length} file
                      {checkpoint.filesChanged.length !== 1 ? 's' : ''} ·{' '}
                      {formatRelativeTime(checkpoint.createdAt)}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRestore(checkpoint._id)}
                    disabled={isRestoring}
                    className="h-6 rounded-none px-2 font-mono text-xs"
                  >
                    <RotateCcw className="mr-1 h-3 w-3" />
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function CheckpointBadge({
  projectId,
  className,
}: {
  projectId: Id<'projects'>
  className?: string
}) {
  const latestCheckpoint = useQuery(api.checkpoints.getLatest, { projectId }) as
    | Checkpoint
    | null
    | undefined

  if (!latestCheckpoint) {
    return null
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 font-mono text-xs text-muted-foreground',
        className
      )}
    >
      <History className="h-3 w-3" />
      <span>Last checkpoint: {formatRelativeTime(latestCheckpoint.createdAt)}</span>
    </div>
  )
}
