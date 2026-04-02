import { mutation, query } from './_generated/server'
import type { MutationCtx, QueryCtx } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import { v } from 'convex/values'
import {
  GeneratedPlanArtifact as GeneratedPlanArtifactValidator,
  PlanningQuestion as PlanningQuestionValidator,
} from './schema'
import type {
  GeneratedPlanArtifact,
  PlanningAnswer,
  PlanningOption,
  PlanningQuestion,
} from '../apps/web/lib/planning/types'
import { requireChatOwner } from './lib/authz'

type PlanningSessionStatus =
  | 'intake'
  | 'generating'
  | 'ready_for_review'
  | 'accepted'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'stale'
  | 'partial'
type PlanningExecutionState = 'executing' | 'completed' | 'failed' | 'partial'
type PlanningSessionDoc = Doc<'planningSessions'>
type PlanningChatMirror = Pick<
  Doc<'chats'>,
  | 'planDraft'
  | 'planStatus'
  | 'planSourceMessageId'
  | 'planApprovedAt'
  | 'planLastGeneratedAt'
  | 'planBuildRunId'
  | 'planUpdatedAt'
  | 'updatedAt'
>

type PlanningSessionWithMirror = {
  session: PlanningSessionDoc
  chatPatch: Partial<PlanningChatMirror>
}

const TERMINAL_STATUSES: ReadonlySet<PlanningSessionStatus> = new Set([
  'completed',
  'failed',
  'stale',
])

function isTerminalPlanningSessionStatus(status: PlanningSessionStatus): boolean {
  return TERMINAL_STATUSES.has(status)
}

function serializeGeneratedPlanArtifact(artifact: GeneratedPlanArtifact): string {
  const markdown = artifact.markdown.trim()
  if (markdown) return markdown

  const sections = [...artifact.sections].sort((a, b) => a.order - b.order)
  const lines = [`# ${artifact.title}`]

  if (artifact.summary.trim()) {
    lines.push('', artifact.summary.trim())
  }

  for (const section of sections) {
    lines.push('', `## ${section.title}`, section.content.trim())
  }

  if (artifact.acceptanceChecks.length > 0) {
    lines.push('', '## Acceptance Checks')
    for (const check of artifact.acceptanceChecks) {
      lines.push(`- ${check}`)
    }
  }

  return lines.join('\n').trim()
}

function buildIntakeChatPatch(now: number): Partial<PlanningChatMirror> {
  return {
    planDraft: undefined,
    planStatus: 'drafting',
    planSourceMessageId: undefined,
    planApprovedAt: undefined,
    planLastGeneratedAt: undefined,
    planBuildRunId: undefined,
    planUpdatedAt: now,
    updatedAt: now,
  }
}

function buildGeneratedChatPatch(
  generatedPlan: GeneratedPlanArtifact,
  now: number
): Partial<PlanningChatMirror> {
  return {
    planDraft: serializeGeneratedPlanArtifact(generatedPlan),
    planStatus: 'awaiting_review',
    planSourceMessageId: generatedPlan.sessionId,
    planApprovedAt: undefined,
    planLastGeneratedAt: generatedPlan.generatedAt,
    planBuildRunId: undefined,
    planUpdatedAt: now,
    updatedAt: now,
  }
}

function buildAcceptedChatPatch(now: number): Partial<PlanningChatMirror> {
  return {
    planStatus: 'approved',
    planApprovedAt: now,
    planUpdatedAt: now,
    updatedAt: now,
  }
}

function buildExecutionChatPatch(args: {
  state: PlanningExecutionState
  runId?: Id<'agentRuns'>
  now: number
}): Partial<PlanningChatMirror> {
  const patch: Partial<PlanningChatMirror> = {
    planStatus: args.state,
    planUpdatedAt: args.now,
    updatedAt: args.now,
  }

  if (args.state === 'executing' && args.runId) {
    patch.planBuildRunId = args.runId
  }

  return patch
}

