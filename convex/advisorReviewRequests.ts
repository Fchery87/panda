import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { AdvisorReviewFinding, AdvisorReviewStatus, TokenUsage } from './schema'
import { requireChatOwner, requireProjectOwner } from './lib/authz'

export const listByChat = query({
  args: { chatId: v.id('chats') },
  handler: async (ctx, args) => {
    await requireChatOwner(ctx, args.chatId)
    return await ctx.db
      .query('advisorReviewRequests')
      .withIndex('by_chat_created', (q) => q.eq('chatId', args.chatId))
      .order('desc')
      .take(100)
  },
})

export const create = mutation({
  args: {
    projectId: v.id('projects'),
    chatId: v.id('chats'),
    artifactId: v.optional(v.id('artifacts')),
    workflowArtifactId: v.optional(v.id('workflowArtifacts')),
    runId: v.optional(v.id('agentRuns')),
    gates: v.array(v.string()),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    await requireChatOwner(ctx, args.chatId)
    const now = Date.now()
    return await ctx.db.insert('advisorReviewRequests', {
      ...args,
      prompt: args.prompt.trim(),
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const startReviewerRun = mutation({
  args: {
    id: v.id('advisorReviewRequests'),
    provider: v.optional(v.string()),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.id)
    if (!request) throw new Error('Advisor review request not found')
    const { userId } = await requireProjectOwner(ctx, request.projectId)
    await requireChatOwner(ctx, request.chatId)
    if (request.reviewerRunId) return request.reviewerRunId
    const now = Date.now()
    const reviewerRunId = await ctx.db.insert('agentRuns', {
      projectId: request.projectId,
      chatId: request.chatId,
      userId,
      mode: 'ask',
      provider: args.provider,
      model: args.model,
      status: 'running',
      userMessage: request.prompt.slice(0, 500),
      runKind: 'subagent',
      subagentName: 'advisor-reviewer',
      subagentDepth: 1,
      contextMode: 'fresh',
      isolationMode: 'shared-readonly',
      delegatedTaskSummary: `Advisor review: ${request.gates.join(', ')}`.slice(0, 500),
      outputMode: 'inline',
      artifactCount: 0,
      lastActivityAt: now,
      startedAt: now,
    })
    await ctx.db.insert('agentRunEvents', {
      runId: reviewerRunId,
      chatId: request.chatId,
      sequence: 1,
      type: 'advisor_review_started',
      status: 'running',
      progressCategory: 'analysis',
      content: `Advisor-reviewer started for gates: ${request.gates.join(', ')}`,
      createdAt: now,
    })
    await ctx.db.patch(args.id, { reviewerRunId, updatedAt: now })
    return reviewerRunId
  },
})

export const completeWithReview = mutation({
  args: {
    id: v.id('advisorReviewRequests'),
    status: AdvisorReviewStatus,
    summary: v.string(),
    risks: v.array(AdvisorReviewFinding),
    reviewer: v.optional(v.string()),
    usage: v.optional(TokenUsage),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.id)
    if (!request) throw new Error('Advisor review request not found')
    await requireChatOwner(ctx, request.chatId)
    const now = Date.now()
    const reviewId = await ctx.db.insert('advisorReviews', {
      projectId: request.projectId,
      chatId: request.chatId,
      runId: request.runId,
      artifactId: request.artifactId,
      workflowArtifactId: request.workflowArtifactId,
      gates: request.gates,
      status: args.status,
      summary: args.summary.trim(),
      risks: args.risks,
      reviewer: args.reviewer ?? 'advisor-reviewer',
      createdAt: now,
      updatedAt: now,
    })
    const reviewerRunId = request.reviewerRunId
    if (reviewerRunId) {
      const reviewerRun = await ctx.db.get(reviewerRunId)
      if (reviewerRun?.status === 'running') {
        await ctx.db.insert('agentRunEvents', {
          runId: reviewerRunId,
          chatId: request.chatId,
          sequence: 2,
          type: 'advisor_review_completed',
          status: args.status,
          progressCategory: 'analysis',
          content: args.summary.trim(),
          createdAt: now,
        })
        await ctx.db.patch(reviewerRunId, {
          status: 'completed',
          summary: args.summary.trim(),
          usage: args.usage,
          lastActivityAt: now,
          completedAt: now,
        })
      }
    }
    await ctx.db.patch(args.id, { status: 'completed', updatedAt: now })
    return { requestId: args.id, reviewId }
  },
})

export const updateStatus = mutation({
  args: {
    id: v.id('advisorReviewRequests'),
    status: v.union(v.literal('pending'), v.literal('completed'), v.literal('cancelled')),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.id)
    if (!request) throw new Error('Advisor review request not found')
    await requireChatOwner(ctx, request.chatId)
    await ctx.db.patch(args.id, { status: args.status, updatedAt: Date.now() })
    return args.id
  },
})
