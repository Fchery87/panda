'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Check as IconCheck, Diff as IconDiff, AppWindow as IconBrowser, Loader2 as IconSpinner, X as IconX } from 'lucide-react'

export type WorkspaceBannerState = 'idle' | 'agent-running' | 'agent-complete'

interface WorkspaceBannerProps {
  state: WorkspaceBannerState
  changedFilesCount: number
  onReviewDiff?: () => void
  onOpenPreview?: () => void
  onDismiss?: () => void
  autoDismissMs?: number
}

export function WorkspaceBanner({
  state,
  changedFilesCount,
  onReviewDiff,
  onOpenPreview,
  onDismiss,
  autoDismissMs = 30000,
}: WorkspaceBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  const handleDismiss = useCallback(() => {
    setDismissed(true)
    onDismiss?.()
  }, [onDismiss])

  useEffect(() => {
    if (state !== 'agent-complete' || dismissed || autoDismissMs <= 0) return
    const timer = setTimeout(handleDismiss, autoDismissMs)
    return () => clearTimeout(timer)
  }, [state, dismissed, autoDismissMs, handleDismiss])

  useEffect(() => {
    if (state === 'agent-complete') {
      setDismissed(false)
    }
  }, [state])

  const visible = state !== 'idle' && !(state === 'agent-complete' && dismissed)

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          className="overflow-hidden"
        >
          {state === 'agent-running' && (
            <div className="review-banner border-[hsl(var(--status-info)/0.4)] bg-[hsl(var(--status-info)/0.06)] py-2">
              <div className="flex items-center gap-2">
                <IconSpinner className="h-3.5 w-3.5 animate-spin text-[hsl(var(--status-info))]" />
                <span className="text-foreground">Agent working</span>
                {changedFilesCount > 0 && (
                  <span className="text-muted-foreground">
                    — {changedFilesCount} file{changedFilesCount !== 1 ? 's' : ''} changed so far
                  </span>
                )}
              </div>
            </div>
          )}

          {state === 'agent-complete' && (
            <div className="review-banner border-[hsl(var(--status-success)/0.4)] bg-[hsl(var(--status-success)/0.06)] py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center bg-[hsl(var(--status-success)/0.15)]">
                  <IconCheck className="h-3.5 w-3.5 text-[hsl(var(--status-success))]" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-foreground">Task complete</p>
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
                    data-testid="workspace-review-diff-button"
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
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
