'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { IconDiff, IconSpinner } from '@/components/ui/icons'
import type { TaskStatus } from '@/components/layout/TaskHeader'

interface ReviewChangesBannerProps {
  isVisible: boolean
  changedFilesCount: number
  status?: TaskStatus
  onReviewChanges: () => void
}

const STATUS_LABELS: Partial<Record<TaskStatus, string>> = {
  draft: 'Draft',
  running: 'Running',
  review: 'Needs Review',
  approved: 'Approved',
  blocked: 'Blocked',
  failed: 'Failed',
}

export function ReviewChangesBanner({
  isVisible,
  changedFilesCount,
  status = 'review',
  onReviewChanges,
}: ReviewChangesBannerProps) {
  if (!isVisible || changedFilesCount <= 0) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="overflow-hidden"
      >
        <div className="review-banner">
          <div className="flex items-center gap-2">
            <IconDiff className="h-3.5 w-3.5 text-[hsl(var(--status-warning))]" />
            <span className="text-foreground">
              {changedFilesCount} file{changedFilesCount !== 1 ? 's' : ''} with pending changes
            </span>
            <span className="status-badge" data-status={status}>
              {status === 'running' && <IconSpinner className="h-2.5 w-2.5 animate-spin" />}
              {STATUS_LABELS[status] ?? status}
            </span>
          </div>
          <Button
            size="sm"
            className="h-7 gap-1.5 rounded-none bg-primary px-4 font-mono text-[10px] uppercase tracking-widest text-primary-foreground hover:bg-primary/90"
            onClick={onReviewChanges}
          >
            <IconDiff className="h-3 w-3" />
            Review Changes
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