function createPlanningSessionRecord(args: {
  chatId: Id<'chats'>
  sessionId: string
  questions: Array<{
    id: string
    title: string
    prompt: string
    suggestions: PlanningOption[]
    allowFreeform: boolean
    order: number
  }>
  now: number
}): PlanningSessionWithMirror {
  const questions = [...args.questions].sort(
    (a, b) => a.order - b.order || a.id.localeCompare(b.id)
  )

  const session: PlanningSessionDoc = {
    _id: args.sessionId as Id<'planningSessions'>,
    _creationTime: args.now,
    chatId: args.chatId,
    sessionId: args.sessionId,
    status: 'intake',
    questions,
    answers: [],
    generatedPlan: undefined,
    startedAt: args.now,
    completedAt: undefined,
    acceptedAt: undefined,
    updatedAt: args.now,
  }

  return {
    session,
    chatPatch: buildIntakeChatPatch(args.now),
  }
}

function markPlanningSessionStaleRecord(
  session: PlanningSessionDoc,
  now: number
): PlanningSessionDoc {
  return {
    ...session,
    status: 'stale',
    completedAt: now,
    updatedAt: now,
  }
}

function applyPlanningAnswer(
  session: PlanningSessionDoc,
  args: {
    questionId: string
    selectedOptionId?: string
    freeformValue?: string
    source: PlanningAnswer['source']
    answeredAt: number
  }
): PlanningSessionDoc {
  const nextAnswer: PlanningAnswer = {
    questionId: args.questionId,
    selectedOptionId: args.selectedOptionId,
    freeformValue: args.freeformValue,
    source: args.source,
    answeredAt: args.answeredAt,
  }

  const nextAnswers = session.answers.filter((answer) => answer.questionId !== args.questionId)
  nextAnswers.push(nextAnswer)
  nextAnswers.sort((a, b) => a.answeredAt - b.answeredAt)

  return {
    ...session,
    answers: nextAnswers,
    updatedAt: args.answeredAt,
  }
}

function completePlanningSessionRecord(
  session: PlanningSessionDoc,
  generatedPlan: GeneratedPlanArtifact,
  now: number
): PlanningSessionWithMirror {
  return {
    session: {
      ...session,
      status: 'ready_for_review',
      generatedPlan,
      completedAt: now,
      updatedAt: now,
    },
    chatPatch: buildGeneratedChatPatch(generatedPlan, now),
  }
}

function acceptPlanningSessionRecord(
  session: PlanningSessionDoc,
  now: number
): PlanningSessionWithMirror {
  const nextGeneratedPlan = session.generatedPlan
    ? { ...session.generatedPlan, status: 'accepted' as const }
    : session.generatedPlan

  return {
    session: {
      ...session,
      status: 'accepted',
      generatedPlan: nextGeneratedPlan,
      acceptedAt: now,
      updatedAt: now,
    },
    chatPatch: buildAcceptedChatPatch(now),
  }
}

function markPlanningExecutionRecord(
  session: PlanningSessionDoc,
  args: {
    state: PlanningExecutionState
    runId?: Id<'agentRuns'>
    now: number
  }
): PlanningSessionWithMirror {
  const nextStatus = args.state === 'partial' ? session.status : args.state
  const nextGeneratedPlan =
    args.state === 'partial'
      ? session.generatedPlan
      : session.generatedPlan
        ? {
            ...session.generatedPlan,
            status: args.state,
          }
        : session.generatedPlan

  return {
    session: {
      ...session,
      status: nextStatus,
      generatedPlan: nextGeneratedPlan,
      completedAt:
        args.state === 'completed' || args.state === 'failed' ? args.now : session.completedAt,
      updatedAt: args.now,
    },
    chatPatch: buildExecutionChatPatch(args),
  }
}

async function getPlanningSessionOrThrow(
  ctx: { db: QueryCtx['db'] },
  sessionId: string
): Promise<PlanningSessionDoc> {
  const session = await ctx.db
    .query('planningSessions')
    .withIndex('by_sessionId', (q) => q.eq('sessionId', sessionId))
    .take(1)
    .then((sessions) => sessions[0] ?? null)
  if (!session) {
    throw new Error('Planning session not found')
  }
  return session
}

