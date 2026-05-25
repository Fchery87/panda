import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { requireChatOwner, requireProjectOwner } from './lib/authz'

const QuestionAnswer = v.object({
  questionId: v.string(),
  value: v.union(v.string(), v.array(v.string())),
  source: v.union(v.literal('option'), v.literal('other')),
})

export const listByChat = query({
  args: { chatId: v.id('chats') },
  handler: async (ctx, args) => {
    await requireChatOwner(ctx, args.chatId)
    return await ctx.db
      .query('agentRunQuestions')
      .withIndex('by_chat_created', (q) => q.eq('chatId', args.chatId))
      .order('desc')
      .take(100)
  },
})

export const latestPendingByRun = query({
  args: { runId: v.id('agentRuns') },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId)
    if (!run) throw new Error('Agent run not found')
    await requireChatOwner(ctx, run.chatId)
    return (
      await ctx.db
        .query('agentRunQuestions')
        .withIndex('by_run_status_created', (q) =>
          q.eq('runId', args.runId).eq('status', 'pending')
        )
        .order('desc')
        .take(1)
    )[0] ?? null
  },
})

export const createPending = mutation({
  args: {
    projectId: v.id('projects'),
    chatId: v.id('chats'),
    runId: v.id('agentRuns'),
    harnessSessionID: v.string(),
    request: v.any(),
  },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    await requireChatOwner(ctx, args.chatId)
    const run = await ctx.db.get(args.runId)
    if (!run || run.chatId !== args.chatId || run.projectId !== args.projectId) {
      throw new Error('Agent run does not belong to this chat/project')
    }

    const now = Date.now()
    const existing = await ctx.db
      .query('agentRunQuestions')
      .withIndex('by_run_status_created', (q) =>
        q.eq('runId', args.runId).eq('status', 'pending')
      )
      .order('desc')
      .first()
    if (existing) return existing._id

    const id = await ctx.db.insert('agentRunQuestions', {
      projectId: args.projectId,
      chatId: args.chatId,
      runId: args.runId,
      harnessSessionID: args.harnessSessionID,
      request: args.request,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    })
    await ctx.db.insert('agentRunEvents', {
      runId: args.runId,
      chatId: args.chatId,
      sequence: 10_000 + now,
      type: 'ask_user_pending',
      status: 'pending',
      progressCategory: 'analysis',
      content: 'Panda is waiting for a structured user decision.',
      createdAt: now,
    })
    return id
  },
})

export const answer = mutation({
  args: {
    id: v.id('agentRunQuestions'),
    answers: v.array(QuestionAnswer),
  },
  handler: async (ctx, args) => {
    const question = await ctx.db.get(args.id)
    if (!question) throw new Error('Agent run question not found')
    await requireChatOwner(ctx, question.chatId)
    if (question.status !== 'pending') {
      throw new Error(`Agent run question is already ${question.status}`)
    }
    const now = Date.now()
    await ctx.db.patch(args.id, {
      status: 'answered',
      answers: args.answers,
      answeredAt: now,
      updatedAt: now,
    })
    await ctx.db.insert('agentRunEvents', {
      runId: question.runId,
      chatId: question.chatId,
      sequence: 10_000 + now,
      type: 'ask_user_answered',
      status: 'answered',
      progressCategory: 'analysis',
      content: 'Structured user decision answered; runtime may continue.',
      createdAt: now,
    })
    return args.id
  },
})

export const updateStatus = mutation({
  args: {
    id: v.id('agentRunQuestions'),
    status: v.union(v.literal('cancelled'), v.literal('expired')),
  },
  handler: async (ctx, args) => {
    const question = await ctx.db.get(args.id)
    if (!question) throw new Error('Agent run question not found')
    await requireChatOwner(ctx, question.chatId)
    await ctx.db.patch(args.id, { status: args.status, updatedAt: Date.now() })
    return args.id
  },
})
