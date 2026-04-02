import { describe, expect, it } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'
import {
  acceptPlanningSessionRecord,
  applyPlanningAnswer,
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

    const accepted = acceptPlanningSessionRecord(
      {
        chatId: 'chat_1' as Parameters<typeof createPlanningSessionRecord>[0]['chatId'],
        sessionId: 'planning_session_1',
        status: 'ready_for_review',
        questions: [],
        answers: [],
        generatedPlan,
        startedAt: 123,
        completedAt: 456,
        acceptedAt: undefined,
        updatedAt: 456,
      },
      789
    )

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

    const executing = markPlanningExecutionRecord(
      {
        ...accepted.session,
        status: 'executing',
      },
      {
        state: 'executing',
        runId: 'run_1' as Parameters<typeof markPlanningExecutionRecord>[1]['runId'],
        now: 900,
      }
    )

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

    const partial = markPlanningExecutionRecord(
      {
        ...executing.session,
        status: 'executing',
      },
      {
        state: 'partial',
        now: 901,
      }
    )

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
