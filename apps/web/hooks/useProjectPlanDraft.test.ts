import { describe, expect, test } from 'bun:test'
import { deriveNextPlanDraft } from '@/lib/chat/planDraft'
import type { GeneratedPlanArtifact } from '@/lib/planning/types'
import {
  getAuthoritativePlanDraftValue,
  persistProjectPlanDraft,
  shouldSyncStructuredPlanDraftMirror,
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
  test('uses the structured generated plan as the authoritative draft instead of architect message content', () => {
    const planDraft = getAuthoritativePlanDraftValue({
      activeChat: {
        _id: 'chat_1' as never,
        planDraft: 'legacy persisted draft',
      },
      activePlanningSession: {
        sessionId: 'planning_1',
        generatedPlan: createGeneratedPlan(),
      },
    })

    expect(planDraft).toContain('## Implementation')
    expect(planDraft).not.toContain('legacy persisted draft')
    expect(
      shouldDerivePlanDraftFromArchitectMessages({
        activeChat: {
          _id: 'chat_1' as never,
          planDraft: '',
        },
        activePlanningSession: {
          sessionId: 'planning_1',
          generatedPlan: createGeneratedPlan(),
        },
        currentPlanDraft: planDraft,
        lastSavedPlanDraft: planDraft,
      })
    ).toBe(false)
  })

  test('allows architect message extraction only as a fallback when no planning session exists', () => {
    const shouldFallback = shouldDerivePlanDraftFromArchitectMessages({
      activeChat: {
        _id: 'chat_legacy' as never,
      },
      activePlanningSession: null,
      currentPlanDraft: '',
      lastSavedPlanDraft: '',
    })

    const nextDraft = deriveNextPlanDraft({
      mode: 'architect',
      agentStatus: 'complete',
      currentPlanDraft: '',
      requireValidatedBrainstorm: false,
      messages: [
        {
          role: 'assistant',
          mode: 'architect',
          content: 'Legacy architect plan draft',
        },
      ],
    })

    expect(shouldFallback).toBe(true)
    expect(nextDraft).toBe('Legacy architect plan draft')
  })

  test('does not derive from architect messages when a legacy persisted draft already exists', () => {
    expect(
      shouldDerivePlanDraftFromArchitectMessages({
        activeChat: {
          _id: 'chat_legacy' as never,
          planDraft: 'persisted legacy draft',
        },
        activePlanningSession: null,
        currentPlanDraft: 'persisted legacy draft',
        lastSavedPlanDraft: 'persisted legacy draft',
      })
    ).toBe(false)
  })

  test('marks the compatibility mirror stale when a structured generated plan differs from chat.planDraft', () => {
    const structuredPlanDraft = getAuthoritativePlanDraftValue({
      activeChat: {
        _id: 'chat_1' as never,
        planDraft: 'outdated legacy draft',
      },
      activePlanningSession: {
        sessionId: 'planning_1',
        generatedPlan: createGeneratedPlan(),
      },
    })

    expect(
      shouldSyncStructuredPlanDraftMirror({
        activeChat: {
          _id: 'chat_1' as never,
          planDraft: 'outdated legacy draft',
        },
        activePlanningSession: {
          sessionId: 'planning_1',
          generatedPlan: createGeneratedPlan(),
        },
        authoritativePlanDraft: structuredPlanDraft,
      })
    ).toBe(true)
  })

  test('force-sync persists the structured compatibility mirror when chat.planDraft is stale', async () => {
    const planDraft = getAuthoritativePlanDraftValue({
      activeChat: {
        _id: 'chat_1' as never,
        planDraft: 'outdated legacy draft',
        planStatus: 'drafting',
      },
      activePlanningSession: {
        sessionId: 'planning_1',
        generatedPlan: createGeneratedPlan(),
      },
    })
    const calls: Array<Record<string, unknown>> = []

    const result = await persistProjectPlanDraft({
      activeChat: {
        _id: 'chat_1' as never,
        planDraft: 'outdated legacy draft',
        planStatus: 'drafting',
      },
      nextPlanDraft: planDraft,
      lastSavedPlanDraft: planDraft,
      updateChatMutation: async (payload) => {
        calls.push(payload as Record<string, unknown>)
      },
      options: {
        source: 'generation',
        forceSync: true,
      },
    })

    expect(result.didPersist).toBe(true)
    expect(calls).toHaveLength(1)
    expect(calls[0]?.id).toBe('chat_1')
    expect(calls[0]?.planDraft).toBe(planDraft)
  })
})