async function retireOlderPlanningSessions(
  ctx: { db: MutationCtx['db'] },
  args: { chatId: Id<'chats'>; keepSessionId: string; now: number }
): Promise<void> {
  const sessions = await ctx.db
    .query('planningSessions')
    .withIndex('by_chat', (q) => q.eq('chatId', args.chatId))
    .collect()

  const outdatedSessions = sessions.filter(
    (session) =>
      session.sessionId !== args.keepSessionId && !isTerminalPlanningSessionStatus(session.status)
  )

  for (const session of outdatedSessions) {
    const staleSession = markPlanningSessionStaleRecord(session, args.now)
    await ctx.db.patch(session._id, {
      status: staleSession.status,
      completedAt: staleSession.completedAt,
      updatedAt: staleSession.updatedAt,
    })
  }
}

async function patchChatMirror(
  ctx: {
    db: {
      patch: (id: Id<'chats'>, updates: Partial<PlanningChatMirror>) => Promise<void>
    }
  },
  chatId: Id<'chats'>,
  chatPatch: Partial<PlanningChatMirror>
): Promise<void> {
  await ctx.db.patch(chatId, chatPatch)
}

export const getActiveByChat = query({
  args: { chatId: v.id('chats') },
  handler: async (ctx, args) => {
    await requireChatOwner(ctx, args.chatId)

    const sessions = await ctx.db
      .query('planningSessions')
      .withIndex('by_updated', (q) => q.eq('chatId', args.chatId))
      .order('desc')
      .take(20)

    return sessions.find((session) => !isTerminalPlanningSessionStatus(session.status)) ?? null
  },
})

export const startIntake = mutation({
  args: {
    chatId: v.id('chats'),
    questions: v.array(PlanningQuestionValidator),
  },
  handler: async (ctx, args) => {
    const { chat } = await requireChatOwner(ctx, args.chatId)
    const now = Date.now()
    const sessionId = `planning_${now.toString(36)}_${Math.random().toString(36).slice(2, 10)}`

    const record = createPlanningSessionRecord({
      chatId: args.chatId,
      sessionId,
      questions: args.questions,
      now,
    })

    await ctx.db.insert('planningSessions', {
      chatId: record.session.chatId,
      sessionId: record.session.sessionId,
      status: record.session.status,
      questions: record.session.questions,
      answers: record.session.answers,
      generatedPlan: record.session.generatedPlan,
      startedAt: record.session.startedAt,
      completedAt: record.session.completedAt,
      acceptedAt: record.session.acceptedAt,
      updatedAt: record.session.updatedAt,
    })

    await retireOlderPlanningSessions(ctx, {
      chatId: args.chatId,
      keepSessionId: sessionId,
      now,
    })

    await patchChatMirror(ctx, chat._id, record.chatPatch)
    return sessionId
  },
})

export const answerQuestion = mutation({
  args: {
    sessionId: v.string(),
    questionId: v.string(),
    selectedOptionId: v.optional(v.string()),
    freeformValue: v.optional(v.string()),
    source: v.union(v.literal('suggestion'), v.literal('freeform')),
  },
  handler: async (ctx, args) => {
    const session = await getPlanningSessionOrThrow(ctx, args.sessionId)
    await requireChatOwner(ctx, session.chatId)

    const question = session.questions.find((entry) => entry.id === args.questionId)
    if (!question) {
      throw new Error('Question not found in this planning session')
    }
    if (args.source === 'suggestion' && !args.selectedOptionId) {
      throw new Error('selectedOptionId is required for suggestion answers')
    }
    if (
      args.source === 'suggestion' &&
      !question.suggestions.some((option) => option.id === args.selectedOptionId)
    ) {
      throw new Error('selectedOptionId is not valid for this question')
    }
    if (args.source === 'freeform' && !args.freeformValue?.trim()) {
      throw new Error('freeformValue is required for freeform answers')
    }

    const nextSession = applyPlanningAnswer(session, {
      questionId: args.questionId,
      selectedOptionId: args.selectedOptionId,
      freeformValue: args.freeformValue?.trim(),
      source: args.source,
      answeredAt: Date.now(),
    })

    await ctx.db.patch(session._id, {
      answers: nextSession.answers,
      updatedAt: nextSession.updatedAt,
    })

    return args.sessionId
  },
})

