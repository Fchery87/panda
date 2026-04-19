'use client'

import { useCallback } from 'react'
import type { Id } from '@convex/_generated/dataModel'
import { derivePlanCompletionStatus } from '@/lib/agent/plan-progress'
import type { PlanStatus } from '@/lib/chat/planDraft'

interface ActivePlanningSessionLike {
  sessionId: string
}

interface ActiveChatLike {
  _id: Id<'chats'>
  planBuildRunId?: Id<'agentRuns'>
  planStatus?: PlanStatus
}

interface UseProjectAgentRunCallbacksParams {
  activePlanningSession: ActivePlanningSessionLike | null
  activeChat: ActiveChatLike | null | undefined
  updateChatMutation: (args: {
    id: Id<'chats'>
    planBuildRunId?: Id<'agentRuns'>
    planStatus?: PlanStatus
  }) => Promise<unknown>
  markPlanningExecutionState: (args: {
    sessionId?: string
    state: 'executing' | 'completed' | 'failed' | 'partial'
    runId?: Id<'agentRuns'>
  }) => Promise<unknown>
  approvedPlanRunSessionsRef: React.MutableRefObject<Map<string, string>>
}

export function useProjectAgentRunCallbacks({
  activePlanningSession,
  activeChat,
  updateChatMutation,
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

      if (!activeChat?._id) return
      await updateChatMutation({
        id: activeChat._id,
        planBuildRunId: runId,
        planStatus: 'executing',
      })
    },
    [
      activeChat,
      activePlanningSession,
      approvedPlanRunSessionsRef,
      markPlanningExecutionState,
      updateChatMutation,
    ]
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

      if (!activeChat?._id || !activeChat.planBuildRunId) return
      if (activeChat.planBuildRunId !== runId) return
      if (activeChat.planStatus !== 'executing') return

      await updateChatMutation({
        id: activeChat._id,
        planStatus: nextPlanStatus,
      })
    },
    [activeChat, approvedPlanRunSessionsRef, markPlanningExecutionState, updateChatMutation]
  )

  return {
    handleRunCreated,
    handleRunCompleted,
  }
}
