import { describe, expect, test } from 'bun:test'
import type { GeneratedPlanArtifact, PlanningQuestion } from '@/lib/planning/types'
import {
  createProjectPlanningSessionActions,
  deriveProjectPlanningSessionState,
  type ProjectPlanningSessionRecord,
} from './useProjectPlanningSession'

function createQuestions(): PlanningQuestion[] {
  return [
    {
      id: 'outcome',
      title: 'Outcome',
      prompt: 'What outcome should we deliver?',
      suggestions: [],
      allowFreeform: true,
      order: 10,
    },
    {
      id: 'scope',
      title: 'Scope',
      prompt: 'What should stay in scope?',
      suggestions: [],
      allowFreeform: true,
      order: 20,
    },
  ]
}

function createGeneratedPlan(status: GeneratedPlanArtifact['status']): GeneratedPlanArtifact {
  return {
    chatId: 'chat_1',
    sessionId: 'planning_1',
    title: 'Plan title',
    summary: 'Plan summary',
    markdown: '',
    sections: [
      {
        id: 'section_1',
        title: 'Implementation',
        content: 'Do the work.',
        order: 10,
      },
    ],
    acceptanceChecks: ['Run focused tests'],
    status,
    generatedAt: 1,
  }
}

function createSession(
  overrides: Partial<NonNullable<ProjectPlanningSessionRecord>> = {}
): NonNullable<ProjectPlanningSessionRecord> {
  return {
    sessionId: 'planning_1',
    chatId: 'chat_1' as never,
    status: 'intake',
    questions: createQuestions(),
    answers: [],
    generatedPlan: undefined,
    ...overrides,
  }
}

describe('deriveProjectPlanningSessionState', () => {
  test('derives the current planning question from the first unanswered question', () => {
    const session = createSession({
      answers: [
        {
          questionId: 'outcome',
          source: 'freeform',
          freeformValue: 'Ship the smallest safe change',
          answeredAt: 1,
        },
      ],
    })

    const state = deriveProjectPlanningSessionState(session)

    expect(state.currentQuestion?.id).toBe('scope')
    expect(state.isIntakeActive).toBe(true)
    expect(state.isGeneratingPlan).toBe(false)
  })

  test('allows approval only when the generated plan is ready for review', () => {
    const readyForReview = deriveProjectPlanningSessionState(
      createSession({
        status: 'ready_for_review',
        generatedPlan: createGeneratedPlan('ready_for_review'),
      })
    )
    const accepted = deriveProjectPlanningSessionState(
      createSession({
        status: 'accepted',
        generatedPlan: createGeneratedPlan('accepted'),
      })
    )

    expect(readyForReview.canApprove).toBe(true)
    expect(readyForReview.canBuild).toBe(false)
    expect(accepted.canApprove).toBe(false)
  })

  test('allows build only from accepted or resumed execution states', () => {
    const accepted = deriveProjectPlanningSessionState(
      createSession({
        status: 'accepted',
        generatedPlan: createGeneratedPlan('accepted'),
      })
    )
    const executing = deriveProjectPlanningSessionState(
      createSession({
        status: 'executing',
        generatedPlan: createGeneratedPlan('executing'),
      })
    )
    const failed = deriveProjectPlanningSessionState(
      createSession({
        status: 'failed',
        generatedPlan: createGeneratedPlan('failed'),
      })
    )
    const partialCompatible = deriveProjectPlanningSessionState(
      createSession({
        status: 'partial',
        generatedPlan: createGeneratedPlan('accepted'),
      })
    )
    const completed = deriveProjectPlanningSessionState(
      createSession({
        status: 'completed',
        generatedPlan: createGeneratedPlan('completed'),
      })
    )
    const intake = deriveProjectPlanningSessionState(createSession())

    expect(accepted.canBuild).toBe(true)
    expect(executing.canBuild).toBe(true)
    expect(failed.canBuild).toBe(true)
    expect(partialCompatible.canBuild).toBe(true)
    expect(completed.canBuild).toBe(true)
    expect(intake.canBuild).toBe(false)
  })
})

