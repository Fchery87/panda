'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Lightbulb, Target, FileText, CheckCircle2, XCircle } from 'lucide-react'
import type { FormalSpecification } from '@/lib/agent/spec/types'
import type { PlanStatus } from '@/lib/chat/planDraft'

export interface ChatActionBarProps {
  /** Plan workflow status for current chat */
  planStatus?: PlanStatus | null
  /** Current editable plan draft content */
  planDraft?: string | null
  /** Open the plan review surface */
  onPlanReview?: () => void
  /** Approve the current plan */
  onPlanApprove?: () => void
  /** Start execution from the approved plan */
  onBuildFromPlan?: () => void
  /** Disable plan approval action */
  planApproveDisabled?: boolean
  /** Disable build-from-plan action */
  planBuildDisabled?: boolean
  /** Whether to show plan review controls */
  showPlanReview?: boolean
  /** SpecNative: Pending spec awaiting approval */
  pendingSpec?: FormalSpecification | null
  /** SpecNative: Callback when user approves pending spec */
  onSpecApprove?: (spec: FormalSpecification) => void
  /** SpecNative: Callback when user edits pending spec */
  onSpecEdit?: (spec: FormalSpecification) => void
  /** SpecNative: Callback when user cancels pending spec */
  onSpecCancel?: () => void
  /** Whether to show spec review controls */
  showSpecReview?: boolean
  className?: string
}

export function ChatActionBar({
  planStatus,
  planDraft,
  onPlanReview,
  onPlanApprove,
  onBuildFromPlan,
  planApproveDisabled = false,
  planBuildDisabled = false,
  showPlanReview = true,
  pendingSpec,
  onSpecApprove,
  onSpecEdit,
  onSpecCancel,
  showSpecReview = true,
  className,
}: ChatActionBarProps) {
  const hasPlanDraft = Boolean(planDraft?.trim())
  const showPlanCard =
    showPlanReview &&
    hasPlanDraft &&
    (planStatus === 'awaiting_review' ||
      planStatus === 'stale' ||
      planStatus === 'approved' ||
      planStatus === 'executing' ||
      planStatus === 'partial' ||
      planStatus === 'completed' ||
      planStatus === 'failed')

  const showSpecCard = showSpecReview && pendingSpec

  // If neither card should show, render nothing
  if (!showPlanCard && !showSpecCard) {
    return null
  }

  return (
    <AnimatePresence>
      {showPlanCard && (
        <motion.div
          key="plan"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
          className={cn(
            'border-y px-3 py-2',
            planStatus === 'partial' && 'border-warning/30 bg-warning/5',
            planStatus === 'completed' && 'border-emerald-500/30 bg-emerald-500/5',
            planStatus === 'failed' && 'border-destructive/30 bg-destructive/5',
            planStatus !== 'partial' &&
              planStatus !== 'completed' &&
              planStatus !== 'failed' &&
              'border-border bg-muted/30',
            className
          )}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {planStatus === 'completed' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              ) : planStatus === 'partial' ? (
                <Target className="h-4 w-4 shrink-0 text-warning" />
              ) : planStatus === 'failed' ? (
                <XCircle className="h-4 w-4 shrink-0 text-destructive" />
              ) : (
                <Lightbulb className="h-4 w-4 shrink-0 text-primary" />
              )}
              <div className="min-w-0">
                <p className="font-mono text-xs font-medium uppercase tracking-wide">
                  Plan {planStatus?.replace('_', ' ')}
                </p>
                <p className="font-mono text-[10px] text-muted-foreground [overflow-wrap:anywhere]">
                  {planStatus === 'awaiting_review' && 'Review before building'}
                  {planStatus === 'stale' && 'Plan changed, needs review'}
                  {planStatus === 'approved' && 'Ready for execution'}
                  {planStatus === 'executing' && 'Build in progress'}
                  {planStatus === 'partial' && 'Build stopped before all plan steps completed'}
                  {planStatus === 'completed' && 'Build completed successfully'}
                  {planStatus === 'failed' && 'Build failed or was stopped'}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 max-sm:w-full">
              {onPlanReview &&
                planStatus !== 'executing' &&
                planStatus !== 'partial' &&
                planStatus !== 'completed' &&
                planStatus !== 'failed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onPlanReview}
                    className="h-7 rounded-none border-border px-2 font-mono text-[11px] uppercase tracking-wide"
                  >
                    Review
                  </Button>
                )}
              {onPlanApprove && (planStatus === 'awaiting_review' || planStatus === 'stale') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onPlanApprove}
                  disabled={planApproveDisabled}
                  className="h-7 rounded-none border-primary/50 px-2 font-mono text-[11px] uppercase tracking-wide"
                >
                  Approve
                </Button>
              )}
              {onBuildFromPlan &&
                (planStatus === 'approved' ||
                  planStatus === 'executing' ||
                  planStatus === 'partial' ||
                  planStatus === 'failed') && (
                  <Button
                    size="sm"
                    onClick={onBuildFromPlan}
                    disabled={planBuildDisabled}
                    className="h-7 rounded-none px-2 font-mono text-[11px] uppercase tracking-wide"
                  >
                    Build
                  </Button>
                )}
            </div>
          </div>
        </motion.div>
      )}

      {showSpecCard && (
        <motion.div
          key="spec"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
          className={cn('border-y border-primary/30 bg-primary/5 px-3 py-2', className)}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {pendingSpec?.tier === 'explicit' ? (
                <Target className="h-4 w-4 shrink-0 text-primary" />
              ) : (
                <FileText className="h-4 w-4 shrink-0 text-primary" />
              )}
              <div className="min-w-0">
                <p className="font-mono text-xs font-medium uppercase tracking-wide">Spec Ready</p>
                <p className="font-mono text-[10px] text-muted-foreground [overflow-wrap:anywhere]">
                  {pendingSpec.intent.goal.slice(0, 60)}
                  {pendingSpec.intent.goal.length > 60 ? '...' : ''}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 max-sm:w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={onSpecCancel}
                className="h-7 rounded-none border-border px-2 font-mono text-[11px] uppercase tracking-wide"
              >
                Cancel
              </Button>
              {onSpecEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSpecEdit(pendingSpec)}
                  className="h-7 rounded-none border-primary/50 px-2 font-mono text-[11px] uppercase tracking-wide"
                >
                  Edit
                </Button>
              )}
              {onSpecApprove && (
                <Button
                  size="sm"
                  onClick={() => onSpecApprove(pendingSpec)}
                  className="h-7 rounded-none px-2 font-mono text-[11px] uppercase tracking-wide"
                >
                  Execute
                </Button>
              )}
            </div>
          </div>
          <div className="mt-1.5 flex items-center gap-2 border-t border-border/50 pt-1.5 text-[10px]">
            <span className="font-mono uppercase text-muted-foreground">
              {pendingSpec.intent.acceptanceCriteria.length} requirements
            </span>
            <span className="text-muted-foreground/50">·</span>
            <span className="font-mono uppercase text-muted-foreground">
              {pendingSpec.intent.constraints.length} constraints
            </span>
            <span className="text-muted-foreground/50">·</span>
            <span className="font-mono uppercase text-muted-foreground">
              {pendingSpec.plan.steps.length} steps
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
