import { describe, expect, it } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'
import {
  acceptPlanningSessionRecord,
  applyPlanningAnswer,
  answerPlanningQuestionRecord,
  buildStructuredPlanFromAnswers,
  completePlanningSessionRecord,
  createPlanningSessionRecord,
  markPlanningExecutionRecord,
  markPlanningSessionStaleRecord,
  serializeGeneratedPlanArtifact,
} from './planningSessions'

describe('planningSessions helpers', () => {
  it('creates intake sessions with ordered questions and drafting mirrors', () => {
    const record = createPlanningSessionRecord({
      chatId: 'chat_1' as Parameters<typeof createPlanningSessionRecord>[0]['chatId'],
      sessionId: 'planning_session_1',
      now: 123,
      questions: [
        {
          id: 'q-2',
          title: 'Second question',
          prompt: 'What should happen next?',
          suggestions: [{ id: 'b', label: 'B' }],
          allowFreeform: true,
          order: 2,
        },
        {
          id: 'q-1',
          title: 'First question',
          prompt: 'What are we building?',
          suggestions: [{ id: 'a', label: 'A', recommended: true }],
          allowFreeform: false,
          order: 1,
        },
      ],
    })

    expect(record.session.sessionId).toBe('planning_session_1')
    expect(record.session.status).toBe('intake')
    expect(record.session.questions.map((question) => question.id)).toEqual(['q-1', 'q-2'])
    expect(record.session.answers).toEqual([])
    expect(record.chatPatch).toMatchObject({
      planDraft: undefined,
      planStatus: 'drafting',
      planApprovedAt: undefined,
      planLastGeneratedAt: undefined,
      planBuildRunId: undefined,
      planUpdatedAt: 123,
      updatedAt: 123,
    })
  })

  it('replaces answers idempotently for each question', () => {
    const record = createPlanningSessionRecord({
      chatId: 'chat_1' as Parameters<typeof createPlanningSessionRecord>[0]['chatId'],
      sessionId: 'planning_session_1',
      now: 123,
      questions: [
        {
          id: 'q-1',
          title: 'Question one',
          prompt: 'Choose an option',
          suggestions: [{ id: 'a', label: 'A' }],
          allowFreeform: true,
          order: 1,
        },
        {
          id: 'q-2',
          title: 'Question two',
          prompt: 'Pick a second option',
          suggestions: [{ id: 'b', label: 'B' }],
          allowFreeform: true,
          order: 2,
        },
      ],
    })

    const answeredOnce = applyPlanningAnswer(record.session, {
      questionId: 'q-1',
      selectedOptionId: 'a',
      source: 'suggestion',
      answeredAt: 200,
    })
    const answeredTwice = applyPlanningAnswer(answeredOnce, {
      questionId: 'q-1',
      freeformValue: 'Use the custom path',
      source: 'freeform',
      answeredAt: 300,
    })
    const answeredOtherQuestion = applyPlanningAnswer(answeredTwice, {
      questionId: 'q-2',
      selectedOptionId: 'b',
      source: 'suggestion',
      answeredAt: 250,
    })

    expect(answeredOtherQuestion.answers).toEqual([
      {
        questionId: 'q-2',
        selectedOptionId: 'b',
        freeformValue: undefined,
        source: 'suggestion',
        answeredAt: 250,
      },
      {
        questionId: 'q-1',
        selectedOptionId: undefined,
        freeformValue: 'Use the custom path',
        source: 'freeform',
        answeredAt: 300,
      },
    ])
    expect(answeredOtherQuestion.updatedAt).toBe(250)
  })

  it('stores generated plans and mirrors them into the legacy chat fields', () => {
    const record = createPlanningSessionRecord({
      chatId: 'chat_1' as Parameters<typeof createPlanningSessionRecord>[0]['chatId'],
      sessionId: 'planning_session_1',
      now: 123,
      questions: [
        {
          id: 'q-1',
          title: 'Question one',
          prompt: 'Choose an option',
          suggestions: [{ id: 'a', label: 'A' }],
          allowFreeform: true,
          order: 1,
        },
      ],
    })

    const generatedPlan = {
      chatId: 'chat_1',
      sessionId: 'planning_session_1',
      title: 'Plan Title',
      summary: 'Short summary',
      markdown: '',
      sections: [
        { id: 'section-2', title: 'Implementation', content: 'Build it', order: 2 },
        { id: 'section-1', title: 'Goal', content: 'Ship it', order: 1 },
      ],
      acceptanceChecks: ['The plan is reviewable'],
      status: 'ready_for_review' as const,
      generatedAt: 456,
    }

    const next = completePlanningSessionRecord(record.session, generatedPlan, 789)

    expect(next.session.status).toBe('ready_for_review')
    expect(next.session.completedAt).toBe(789)
    expect(next.session.generatedPlan).toMatchObject({
      chatId: 'chat_1',
      sessionId: 'planning_session_1',
      status: 'ready_for_review',
      generatedAt: 456,
    })
    expect(next.chatPatch).toMatchObject({
      planDraft: serializeGeneratedPlanArtifact(generatedPlan),
      planStatus: 'awaiting_review',
      planSourceMessageId: 'planning_session_1',
      planApprovedAt: undefined,
      planLastGeneratedAt: 456,
      planBuildRunId: undefined,
      planUpdatedAt: 789,
      updatedAt: 789,
    })
  })

  it('builds a structured review-ready plan from completed intake answers', () => {
    const questions = [
      {
        id: 'outcome',
        title: 'Outcome',
        prompt: 'What outcome should Panda deliver?',
        suggestions: [{ id: 'smallest-viable-change', label: 'Ship the smallest viable change' }],
        allowFreeform: true,
        order: 10,
      },
      {
        id: 'scope',
        title: 'Scope',
        prompt: 'Which part of the system is in scope?',
        suggestions: [{ id: 'backend', label: 'Planning backend only' }],
        allowFreeform: true,
        order: 20,
      },
      {
        id: 'approach',
        title: 'Approach',
        prompt: 'How should the agent implement it?',
        suggestions: [{ id: 'incremental', label: 'Implement it incrementally' }],
        allowFreeform: true,
        order: 30,
      },
      {
        id: 'validation',
        title: 'Validation',
        prompt: 'How should the result be verified?',
        suggestions: [{ id: 'unit-tests', label: 'Run unit tests only' }],
        allowFreeform: true,
        order: 40,
      },
    ]
    const record = createPlanningSessionRecord({
      chatId: 'chat_1' as Parameters<typeof createPlanningSessionRecord>[0]['chatId'],
      sessionId: 'planning_session_1',
      now: 100,
      questions,
    })

    const completedAnswers = [
      {
        questionId: 'outcome',
        freeformValue: 'fix the final intake regression',
        source: 'freeform' as const,
        answeredAt: 101,
      },
      {
        questionId: 'scope',
        freeformValue: 'planning session backend and tests',
        source: 'freeform' as const,
        answeredAt: 102,
      },
      {
        questionId: 'approach',
        freeformValue: 'reuse the existing completion path with minimal changes',
        source: 'freeform' as const,
        answeredAt: 103,
      },
      {
        questionId: 'validation',
        selectedOptionId: 'unit-tests',
        source: 'suggestion' as const,
        answeredAt: 104,
      },
    ]

    const session = { ...record.session, answers: completedAnswers, updatedAt: 104 }
    const plan = buildStructuredPlanFromAnswers(session, 200)

    expect(plan.status).toBe('ready_for_review')
    expect(plan.title).toBe('Implementation plan for fix the final intake regression')
    expect(plan.summary).toContain('Target outcome: fix the final intake regression.')
    expect(plan.summary).toContain('Primary scope: planning session backend and tests.')
    expect(plan.sections.map((section) => section.title)).toEqual([
      'Outcome',
      'Scope',
      'Approach',
      'Validation',
    ])
    expect(plan.acceptanceChecks).toEqual([
      'Run focused unit tests for the planning completion flow.',
    ])
    expect(plan.markdown).toContain('## Validation')
    expect(plan.markdown).toContain('## Acceptance Checks')
  })

  it('final answer generates a review-ready plan artifact and awaiting_review mirror', () => {
    const record = createPlanningSessionRecord({
      chatId: 'chat_1' as Parameters<typeof createPlanningSessionRecord>[0]['chatId'],
      sessionId: 'planning_session_1',
      now: 100,
      questions: [
        {
          id: 'outcome',
          title: 'Outcome',
          prompt: 'What outcome should Panda deliver?',
          suggestions: [{ id: 'smallest-viable-change', label: 'Ship the smallest viable change' }],
          allowFreeform: true,
          order: 10,
        },
        {
          id: 'validation',
          title: 'Validation',
          prompt: 'How should the result be verified?',
          suggestions: [{ id: 'unit-tests', label: 'Run unit tests only' }],
          allowFreeform: true,
          order: 40,
        },
      ],
    })
    const partiallyAnswered = applyPlanningAnswer(record.session, {
      questionId: 'outcome',
      freeformValue: 'fix the regression safely',
      source: 'freeform',
      answeredAt: 101,
    })

    const result = answerPlanningQuestionRecord(partiallyAnswered, {
      questionId: 'validation',
      selectedOptionId: 'unit-tests',
      source: 'suggestion',
      answeredAt: 200,
    })

    expect(result.session.status).toBe('ready_for_review')
    expect(result.session.generatedPlan).toMatchObject({
      chatId: 'chat_1',
      sessionId: 'planning_session_1',
      status: 'ready_for_review',
      generatedAt: 200,
    })
    expect(result.completedSession?.chatPatch).toMatchObject({
      planStatus: 'awaiting_review',
      planSourceMessageId: 'planning_session_1',
      planLastGeneratedAt: 200,
    })
    expect(result.completedSession?.chatPatch.planDraft).toContain(
      '# Implementation plan for fix the regression safely'
    )
  })

  it('non-final answers still only update answers', () => {
    const record = createPlanningSessionRecord({
      chatId: 'chat_1' as Parameters<typeof createPlanningSessionRecord>[0]['chatId'],
      sessionId: 'planning_session_1',
      now: 100,
      questions: [
        {
          id: 'outcome',
          title: 'Outcome',
          prompt: 'What outcome should Panda deliver?',
          suggestions: [{ id: 'smallest-viable-change', label: 'Ship the smallest viable change' }],
          allowFreeform: true,
          order: 10,
        },
        {
          id: 'validation',
          title: 'Validation',
          prompt: 'How should the result be verified?',
          suggestions: [{ id: 'unit-tests', label: 'Run unit tests only' }],
          allowFreeform: true,
          order: 40,
        },
      ],
    })

    const result = answerPlanningQuestionRecord(record.session, {
      questionId: 'outcome',
      freeformValue: 'keep the fix minimal',
      source: 'freeform',
      answeredAt: 150,
    })

    expect(result.session.status).toBe('intake')
    expect(result.session.answers).toEqual([
      {
        questionId: 'outcome',
        selectedOptionId: undefined,
        freeformValue: 'keep the fix minimal',
        source: 'freeform',
        answeredAt: 150,
      },
    ])
    expect(result.session.generatedPlan).toBeUndefined()
    expect(result.completedSession).toBeUndefined()
  })

  it('accepts generated plans and preserves execution state transitions', () => {
    const generatedPlan = {
      chatId: 'chat_1',
      sessionId: 'planning_session_1',
      title: 'Plan Title',
      summary: 'Short summary',
      markdown: '# Existing markdown',
      sections: [],
      acceptanceChecks: [],
      status: 'ready_for_review' as const,
      generatedAt: 456,
    }
    const baseRecord = createPlanningSessionRecord({
      chatId: 'chat_1' as Parameters<typeof createPlanningSessionRecord>[0]['chatId'],
      sessionId: 'planning_session_1',
      now: 123,
      questions: [],
    })

    const readyForReviewSession: Parameters<typeof acceptPlanningSessionRecord>[0] = {
      ...baseRecord.session,
      status: 'ready_for_review',
      generatedPlan,
      completedAt: 456,
      acceptedAt: undefined,
      updatedAt: 456,
    }

    const accepted = acceptPlanningSessionRecord(readyForReviewSession, 789)

    expect(accepted.session.status).toBe('accepted')
    expect(accepted.session.generatedPlan).toMatchObject({
      status: 'accepted',
    })
    expect(accepted.session.acceptedAt).toBe(789)
    expect(accepted.chatPatch).toMatchObject({
      planStatus: 'approved',
      planApprovedAt: 789,
      planUpdatedAt: 789,
      updatedAt: 789,
    })

    const executing = markPlanningExecutionRecord(accepted.session, {
      state: 'executing',
      runId: 'run_1' as Parameters<typeof markPlanningExecutionRecord>[1]['runId'],
      now: 900,
    })

    expect(executing.session.status).toBe('executing')
    expect(executing.session.generatedPlan).toMatchObject({
      status: 'executing',
    })
    expect(executing.chatPatch).toMatchObject({
      planStatus: 'executing',
      planBuildRunId: 'run_1',
      planUpdatedAt: 900,
      updatedAt: 900,
    })

    const partial = markPlanningExecutionRecord(executing.session, {
      state: 'partial',
      now: 901,
    })

    expect(partial.session.status).toBe('executing')
    expect(partial.session.generatedPlan).toMatchObject({
      status: 'executing',
    })
    expect(partial.chatPatch).toMatchObject({
      planStatus: 'partial',
      planUpdatedAt: 901,
      updatedAt: 901,
    })
  })

  it('rejects execution transitions before a plan is accepted', () => {
    const baseRecord = createPlanningSessionRecord({
      chatId: 'chat_1' as Parameters<typeof createPlanningSessionRecord>[0]['chatId'],
      sessionId: 'planning_session_1',
      now: 123,
      questions: [],
    })
    const readyForReviewSession: Parameters<typeof markPlanningExecutionRecord>[0] = {
      ...baseRecord.session,
      status: 'ready_for_review',
      generatedPlan: {
        chatId: 'chat_1',
        sessionId: 'planning_session_1',
        title: 'Plan Title',
        summary: 'Short summary',
        markdown: '# Existing markdown',
        sections: [],
        acceptanceChecks: [],
        status: 'ready_for_review',
        generatedAt: 456,
      },
      completedAt: 456,
      acceptedAt: undefined,
      updatedAt: 456,
    }

    expect(() =>
      markPlanningExecutionRecord(readyForReviewSession, {
        state: 'executing',
        runId: 'run_1' as Parameters<typeof markPlanningExecutionRecord>[1]['runId'],
        now: 900,
      })
    ).toThrow('Planning sessions must be accepted before execution starts')
  })

  it('allows accepted plans to move directly into completed or failed states', () => {
    const baseRecord = createPlanningSessionRecord({
      chatId: 'chat_1' as Parameters<typeof createPlanningSessionRecord>[0]['chatId'],
      sessionId: 'planning_session_1',
      now: 123,
      questions: [],
    })
    const acceptedSession: Parameters<typeof markPlanningExecutionRecord>[0] = {
      ...baseRecord.session,
      status: 'accepted' as const,
      generatedPlan: {
        chatId: 'chat_1',
        sessionId: 'planning_session_1',
        title: 'Plan Title',
        summary: 'Short summary',
        markdown: '# Existing markdown',
        sections: [],
        acceptanceChecks: [],
        status: 'accepted' as const,
        generatedAt: 456,
      },
      completedAt: 456,
      acceptedAt: 789,
      updatedAt: 789,
    }

    const completed = markPlanningExecutionRecord(acceptedSession, {
      state: 'completed',
      now: 901,
    })
    const failed = markPlanningExecutionRecord(acceptedSession, {
      state: 'failed',
      now: 902,
    })

    expect(completed.session.status).toBe('completed')
    expect(completed.session.generatedPlan).toMatchObject({ status: 'completed' })
    expect(completed.session.completedAt).toBe(901)
    expect(completed.chatPatch).toMatchObject({
      planStatus: 'completed',
      planUpdatedAt: 901,
      updatedAt: 901,
    })

    expect(failed.session.status).toBe('failed')
    expect(failed.session.generatedPlan).toMatchObject({ status: 'failed' })
    expect(failed.session.completedAt).toBe(902)
    expect(failed.chatPatch).toMatchObject({
      planStatus: 'failed',
      planUpdatedAt: 902,
      updatedAt: 902,
    })
  })

  it('marks superseded planning sessions as stale', () => {
    const record = createPlanningSessionRecord({
      chatId: 'chat_1' as Parameters<typeof createPlanningSessionRecord>[0]['chatId'],
      sessionId: 'planning_session_1',
      now: 123,
      questions: [
        {
          id: 'q-1',
          title: 'Question one',
          prompt: 'Choose an option',
          suggestions: [{ id: 'a', label: 'A' }],
          allowFreeform: true,
          order: 1,
        },
      ],
    })

    const stale = markPlanningSessionStaleRecord(
      {
        ...record.session,
        status: 'accepted',
        completedAt: undefined,
        updatedAt: 123,
      },
      999
    )

    expect(stale.status).toBe('stale')
    expect(stale.completedAt).toBe(999)
    expect(stale.updatedAt).toBe(999)
    expect(stale.answers).toEqual([])
  })
})