describe('createProjectPlanningSessionActions', () => {
  test('guards startIntake when there is no active chat', () => {
    const actions = createProjectPlanningSessionActions({
      activeChatId: null,
      sessionId: null,
      mutations: {
        startIntake: async () => null,
        answerQuestion: async () => null,
        acceptPlan: async () => null,
        markExecutionState: async () => null,
        clearIntake: async () => null,
      },
    })

    expect(() => actions.startIntake(createQuestions())).toThrow(
      'Cannot start planning intake without an active chat'
    )
  })

  test('forwards session-scoped mutation payloads', async () => {
    const calls: Array<{ name: string; payload: unknown }> = []
    const actions = createProjectPlanningSessionActions({
      activeChatId: 'chat_1' as never,
      sessionId: 'planning_1',
      mutations: {
        startIntake: async (payload) => {
          calls.push({ name: 'startIntake', payload })
          return payload
        },
        answerQuestion: async (payload) => {
          calls.push({ name: 'answerQuestion', payload })
          return payload
        },
        acceptPlan: async (payload) => {
          calls.push({ name: 'acceptPlan', payload })
          return payload
        },
        markExecutionState: async (payload) => {
          calls.push({ name: 'markExecutionState', payload })
          return payload
        },
        clearIntake: async (payload) => {
          calls.push({ name: 'clearIntake', payload })
          return payload
        },
      },
    })

    await actions.startIntake(createQuestions())
    await actions.answerQuestion({
      questionId: 'outcome',
      freeformValue: 'Ship it',
      source: 'freeform',
    })
    await actions.acceptPlan()
    await actions.markExecutionState({ state: 'executing' })
    await actions.clearIntake()

    expect(calls).toEqual([
      {
        name: 'startIntake',
        payload: {
          chatId: 'chat_1',
          questions: createQuestions(),
        },
      },
      {
        name: 'answerQuestion',
        payload: {
          sessionId: 'planning_1',
          questionId: 'outcome',
          freeformValue: 'Ship it',
          source: 'freeform',
        },
      },
      {
        name: 'acceptPlan',
        payload: {
          sessionId: 'planning_1',
        },
      },
      {
        name: 'markExecutionState',
        payload: {
          sessionId: 'planning_1',
          state: 'executing',
        },
      },
      {
        name: 'clearIntake',
        payload: {
          sessionId: 'planning_1',
        },
      },
    ])
  })

  test('starts intake for an explicit chatId when the workflow creates a new architect chat', async () => {
    const calls: Array<{ name: string; payload: unknown }> = []
    const actions = createProjectPlanningSessionActions({
      activeChatId: null,
      sessionId: null,
      mutations: {
        startIntake: async (payload) => {
          calls.push({ name: 'startIntake', payload })
          return payload
        },
        answerQuestion: async () => null,
        acceptPlan: async () => null,
        markExecutionState: async () => null,
        clearIntake: async () => null,
      },
    })

    await actions.startIntakeForChat('chat_new' as never, createQuestions())

    expect(calls).toEqual([
      {
        name: 'startIntake',
        payload: {
          chatId: 'chat_new',
          questions: createQuestions(),
        },
      },
    ])
  })

  test('uses an explicit sessionId override for execution-state transitions', async () => {
    const calls: Array<{ name: string; payload: unknown }> = []
    const actions = createProjectPlanningSessionActions({
      activeChatId: 'chat_1' as never,
      sessionId: 'planning_current',
      mutations: {
        startIntake: async () => null,
        answerQuestion: async () => null,
        acceptPlan: async () => null,
        markExecutionState: async (payload) => {
          calls.push({ name: 'markExecutionState', payload })
          return payload
        },
        clearIntake: async () => null,
      },
    })

    await actions.markExecutionState({
      sessionId: 'planning_recorded',
      state: 'completed',
    })

    expect(calls).toEqual([
      {
        name: 'markExecutionState',
        payload: {
          state: 'completed',
          runId: undefined,
          sessionId: 'planning_recorded',
        },
      },
    ])
  })

  test('uses the bound sessionId for execution-state transitions when no override is provided', async () => {
    const calls: Array<{ name: string; payload: unknown }> = []
    const actions = createProjectPlanningSessionActions({
      activeChatId: 'chat_1' as never,
      sessionId: 'planning_bound',
      mutations: {
        startIntake: async () => null,
        answerQuestion: async () => null,
        acceptPlan: async () => null,
        markExecutionState: async (payload) => {
          calls.push({ name: 'markExecutionState', payload })
          return payload
        },
        clearIntake: async () => null,
      },
    })

    await actions.markExecutionState({ state: 'failed' })

    expect(calls).toEqual([
      {
        name: 'markExecutionState',
        payload: {
          state: 'failed',
          runId: undefined,
          sessionId: 'planning_bound',
        },
      },
    ])
  })
})
