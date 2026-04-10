'use client'

import { IconQuickAction, IconDiff, IconRefresh, IconSpinner } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'

export type TaskStatus = 'draft' | 'running' | 'review' | 'approved' | 'blocked' | 'failed'

interface TaskHeaderProps {
  title: string
  status: TaskStatus
  changedFilesCount?: number
  elapsed?: string
  onReviewChanges?: () => void
  onPause?: () => void
  onResume?: () => void
  onStop?: () => void
  onRetry?: () => void
  isVisible?: boolean
}

export function TaskHeader({
  title,
  status,
  changedFilesCount = 0,
  elapsed,
  onReviewChanges,
  onPause,
  onStop,
  onRetry,
  isVisible = true,
}: TaskHeaderProps) {
  if (!isVisible) return null

  return (
    <div className="surface-1 flex h-9 shrink-0 items-center justify-between border-b border-border px-4">
      <div className="flex min-w-0 items-center gap-3">
        <IconQuickAction className="h-3.5 w-3.5 shrink-0 text-primary" weight="fill" />
        <span className="truncate font-mono text-xs font-medium text-foreground">{title}</span>
        <span className="status-badge" data-status={status}>
          {status === 'running' && <IconSpinner className="h-2.5 w-2.5 animate-spin" />}
          {status}
        </span>
        {changedFilesCount > 0 && (
          <span className="surface-0 flex items-center gap-1 border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            <IconDiff className="h-3 w-3" />
            {changedFilesCount}
          </span>
        )}
        {elapsed && <span className="font-mono text-[10px] text-muted-foreground">{elapsed}</span>}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {/* Agent controls */}
        {(status === 'running' || status === 'review') && onPause && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 rounded-none px-2 font-mono text-[10px] uppercase tracking-widest"
            onClick={onPause}
          >
            Pause
          </Button>
        )}
        {status === 'running' && onStop && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 rounded-none px-2 font-mono text-[10px] uppercase tracking-widest text-destructive hover:text-destructive"
            onClick={onStop}
          >
            Stop
          </Button>
        )}
        {status === 'failed' && onRetry && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 rounded-none px-2 font-mono text-[10px] uppercase tracking-widest"
            onClick={onRetry}
          >
            <IconRefresh className="h-3 w-3" />
            Retry
          </Button>
        )}

        {/* Review Changes - prominent when pending */}
        {changedFilesCount > 0 && status !== 'running' && onReviewChanges && (
          <Button
            size="sm"
            className="h-6 gap-1.5 rounded-none bg-primary px-3 font-mono text-[10px] uppercase tracking-widest text-primary-foreground hover:bg-primary/90"
            onClick={onReviewChanges}
          >
            <IconDiff className="h-3 w-3" />
            Review Changes
          </Button>
        )}
      </div>
    </div>
  )
}
