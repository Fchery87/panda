'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
  Check as IconCheck,
  Diff as IconDiff,
  AppWindow as IconBrowser,
  RefreshCw as IconRefresh,
  X as IconX,
  Zap as IconQuickAction,
} from 'lucide-react'

interface AgentCompletionBannerProps {
  isVisible: boolean
  taskTitle: string
  changedFilesCount?: number
  onReviewDiff?: () => void
  onOpenPreview?: () => void
  onReRunTests?: () => void
  onContinueTask?: () => void
  onDismiss?: () => void
  /** Auto-dismiss after this many ms (default: 30000). Set 0 to disable. */
  autoDismissMs?: number
}

export function AgentCompletionBanner({
  isVisible,
  taskTitle,
  changedFilesCount = 0,
  onReviewDiff,
  onOpenPreview,
  onReRunTests,
  onContinueTask,
  onDismiss,
  autoDismissMs = 30000,
}: AgentCompletionBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  const handleDismiss = useCallback(() => {
    setDismissed(true)
    onDismiss?.()
  }, [onDismiss])

  // Auto-dismiss timer
  useEffect(() => {
    if (!isVisible || dismissed || autoDismissMs <= 0) return

    const timer = setTimeout(handleDismiss, autoDismissMs)
    return () => clearTimeout(timer)
  }, [isVisible, dismissed, autoDismissMs, handleDismiss])

  // Reset dismissed state when visibility changes
  useEffect(() => {
    if (isVisible) {
      setDismissed(false)
    }
  }, [isVisible])

  const show = isVisible && !dismissed

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          className="overflow-hidden"
        >
          <div className="review-banner py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center bg-[hsl(var(--status-success)/0.15)]">
                <IconCheck className="h-3.5 w-3.5 text-[hsl(var(--status-success))]" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-foreground">
                  Agent completed: {taskTitle}
                </p>
                {changedFilesCount > 0 && (
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {changedFilesCount} file{changedFilesCount !== 1 ? 's' : ''} changed
                  </p>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {onReviewDiff && changedFilesCount > 0 && (
                <Button
                  data-testid="agent-completion-review-diff-button"
                  size="sm"
                  className="h-7 gap-1.5 rounded-none bg-primary px-3 font-mono text-[10px] uppercase tracking-widest text-primary-foreground hover:bg-primary/90"
                  onClick={onReviewDiff}
                >
                  <IconDiff className="h-3 w-3" />
                  Review Diff
                </Button>
              )}
              {onOpenPreview && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 rounded-none font-mono text-[10px] uppercase tracking-widest"
                  onClick={onOpenPreview}
                >
                  <IconBrowser className="h-3 w-3" />
                  Preview
                </Button>
              )}
              {onReRunTests && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 rounded-none font-mono text-[10px] uppercase tracking-widest"
                  onClick={onReRunTests}
                >
                  <IconRefresh className="h-3 w-3" />
                  Tests
                </Button>
              )}
              {onContinueTask && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 rounded-none font-mono text-[10px] uppercase tracking-widest"
                  onClick={onContinueTask}
                >
                  <IconQuickAction className="h-3 w-3" />
                  Continue
                </Button>
              )}
              <button
                type="button"
                onClick={handleDismiss}
                className="ml-1 flex h-6 w-6 items-center justify-center text-muted-foreground hover:text-foreground"
                title="Dismiss"
                aria-label="Dismiss completion banner"
              >
                <IconX className="h-3 w-3" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
