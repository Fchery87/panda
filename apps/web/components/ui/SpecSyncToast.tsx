/**
 * SpecSyncToast - Drift detection notification component
 *
 * Non-blocking toast notification for spec drift detection.
 * Prompts users to update specs when code changes affect spec-covered areas.
 *
 * Design: Brutalist - sharp corners, monospace fonts, precise spacing
 */

'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Button } from './button'
import { cn } from '@/lib/utils'
import type { DriftReport } from '@/lib/agent/spec/reconciler'

/**
 * Props for SpecSyncToast component
 */
export interface SpecSyncToastProps {
  /** The drift report to display */
  driftReport: DriftReport
  /** Callback when user chooses to update the spec */
  onUpdate: (driftReport: DriftReport) => void
  /** Callback when user chooses to ignore */
  onIgnore: (driftReport: DriftReport) => void
  /** Optional additional className */
  className?: string
}

/**
 * Individual toast content component
 */
function SpecSyncToastContent({ driftReport, onUpdate, onIgnore, className }: SpecSyncToastProps) {
  const { specId, findings, severity, modifiedFiles } = driftReport

  // Get the primary finding for display
  const primaryFinding = findings[0]
  const additionalCount = findings.length - 1

  return (
    <div
      className={cn('flex flex-col gap-3 p-1', 'min-w-[320px] max-w-[400px]', className)}
      data-testid="spec-sync-toast"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Spec Drift Detected
          </span>
          <h4 className="font-mono text-sm font-semibold">Spec #{specId.slice(-4)} Affected</h4>
        </div>
        <SeverityBadge severity={severity} />
      </div>

      {/* Description */}
      <p className="text-sm leading-relaxed text-foreground/90">
        {primaryFinding?.description || 'Code changes may affect spec constraints.'}
        {additionalCount > 0 && (
          <span className="text-muted-foreground"> (+{additionalCount} more)</span>
        )}
      </p>

      {/* Modified files summary */}
      {modifiedFiles.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Modified Files
          </span>
          <div className="flex flex-wrap gap-1">
            {modifiedFiles.slice(0, 2).map((file: string, i: number) => (
              <code
                key={i}
                className="max-w-[150px] truncate bg-muted px-1.5 py-0.5 font-mono text-xs"
              >
                {file.split('/').pop()}
              </code>
            ))}
            {modifiedFiles.length > 2 && (
              <code className="bg-muted px-1.5 py-0.5 font-mono text-xs">
                +{modifiedFiles.length - 2}
              </code>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          variant="default"
          size="sm"
          onClick={() => onUpdate(driftReport)}
          className="h-8 flex-1 rounded-none font-mono text-xs"
        >
          Update Spec
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onIgnore(driftReport)}
          className="h-8 flex-1 rounded-none font-mono text-xs"
        >
          Ignore
        </Button>
      </div>
    </div>
  )
}

/**
 * Severity badge component
 */
function SeverityBadge({ severity }: { severity: 'low' | 'medium' | 'high' }) {
  const styles = {
    low: 'bg-muted text-muted-foreground',
    medium: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
    high: 'bg-destructive/20 text-destructive',
  }

  return (
    <span
      className={cn('px-2 py-0.5 font-mono text-xs uppercase tracking-wider', styles[severity])}
    >
      {severity}
    </span>
  )
}

/**
 * Show a spec sync toast notification
 *
 * @param driftReport - The drift report to display
 * @param onUpdate - Callback when user chooses to update
 * @param onIgnore - Callback when user chooses to ignore
 * @param options - Additional toast options
 * @returns The toast ID
 */
export function showSpecSyncToast(
  driftReport: DriftReport,
  onUpdate: (driftReport: DriftReport) => void,
  onIgnore: (driftReport: DriftReport) => void,
  options?: {
    duration?: number
    position?:
      | 'top-left'
      | 'top-right'
      | 'bottom-left'
      | 'bottom-right'
      | 'top-center'
      | 'bottom-center'
  }
): string {
  const toastId = `spec-drift-${driftReport.specId}-${Date.now()}`

  toast.custom(
    (t: any) => (
      <div
        className={cn(
          'shadow-sharp-md border border-border bg-background',
          'rounded-none',
          'transition-all duration-200',
          t.visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
        )}
      >
        <SpecSyncToastContent
          driftReport={driftReport}
          onUpdate={(report) => {
            toast.dismiss(t.id)
            onUpdate(report)
          }}
          onIgnore={(report) => {
            toast.dismiss(t.id)
            onIgnore(report)
          }}
        />
      </div>
    ),
    {
      id: toastId,
      duration: options?.duration ?? 10000, // 10 seconds default
      position: options?.position ?? 'bottom-right',
    }
  )

  return toastId
}

/**
 * Dismiss a spec sync toast
 */
export function dismissSpecSyncToast(toastId: string): void {
  toast.dismiss(toastId)
}

/**
 * Dismiss all spec sync toasts
 */
export function dismissAllSpecSyncToasts(): void {
  toast.dismiss()
}

/**
 * SpecSyncToast hook for managing drift notifications
 */
export function useSpecSyncToast() {
  const [activeToasts, setActiveToasts] = React.useState<Set<string>>(new Set())
  const [pendingDrifts, setPendingDrifts] = React.useState<DriftReport[]>([])

  /**
   * Show a drift notification
   */
  const notifyDrift = React.useCallback(
    (
      driftReport: DriftReport,
      onUpdate: (driftReport: DriftReport) => void,
      onIgnore: (driftReport: DriftReport) => void
    ): string => {
      // Check if we already have a toast for this spec
      const existingToastId = Array.from(activeToasts).find((id) =>
        id.includes(`spec-drift-${driftReport.specId}`)
      )

      if (existingToastId) {
        // Dismiss existing toast and replace it
        dismissSpecSyncToast(existingToastId)
        setActiveToasts((prev) => {
          const next = new Set(prev)
          next.delete(existingToastId)
          return next
        })
      }

      const toastId = showSpecSyncToast(
        driftReport,
        (report) => {
          setActiveToasts((prev) => {
            const next = new Set(prev)
            next.delete(toastId)
            return next
          })
          setPendingDrifts((prev) => prev.filter((d) => d.specId !== report.specId))
          onUpdate(report)
        },
        (report) => {
          setActiveToasts((prev) => {
            const next = new Set(prev)
            next.delete(toastId)
            return next
          })
          setPendingDrifts((prev) => prev.filter((d) => d.specId !== report.specId))
          onIgnore(report)
        }
      )

      setActiveToasts((prev) => new Set(prev).add(toastId))
      setPendingDrifts((prev) => [...prev, driftReport])

      return toastId
    },
    [activeToasts]
  )

  /**
   * Clear all drift notifications
   */
  const clearAll = React.useCallback(() => {
    activeToasts.forEach((id) => dismissSpecSyncToast(id))
    setActiveToasts(new Set())
    setPendingDrifts([])
  }, [activeToasts])

  /**
   * Check if a spec has a pending drift
   */
  const hasPendingDrift = React.useCallback(
    (specId: string): boolean => {
      return pendingDrifts.some((d) => d.specId === specId)
    },
    [pendingDrifts]
  )

  /**
   * Get pending drift for a spec
   */
  const getPendingDrift = React.useCallback(
    (specId: string): DriftReport | undefined => {
      return pendingDrifts.find((d) => d.specId === specId)
    },
    [pendingDrifts]
  )

  return {
    notifyDrift,
    clearAll,
    hasPendingDrift,
    getPendingDrift,
    activeToastCount: activeToasts.size,
    pendingDriftCount: pendingDrifts.length,
  }
}

export { SpecSyncToastContent }
export default SpecSyncToastContent
