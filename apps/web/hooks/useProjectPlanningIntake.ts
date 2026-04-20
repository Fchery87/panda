'use client'

import { useCallback } from 'react'
import type { Id } from '@convex/_generated/dataModel'
import type { PlanningQuestion } from '@/lib/planning/types'

interface UseProjectPlanningIntakeParams {
  activeChatId?: Id<'chats'>
  planningQuestions: PlanningQuestion[]
  startIntake: (questions: PlanningQuestion[]) => Promise<unknown>
  addMessage: (args: {
    chatId: Id<'chats'>
    role: 'user'
    content: string
    annotations: Array<{ mode: 'plan' }>
  }) => Promise<unknown>
  setIsChatInspectorOpen: (open: boolean) => void
  setChatInspectorTab: (tab: 'run' | 'artifacts' | 'plan' | 'memory' | 'evals') => void
  openRightPanelTab: (tab: 'chat' | 'review' | 'plan') => void
}

export function useProjectPlanningIntake({
  activeChatId,
  planningQuestions,
  startIntake,
  addMessage,
  setIsChatInspectorOpen,
  setChatInspectorTab,
  openRightPanelTab,
}: UseProjectPlanningIntakeParams) {
  return useCallback(async () => {
    const sessionId = await startIntake(planningQuestions)

    if (activeChatId) {
      const taskSummary = 'Start planning intake'
      await addMessage({
        chatId: activeChatId,
        role: 'user',
        content: taskSummary,
        annotations: [{ mode: 'plan' }],
      })
    }

    setIsChatInspectorOpen(true)
    setChatInspectorTab('plan')
    openRightPanelTab('plan')

    return sessionId
  }, [
    activeChatId,
    addMessage,
    openRightPanelTab,
    planningQuestions,
    setChatInspectorTab,
    setIsChatInspectorOpen,
    startIntake,
  ])
}
