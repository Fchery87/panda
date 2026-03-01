/**
 * useSpecDriftDetection - Hook for managing spec drift detection in the UI
 *
 * Provides:
 * - Drift event listening via plugin hooks
 * - Toast notifications for drift detection
 * - Reconciliation flow management
 * - Integration with spec engine for refinement
 */

'use client'

import * as React from 'react'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import type { DriftReport } from '@/lib/agent/spec/reconciler'
import type { FormalSpecification } from '@/lib/agent/spec/types'
import { showSpecSyncToast } from '@/components/ui/SpecSyncToast'
import { plugins } from '@/lib/agent/harness/plugins'

interface DriftDetectionState {
  /** Currently pending drift reports */
  pendingDrifts: Map<string, DriftReport>
  /** Currently processing drift reports */
  processingDrifts: Set<string>
  /** Completed reconciliations */
  completedReconciliations: Map<string, { success: boolean; newSpecId?: string }>
}

interface UseSpecDriftDetectionOptions {
  /** Project ID for spec operations */
  projectId?: Id<'projects'>
  /** Chat ID for spec operations */
  chatId?: Id<'chats'>
  /** Callback when drift is detected */
  onDriftDetected?: (report: DriftReport) => void
  /** Callback when reconciliation completes */
  onReconciliationComplete?: (specId: string, success: boolean, newSpecId?: string) => void
}

/**
 * Hook for spec drift detection and reconciliation
 */
export function useSpecDriftDetection(options: UseSpecDriftDetectionOptions = {}) {
  const { onDriftDetected, onReconciliationComplete } = options

  const [state, setState] = React.useState<DriftDetectionState>({
    pendingDrifts: new Map(),
    processingDrifts: new Set(),
    completedReconciliations: new Map(),
  })

  // Convex mutations
  const createVersionMutation = useMutation(api.specifications.createVersion)
  const markDriftedMutation = useMutation(api.specifications.markDrifted)

  /**
   * Handle reconciliation of a drift report
   */
  const handleReconcile = React.useCallback(
    async (report: DriftReport) => {
      try {
        // Mark spec as drifted in database
        await markDriftedMutation({
          specId: report.specId as Id<'specifications'>,
          driftDetails: {
            findings: report.findings,
            modifiedFiles: report.modifiedFiles,
            detectedAt: report.detectedAt,
            severity: report.severity,
          },
        })

        // Create new version (the actual refinement would happen server-side
        // or via the spec engine - here we just create the version chain)
        const result = await createVersionMutation({
          parentSpecId: report.specId as Id<'specifications'>,
          // The updates would be computed by the spec engine's refineFromDrift
          // For now, we create a new version that can be edited
        })

        setState((prev) => {
          const nextProcessing = new Set(prev.processingDrifts)
          nextProcessing.delete(report.specId)
          return {
            ...prev,
            processingDrifts: nextProcessing,
            completedReconciliations: new Map(prev.completedReconciliations).set(report.specId, {
              success: true,
              newSpecId: result.newSpecId,
            }),
          }
        })

        onReconciliationComplete?.(report.specId, true, result.newSpecId)
      } catch (error) {
        console.error('Reconciliation failed:', error)

        setState((prev) => {
          const nextProcessing = new Set(prev.processingDrifts)
          nextProcessing.delete(report.specId)
          return {
            ...prev,
            processingDrifts: nextProcessing,
            completedReconciliations: new Map(prev.completedReconciliations).set(report.specId, {
              success: false,
            }),
          }
        })

        onReconciliationComplete?.(report.specId, false)
      }
    },
    [createVersionMutation, markDriftedMutation, onReconciliationComplete]
  )

  /**
   * Show drift notification toast
   */
  const notifyDrift = React.useCallback(
    (report: DriftReport) => {
      // Don't show duplicate notifications for the same spec
      if (state.pendingDrifts.has(report.specId) || state.processingDrifts.has(report.specId)) {
        return
      }

      // Add to pending
      setState((prev) => ({
        ...prev,
        pendingDrifts: new Map(prev.pendingDrifts).set(report.specId, report),
      }))

      // Show toast
      showSpecSyncToast(
        report,
        // On update - trigger reconciliation
        async (driftReport) => {
          setState((prev) => {
            const nextPending = new Map(prev.pendingDrifts)
            nextPending.delete(driftReport.specId)
            return {
              ...prev,
              pendingDrifts: nextPending,
              processingDrifts: new Set(prev.processingDrifts).add(driftReport.specId),
            }
          })

          // Trigger reconciliation
          await handleReconcile(driftReport)
        },
        // On ignore - just clear from pending
        (driftReport) => {
          setState((prev) => {
            const nextPending = new Map(prev.pendingDrifts)
            nextPending.delete(driftReport.specId)
            return { ...prev, pendingDrifts: nextPending }
          })
        },
        { duration: 15000 } // 15 seconds to decide
      )

      // Call external handler
      onDriftDetected?.(report)
    },
    [state.pendingDrifts, state.processingDrifts, onDriftDetected, handleReconcile]
  )

  /**
   * Manually trigger drift detection for a spec
   */
  const detectDrift = React.useCallback(
    async (spec: FormalSpecification, modifiedFiles: string[]) => {
      // Import drift detection dynamically to avoid SSR issues
      const { createDriftReport } = await import('@/lib/agent/spec/drift-detection')

      const report = createDriftReport(spec, modifiedFiles, 'Manual drift detection')

      if (report.hasDrift) {
        notifyDrift(report)
      }

      return report
    },
    [notifyDrift]
  )

  /**
   * Clear all pending drifts
   */
  const clearPendingDrifts = React.useCallback(() => {
    setState((prev) => ({
      ...prev,
      pendingDrifts: new Map(),
    }))
  }, [])

  /**
   * Check if a spec has pending drift
   */
  const hasPendingDrift = React.useCallback(
    (specId: string): boolean => {
      return state.pendingDrifts.has(specId)
    },
    [state.pendingDrifts]
  )

  /**
   * Get pending drift for a spec
   */
  const getPendingDrift = React.useCallback(
    (specId: string): DriftReport | undefined => {
      return state.pendingDrifts.get(specId)
    },
    [state.pendingDrifts]
  )

  // Set up plugin hook listener for drift detection
  React.useEffect(() => {
    // Register a plugin to listen for drift detection events
    const driftListenerPlugin = {
      name: 'drift-listener',
      version: '1.0.0',
      hooks: {
        'spec.drift.detected': async (_ctx: unknown, data: unknown) => {
          const report = data as DriftReport
          notifyDrift(report)
          return data
        },
      },
    }

    plugins.register(driftListenerPlugin)

    return () => {
      plugins.unregister('drift-listener')
    }
  }, [notifyDrift])

  return {
    // State
    pendingDrifts: Array.from(state.pendingDrifts.values()),
    processingDrifts: state.processingDrifts,
    completedReconciliations: state.completedReconciliations,

    // Actions
    notifyDrift,
    detectDrift,
    clearPendingDrifts,
    hasPendingDrift,
    getPendingDrift,

    // Counts
    pendingCount: state.pendingDrifts.size,
    processingCount: state.processingDrifts.size,
  }
}

export default useSpecDriftDetection
