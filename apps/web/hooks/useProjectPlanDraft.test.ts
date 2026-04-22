import { describe, expect, test } from 'bun:test'
import { deriveNextPlanDraft } from '@/lib/chat/planDraft'
import type { GeneratedPlanArtifact } from '@/lib/planning/types'
import {
  getAuthoritativePlanDraftValue,
  shouldDerivePlanDraftFromArchitectMessages,
} from './useProjectPlanDraft'

function createGeneratedPlan(): GeneratedPlanArtifact {
  return {
    chatId: 'chat_1',
    sessionId: 'planning_1',
    title: 'Structured plan',
    summary: 'Canonical session-backed plan',
    markdown: '',
    sections: [
      {
        id: 'section_1',
        title: 'Implementation',
        content: 'Use the structured plan artifact.',
        order: 10,
      },
    ],
    acceptanceChecks: ['Run focused tests'],
    status: 'ready_for_review',
    generatedAt: 1,
  }
}

describe('useProjectPlanDraft compatibility behavior', () => {
  test('uses the structured generated plan as the authoritative draft', () => {
    const planDraft = getAuthoritativePlanDraftValue({
      activePlanningSession: {
        sessionId: 'planning_1',
        generatedPlan: createGeneratedPlan(),
      },
    })

    expect(planDraft).toContain('## Implementation')
  })

  test('returns an empty draft when no planning session exists', () => {
    expect(
      getAuthoritativePlanDraftValue({
        activePlanningSession: null,
      })
    ).toBe('')
  })

  test('allows architect message extraction only as a local fallback when no planning session exists', () => {
    const shouldFallback = shouldDerivePlanDraftFromArchitectMessages({
      activeChat: {
        _id: 'chat_legacy' as never,
      },
      activePlanningSession: null,
      currentPlanDraft: '',
      lastSavedPlanDraft: '',
    })

    const nextDraft = deriveNextPlanDraft({
      mode: 'plan',
      agentStatus: 'complete',
      currentPlanDraft: '',
      requireValidatedBrainstorm: false,
      messages: [
        {
          role: 'assistant',
          mode: 'plan',
          content: 'Legacy architect plan draft',
        },
      ],
    })

    expect(shouldFallback).toBe(true)
    expect(nextDraft).toBe('Legacy architect plan draft')
  })

  test('does not derive from architect messages when a local draft already exists', () => {
    expect(
      shouldDerivePlanDraftFromArchitectMessages({
        activeChat: {
          _id: 'chat_legacy' as never,
        },
        activePlanningSession: null,
        currentPlanDraft: 'persisted local draft',
        lastSavedPlanDraft: 'persisted local draft',
      })
    ).toBe(false)
  })

  test('does not derive from architect messages when a session-backed plan already exists', () => {
    expect(
      shouldDerivePlanDraftFromArchitectMessages({
        activeChat: {
          _id: 'chat_1' as never,
        },
        activePlanningSession: {
          sessionId: 'planning_1',
          generatedPlan: createGeneratedPlan(),
        },
        currentPlanDraft: '',
        lastSavedPlanDraft: '',
      })
    ).toBe(false)
  })
})
