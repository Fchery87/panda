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
  openRightPanelTab: (tab: 'chat' | 'review' | 'plan') => void
}

export function useProjectPlanningIntake({
  activeChatId,
  planningQuestions,
  startIntake,
  addMessage,
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

    openRightPanelTab('plan')

    return sessionId
  }, [activeChatId, addMessage, openRightPanelTab, planningQuestions, startIntake])
}
