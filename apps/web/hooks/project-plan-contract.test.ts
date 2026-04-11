import { describe, expect, test } from 'bun:test'
import {
  isExecutablePlanArtifact,
  shouldUseStructuredExecutionTransition,
} from './useProjectMessageWorkflow'
import { createProjectPlanningSessionActions } from './useProjectPlanningSession'
import { shouldUseStructuredPlanApproval } from './useProjectPlanDraft'

describe('project plan contract wiring', () => {
  test('treats accepted and resumed plan artifacts as executable contracts', () => {
    expect(isExecutablePlanArtifact({ status: 'accepted' })).toBe(true)
    expect(isExecutablePlanArtifact({ status: 'executing' })).toBe(true)
    expect(isExecutablePlanArtifact({ status: 'failed' })).toBe(true)
    expect(isExecutablePlanArtifact({ status: 'completed' })).toBe(true)
    expect(isExecutablePlanArtifact({ status: 'ready_for_review' })).toBe(false)
    expect(isExecutablePlanArtifact(null)).toBe(false)
  })

  test('uses structured approval only when review-ready session state and callback are present', () => {
    expect(
      shouldUseStructuredPlanApproval({
        activePlanningSession: {
          sessionId: 'planning_1',
          generatedPlan: { status: 'ready_for_review' } as never,
        },
        acceptPlanningSession: async () => null,
      })
    ).toBe(true)

    expect(
      shouldUseStructuredPlanApproval({
        activePlanningSession: {
          sessionId: 'planning_1',
          generatedPlan: { status: 'ready_for_review' } as never,
        },
      })
    ).toBe(false)
  })

  test('binds execution-state transitions to the recorded planning session id', async () => {
    const calls: Array<{ sessionId: string; state: string }> = []
    const actions = createProjectPlanningSessionActions({
      activeChatId: 'chat_1' as never,
      sessionId: 'planning_current',
      mutations: {
        startIntake: async () => null,
        answerQuestion: async () => null,
        acceptPlan: async () => null,
        markExecutionState: async (payload) => {
          calls.push({ sessionId: payload.sessionId, state: payload.state })
          return payload
        },
        clearIntake: async () => null,
      },
    })

    await actions.markExecutionState({ sessionId: 'planning_recorded', state: 'completed' })

    expect(calls).toEqual([{ sessionId: 'planning_recorded', state: 'completed' }])
  })

  test('uses structured execution transitions only when session, executable artifact, and callback are present', () => {
    expect(
      shouldUseStructuredExecutionTransition({
        activePlanningSessionId: 'planning_1',
        approvedPlanArtifact: { status: 'accepted' },
        markPlanningExecutionState: async () => null,
      })
    ).toBe(true)

    expect(
      shouldUseStructuredExecutionTransition({
        activePlanningSessionId: 'planning_1',
        approvedPlanArtifact: { status: 'accepted' },
      })
    ).toBe(false)

    expect(
      shouldUseStructuredExecutionTransition({
        activePlanningSessionId: 'planning_1',
        approvedPlanArtifact: { status: 'ready_for_review' },
        markPlanningExecutionState: async () => null,
      })
    ).toBe(false)
  })
})