export const clearIntake = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const session = await getPlanningSessionOrThrow(ctx, args.sessionId)
    const { chat } = await requireChatOwner(ctx, session.chatId)
    const now = Date.now()

    await ctx.db.patch(session._id, {
      status: 'failed',
      answers: [],
      generatedPlan: undefined,
      completedAt: now,
      acceptedAt: undefined,
      updatedAt: now,
    })

    await patchChatMirror(ctx, chat._id, {
      planDraft: undefined,
      planStatus: 'idle',
      planSourceMessageId: undefined,
      planApprovedAt: undefined,
      planLastGeneratedAt: undefined,
      planBuildRunId: undefined,
      planUpdatedAt: now,
      updatedAt: now,
    })

    return args.sessionId
  },
})

export const completeIntake = mutation({
  args: {
    sessionId: v.string(),
    generatedPlan: GeneratedPlanArtifactValidator,
  },
  handler: async (ctx, args) => {
    const session = await getPlanningSessionOrThrow(ctx, args.sessionId)
    const { chat } = await requireChatOwner(ctx, session.chatId)
    const now = Date.now()

    if (args.generatedPlan.chatId !== session.chatId) {
      throw new Error('Generated plan chatId does not match the planning session')
    }
    if (args.generatedPlan.sessionId !== session.sessionId) {
      throw new Error('Generated plan sessionId does not match the planning session')
    }

    const nextSession = completePlanningSessionRecord(session, args.generatedPlan, now)

    await ctx.db.patch(session._id, {
      status: nextSession.session.status,
      generatedPlan: nextSession.session.generatedPlan,
      completedAt: nextSession.session.completedAt,
      updatedAt: nextSession.session.updatedAt,
    })

    await patchChatMirror(ctx, chat._id, nextSession.chatPatch)
    return args.sessionId
  },
})

export const acceptPlan = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const session = await getPlanningSessionOrThrow(ctx, args.sessionId)
    const { chat } = await requireChatOwner(ctx, session.chatId)
    const now = Date.now()

    if (!session.generatedPlan) {
      throw new Error('Cannot accept a plan before it is generated')
    }

    const nextSession = acceptPlanningSessionRecord(session, now)

    await ctx.db.patch(session._id, {
      status: nextSession.session.status,
      generatedPlan: nextSession.session.generatedPlan,
      acceptedAt: nextSession.session.acceptedAt,
      updatedAt: nextSession.session.updatedAt,
    })

    await patchChatMirror(ctx, chat._id, nextSession.chatPatch)
    return args.sessionId
  },
})

export const markExecutionState = mutation({
  args: {
    sessionId: v.string(),
    state: v.union(
      v.literal('executing'),
      v.literal('completed'),
      v.literal('failed'),
      v.literal('partial')
    ),
    runId: v.optional(v.id('agentRuns')),
  },
  handler: async (ctx, args) => {
    const session = await getPlanningSessionOrThrow(ctx, args.sessionId)
    const { chat } = await requireChatOwner(ctx, session.chatId)
    const now = Date.now()

    if (!session.generatedPlan && args.state !== 'partial') {
      throw new Error('Cannot update execution state before a plan is generated')
    }

    const nextSession = markPlanningExecutionRecord(
      {
        ...session,
        status: args.state === 'partial' ? session.status : args.state,
        updatedAt: now,
      },
      { state: args.state, runId: args.runId, now }
    )

    await ctx.db.patch(session._id, {
      status: nextSession.session.status,
      generatedPlan: nextSession.session.generatedPlan,
      completedAt: nextSession.session.completedAt,
      updatedAt: nextSession.session.updatedAt,
    })

    await patchChatMirror(ctx, chat._id, nextSession.chatPatch)
    return args.sessionId
  },
})

export {
  acceptPlanningSessionRecord,
  applyPlanningAnswer,
  buildGeneratedChatPatch,
  buildIntakeChatPatch,
  completePlanningSessionRecord,
  createPlanningSessionRecord,
  isTerminalPlanningSessionStatus,
  markPlanningExecutionRecord,
  markPlanningSessionStaleRecord,
  serializeGeneratedPlanArtifact,
}