describe('planningSessions source surface', () => {
  it('exposes the required mutation and cleanup entrypoints', () => {
    const planningSource = fs.readFileSync(
      path.resolve(import.meta.dir, 'planningSessions.ts'),
      'utf8'
    )
    const chatsSource = fs.readFileSync(path.resolve(import.meta.dir, 'chats.ts'), 'utf8')
    const schemaSource = fs.readFileSync(path.resolve(import.meta.dir, 'schema.ts'), 'utf8')

    expect(planningSource).toContain('export const getActiveByChat = query({')
    expect(planningSource).toContain('export const startIntake = mutation({')
    expect(planningSource).toContain('export const answerQuestion = mutation({')
    expect(planningSource).toContain('export const clearIntake = mutation({')
    expect(planningSource).toContain('export const completeIntake = mutation({')
    expect(planningSource).toContain('export const acceptPlan = mutation({')
    expect(planningSource).toContain('export const markExecutionState = mutation({')
    expect(planningSource).toContain("withIndex('by_sessionId'")
    expect(planningSource).toContain('await retireOlderPlanningSessions(ctx, {')
    expect(planningSource).toContain("status: 'stale'")
    expect(schemaSource).toContain(".index('by_sessionId', ['sessionId'])")
    expect(chatsSource).toContain("query('planningSessions')")
    expect(chatsSource).toContain('await ctx.db.delete(planningSession._id)')
  })
})
