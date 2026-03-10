import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { requireProjectOwner } from './lib/authz'

/**
 * Save a session summary for a chat
 */
export const save = mutation({
  args: {
    projectId: v.id('projects'),
    chatId: v.id('chats'),
    summary: v.string(),
    structured: v.optional(v.record(v.string(), v.any())),
    tokenCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    const now = Date.now()

    return await ctx.db.insert('sessionSummaries', {
      projectId: args.projectId,
      chatId: args.chatId,
      summary: args.summary,
      structured: args.structured,
      tokenCount: args.tokenCount,
      createdAt: now,
    })
  },
})

/**
 * Get the most recent session summary for a project
 */
export const getLatest = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)

    const summary = await ctx.db
      .query('sessionSummaries')
      .withIndex('by_project_created', (q) => q.eq('projectId', args.projectId))
      .order('desc')
      .first()

    return summary ?? null
  },
})

/**
 * Get the most recent session summary for a specific chat
 */
export const getLatestForChat = query({
  args: { chatId: v.id('chats') },
  handler: async (ctx, args) => {
    const chat = await ctx.db.get(args.chatId)
    if (!chat) return null

    await requireProjectOwner(ctx, chat.projectId)

    const summary = await ctx.db
      .query('sessionSummaries')
      .withIndex('by_chat', (q) => q.eq('chatId', args.chatId))
      .order('desc')
      .first()

    return summary ?? null
  },
})

/**
 * List all session summaries for a project
 */
export const listByProject = query({
  args: {
    projectId: v.id('projects'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)

    return await ctx.db
      .query('sessionSummaries')
      .withIndex('by_project_created', (q) => q.eq('projectId', args.projectId))
      .order('desc')
      .take(args.limit ?? 50)
  },
})

/**
 * Delete a session summary
 */
export const remove = mutation({
  args: { id: v.id('sessionSummaries') },
  handler: async (ctx, args) => {
    const summary = await ctx.db.get(args.id)
    if (!summary) return

    await requireProjectOwner(ctx, summary.projectId)
    await ctx.db.delete(args.id)
  },
})
