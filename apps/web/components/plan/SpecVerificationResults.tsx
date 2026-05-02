'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { CheckCircle2, XCircle, AlertCircle, ChevronDown, FileCheck, Shield, Target } from 'lucide-react'
import type { VerificationResult, AcceptanceCriterion, Constraint } from '@/lib/agent/spec/types'

interface SpecVerificationResultsProps {
  results: VerificationResult[]
  acceptanceCriteria?: AcceptanceCriterion[]
  constraints?: Constraint[]
  className?: string
}

/**
 * Status configuration for visual indicators
 */
const statusConfig = {
  passed: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    label: 'Passed',
    colorClass: 'text-success',
    bgClass: 'bg-success/10',
    borderClass: 'border-success/50',
  },
  failed: {
    icon: <XCircle className="h-4 w-4" />,
    label: 'Failed',
    colorClass: 'text-destructive',
    bgClass: 'bg-destructive/10',
    borderClass: 'border-destructive/50',
  },
  pending: {
    icon: <AlertCircle className="h-4 w-4" />,
    label: 'Pending',
    colorClass: 'text-warning',
    bgClass: 'bg-warning/10',
    borderClass: 'border-warning/50',
  },
}

/**
 * SpecVerificationResults - Display post-execution verification results
 *
 * Show: acceptance criteria status (passed/failed/pending)
 * Show: constraint satisfaction
 * Color-coded results (green=pass, red=fail, amber=pending)
 * Expandable details for each check
 */
