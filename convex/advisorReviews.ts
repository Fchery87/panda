import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { AdvisorReviewFinding, AdvisorReviewStatus } from './schema'
import { requireChatOwner, requireProjectOwner } from './lib/authz'

export const listByChat = query({
  args: { chatId: v.id('chats') },
  handler: async (ctx, args) => {
    await requireChatOwner(ctx, args.chatId)
    return await ctx.db
      .query('advisorReviews')
      .withIndex('by_chat_created', (q) => q.eq('chatId', args.chatId))
      .order('desc')
      .take(100)
  },
})

export const latestForRun = query({
  args: { runId: v.id('agentRuns') },
  handler: async (ctx, args) => {
    const reviews = await ctx.db
      .query('advisorReviews')
      .withIndex('by_run_created', (q) => q.eq('runId', args.runId))
      .order('desc')
      .take(1)
    const review = reviews[0]
    if (!review) return null
    await requireChatOwner(ctx, review.chatId)
    return review
  },
})

export const create = mutation({
  args: {
    projectId: v.id('projects'),
    chatId: v.id('chats'),
    runId: v.optional(v.id('agentRuns')),
    artifactId: v.optional(v.id('artifacts')),
    workflowArtifactId: v.optional(v.id('workflowArtifacts')),
    gates: v.array(v.string()),
    status: AdvisorReviewStatus,
    summary: v.string(),
    risks: v.array(AdvisorReviewFinding),
    reviewer: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    await requireChatOwner(ctx, args.chatId)
    const now = Date.now()
    return await ctx.db.insert('advisorReviews', {
      ...args,
      summary: args.summary.trim(),
      createdAt: now,
      updatedAt: now,
    })
  },
})
