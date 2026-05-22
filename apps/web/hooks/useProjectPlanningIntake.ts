'use client'

import { useCallback } from 'react'
import type { Id } from '@convex/_generated/dataModel'
import {
  buildPlanningIntakeMessage,
  buildPlanningIntakeQuestions,
  type PlanningIntakeSeed,
} from '@/lib/planning/intake-bridge'
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
  openRightPanelTab: (tab: 'proof' | 'changes' | 'context') => void
}

export function useProjectPlanningIntake({
  activeChatId,
  planningQuestions,
  startIntake,
  addMessage,
  openRightPanelTab,
}: UseProjectPlanningIntakeParams) {
  return useCallback(
    async (seed?: PlanningIntakeSeed | null) => {
      const intakeQuestions = buildPlanningIntakeQuestions({
        seed: seed ?? null,
        fallbackQuestions: planningQuestions,
      })
      const sessionId = await startIntake(intakeQuestions)

      if (activeChatId) {
        await addMessage({
          chatId: activeChatId,
          role: 'user',
          content: buildPlanningIntakeMessage(seed ?? null),
          annotations: [{ mode: 'plan' }],
        })
      }

      openRightPanelTab('context')

      return sessionId
    },
    [activeChatId, addMessage, openRightPanelTab, planningQuestions, startIntake]
  )
}