export function SpecVerificationResults({
  results,
  acceptanceCriteria = [],
  constraints = [],
  className,
}: SpecVerificationResultsProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const toggleExpanded = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Calculate summary stats
  const passedCount = results.filter((r) => r.passed).length
  const failedCount = results.filter((r) => !r.passed).length
  const totalCount = results.length
  const passRate = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0

  // Group results by category
  const acceptanceResults = results.filter((r) =>
    acceptanceCriteria.some((ac) => ac.id === r.criterionId)
  )
  const constraintResults = results.filter((r) =>
    constraints.some((_, i) => r.criterionId === `constraint-${i}`)
  )
  const otherResults = results.filter(
    (r) =>
      !acceptanceCriteria.some((ac) => ac.id === r.criterionId) &&
      !constraints.some((_, i) => r.criterionId === `constraint-${i}`)
  )

  const renderResultItem = (result: VerificationResult, index: number) => {
    const status = result.passed ? statusConfig.passed : statusConfig.failed
    const isExpanded = expandedItems.has(result.criterionId)

    // Find associated criterion info
    const criterion = acceptanceCriteria.find((ac) => ac.id === result.criterionId)
    const constraintIndex = constraints.findIndex(
      (_, i) => result.criterionId === `constraint-${i}`
    )
    const constraint = constraintIndex >= 0 ? constraints[constraintIndex] : null

    return (
      <motion.div
        key={result.criterionId}
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className={cn('border', status.borderClass, status.bgClass)}
      >
        <button
          type="button"
          onClick={() => toggleExpanded(result.criterionId)}
          className="flex w-full items-center gap-3 p-3 text-left"
        >
          <span className={cn('shrink-0', status.colorClass)}>{status.icon}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                {criterion ? 'Criterion' : constraint ? 'Constraint' : 'Check'}
              </span>
              <span className={cn('font-mono text-[10px] uppercase', status.colorClass)}>
                {status.label}
              </span>
            </div>
            <p className="truncate text-sm">
              {criterion
                ? `WHEN ${criterion.trigger} THE SYSTEM SHALL ${criterion.behavior}`
                : constraint
                  ? `${constraint.type}: ${getConstraintSummary(constraint)}`
                  : result.criterionId}
            </p>
          </div>
          {result.message && (
            <span className={cn('shrink-0', isExpanded ? 'rotate-180' : '')}>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </span>
          )}
        </button>

        <AnimatePresence>
          {isExpanded && result.message && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="border-t border-border/50 px-3 py-2">
                <p className="font-mono text-xs text-muted-foreground">{result.message}</p>
                {result.details && Object.keys(result.details).length > 0 && (
                  <div className="mt-2 space-y-1">
                    {Object.entries(result.details).map(([key, value]) => (
                      <div key={key} className="flex items-start gap-2">
                        <span className="font-mono text-[10px] uppercase text-muted-foreground">
                          {key}:
                        </span>
                        <span className="font-mono text-[10px] text-foreground">
                          {typeof value === 'string' ? value : JSON.stringify(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Verification Results
        </h3>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'border px-2 py-0.5 font-mono text-xs',
              passRate === 100
                ? 'border-success/50 bg-success/10 text-success'
                : passRate >= 80
                  ? 'border-warning/50 bg-warning/10 text-warning'
                  : 'border-destructive/50 bg-destructive/10 text-destructive'
            )}
          >
            {passRate}% Pass Rate
          </span>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-2">
        <div className="border border-success/30 bg-success/5 p-2 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            <span className="font-mono text-lg font-semibold text-success">{passedCount}</span>
          </div>
          <span className="font-mono text-[10px] uppercase text-muted-foreground">Passed</span>
        </div>
        <div className="border border-destructive/30 bg-destructive/5 p-2 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <XCircle className="h-3.5 w-3.5 text-destructive" />
            <span className="font-mono text-lg font-semibold text-destructive">{failedCount}</span>
          </div>
          <span className="font-mono text-[10px] uppercase text-muted-foreground">Failed</span>
        </div>
        <div className="border border-border bg-muted/30 p-2 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <FileCheck className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-mono text-lg font-semibold">{totalCount}</span>
          </div>
          <span className="font-mono text-[10px] uppercase text-muted-foreground">Total</span>
        </div>
      </div>

      {/* Results by Category */}
      <div className="space-y-3">
        {acceptanceResults.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Target className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                Acceptance Criteria ({acceptanceResults.length})
              </span>
            </div>
            <div className="space-y-1">
              {acceptanceResults.map((result, index) => renderResultItem(result, index))}
            </div>
          </div>
        )}

        {constraintResults.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                Constraints ({constraintResults.length})
              </span>
            </div>
            <div className="space-y-1">
              {constraintResults.map((result, index) =>
                renderResultItem(result, index + acceptanceResults.length)
              )}
            </div>
          </div>
        )}

        {otherResults.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileCheck className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                Other Checks ({otherResults.length})
              </span>
            </div>
            <div className="space-y-1">
              {otherResults.map((result, index) =>
                renderResultItem(
                  result,
                  index + acceptanceResults.length + constraintResults.length
                )
              )}
            </div>
          </div>
        )}

        {results.length === 0 && (
          <div className="flex h-32 flex-col items-center justify-center border border-dashed border-border">
            <AlertCircle className="h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              No verification results yet
            </p>
            <p className="font-mono text-[10px] text-muted-foreground/70">
              Results will appear after execution completes
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Helper to get a summary string for a constraint
 */
function getConstraintSummary(constraint: Constraint): string {
  switch (constraint.type) {
    case 'structural':
      return constraint.rule
    case 'behavioral':
      return constraint.rule
    case 'performance':
      return `${constraint.metric}: ${constraint.threshold}${constraint.unit}`
    case 'compatibility':
      return constraint.requirement
    case 'security':
      return constraint.requirement
  }
}

/**
 * Compact version for inline display in other components
 */
interface SpecVerificationSummaryProps {
  results: VerificationResult[]
  className?: string
}

export function SpecVerificationSummary({ results, className }: SpecVerificationSummaryProps) {
  const passedCount = results.filter((r) => r.passed).length
  const totalCount = results.length
  const passRate = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0

  if (totalCount === 0) {
    return (
      <span className={cn('font-mono text-xs text-muted-foreground', className)}>
        No verification
      </span>
    )
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span
        className={cn(
          'flex items-center gap-1 font-mono text-xs',
          passRate === 100 ? 'text-success' : passRate >= 80 ? 'text-warning' : 'text-destructive'
        )}
      >
        {passRate === 100 ? (
          <CheckCircle2 className="h-3.5 w-3.5" />
        ) : passRate >= 80 ? (
          <AlertCircle className="h-3.5 w-3.5" />
        ) : (
          <XCircle className="h-3.5 w-3.5" />
        )}
        {passedCount}/{totalCount}
      </span>
      <span className="font-mono text-[10px] text-muted-foreground">{passRate}% passed</span>
    </div>
  )
}
