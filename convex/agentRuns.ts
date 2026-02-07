import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

export const create = mutation({
  args: {
    projectId: v.id('projects'),
    chatId: v.id('chats'),
    userId: v.id('users'),
    mode: v.union(v.literal('discuss'), v.literal('build')),
    provider: v.optional(v.string()),
    model: v.optional(v.string()),
    userMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const startedAt = Date.now()
    return await ctx.db.insert('agentRuns', {
      projectId: args.projectId,
      chatId: args.chatId,
      userId: args.userId,
      mode: args.mode,
      provider: args.provider,
      model: args.model,
      userMessage: args.userMessage,
      status: 'running',
      startedAt,
    })
  },
})

export const appendEvents = mutation({
  args: {
    runId: v.id('agentRuns'),
    events: v.array(
      v.object({
        sequence: v.number(),
        type: v.string(),
        content: v.optional(v.string()),
        status: v.optional(v.string()),
        progressCategory: v.optional(v.string()),
        progressToolName: v.optional(v.string()),
        progressHasArtifactTarget: v.optional(v.boolean()),
        targetFilePaths: v.optional(v.array(v.string())),
        toolCallId: v.optional(v.string()),
        toolName: v.optional(v.string()),
        args: v.optional(v.record(v.string(), v.any())),
        output: v.optional(v.string()),
        error: v.optional(v.string()),
        durationMs: v.optional(v.number()),
        usage: v.optional(v.record(v.string(), v.any())),
      })
    ),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId)
    if (!run) throw new Error('Run not found')

    const createdAt = Date.now()
    const insertedIds = []
    for (const event of args.events) {
      const id = await ctx.db.insert('agentRunEvents', {
        runId: args.runId,
        chatId: run.chatId,
        sequence: event.sequence,
        type: event.type,
        content: event.content,
        status: event.status,
        progressCategory: event.progressCategory,
        progressToolName: event.progressToolName,
        progressHasArtifactTarget: event.progressHasArtifactTarget,
        targetFilePaths: event.targetFilePaths,
        toolCallId: event.toolCallId,
        toolName: event.toolName,
        args: event.args,
        output: event.output,
        error: event.error,
        durationMs: event.durationMs,
        usage: event.usage,
        createdAt,
      })
      insertedIds.push(id)
    }

    return insertedIds
  },
})

export const complete = mutation({
  args: {
    runId: v.id('agentRuns'),
    summary: v.optional(v.string()),
    usage: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId)
    if (!run) throw new Error('Run not found')

    const completedAt = Date.now()
    await ctx.db.patch(args.runId, {
      status: 'completed',
      summary: args.summary,
      usage: args.usage,
      completedAt,
    })

    return args.runId
  },
})

export const fail = mutation({
  args: {
    runId: v.id('agentRuns'),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId)
    if (!run) throw new Error('Run not found')

    await ctx.db.patch(args.runId, {
      status: 'failed',
      error: args.error,
      completedAt: Date.now(),
    })

    return args.runId
  },
})

export const stop = mutation({
  args: {
    runId: v.id('agentRuns'),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId)
    if (!run) throw new Error('Run not found')
    if (run.status !== 'running') return args.runId

    await ctx.db.patch(args.runId, {
      status: 'stopped',
      completedAt: Date.now(),
    })

    return args.runId
  },
})

export const listByChat = query({
  args: {
    chatId: v.id('chats'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 20, 200))
    return await ctx.db
      .query('agentRuns')
      .withIndex('by_chat_started', (q) => q.eq('chatId', args.chatId))
      .order('desc')
      .take(limit)
  },
})

export const listEventsByChat = query({
  args: {
    chatId: v.id('chats'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 100, 500))
    const events = await ctx.db
      .query('agentRunEvents')
      .withIndex('by_chat_created', (q) => q.eq('chatId', args.chatId))
      .order('desc')
      .take(limit)

    return events.reverse()
  },
})
