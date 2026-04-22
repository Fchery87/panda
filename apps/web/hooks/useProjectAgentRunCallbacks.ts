'use client'

import { useCallback } from 'react'
import type { Id } from '@convex/_generated/dataModel'
import { derivePlanCompletionStatus } from '@/lib/agent/plan-progress'

interface ActivePlanningSessionLike {
  sessionId: string
}

interface UseProjectAgentRunCallbacksParams {
  activePlanningSession: ActivePlanningSessionLike | null
  markPlanningExecutionState: (args: {
    sessionId?: string
    state: 'executing' | 'completed' | 'failed' | 'partial'
    runId?: Id<'agentRuns'>
  }) => Promise<unknown>
  approvedPlanRunSessionsRef: React.MutableRefObject<Map<string, string>>
}

export function useProjectAgentRunCallbacks({
  activePlanningSession,
  markPlanningExecutionState,
  approvedPlanRunSessionsRef,
}: UseProjectAgentRunCallbacksParams) {
  const handleRunCreated = useCallback(
    async ({
      runId,
      approvedPlanExecution,
    }: {
      runId: Id<'agentRuns'>
      approvedPlanExecution?: boolean
    }) => {
      void runId

      if (!approvedPlanExecution) return

      const planningSessionId = activePlanningSession?.sessionId ?? null
      if (planningSessionId) {
        approvedPlanRunSessionsRef.current.set(String(runId), planningSessionId)
        await markPlanningExecutionState({
          state: 'executing',
          runId,
        })
        return
      }
    },
    [activePlanningSession, approvedPlanRunSessionsRef, markPlanningExecutionState]
  )

  const handleRunCompleted = useCallback(
    async ({
      runId,
      outcome,
      completedPlanStepIndexes,
      planTotalSteps,
    }: {
      runId: Id<'agentRuns'>
      outcome: 'completed' | 'failed' | 'stopped'
      completedPlanStepIndexes: number[]
      planTotalSteps: number
    }) => {
      const nextPlanStatus = derivePlanCompletionStatus({
        planTotalSteps,
        completedPlanStepIndexes,
        runOutcome: outcome,
      })

      const planningSessionId = approvedPlanRunSessionsRef.current.get(String(runId))
      if (planningSessionId) {
        approvedPlanRunSessionsRef.current.delete(String(runId))
        await markPlanningExecutionState({
          sessionId: planningSessionId,
          state: nextPlanStatus,
        })
        return
      }
    },
    [approvedPlanRunSessionsRef, markPlanningExecutionState]
  )

  return {
    handleRunCreated,
    handleRunCompleted,
  }
}
