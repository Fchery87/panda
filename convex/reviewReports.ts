import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import { v } from 'convex/values'
import { requireProjectOwner } from './lib/authz'
import {
  ReviewDecision as ReviewDecisionValidator,
  ReviewType as ReviewTypeValidator,
} from './schema'

export type ReviewType = 'architecture' | 'implementation'
export type ReviewDecision = 'pass' | 'concerns' | 'reject'

export type ReviewFinding = {
  severity: 'high' | 'medium' | 'low'
  title: string
  detail: string
  filePath?: string
  lineRef?: string
}

export type ReviewReportRecord = {
  deliveryStateId: Id<'deliveryStates'>
  taskId: Id<'deliveryTasks'>
  type: ReviewType
  decision: ReviewDecision
  summary: string
  findings: ReviewFinding[]
  followUpTaskIds: Id<'deliveryTasks'>[]
  reviewerRole: 'executive'
  createdAt: number
}

export function createReviewReportRecord(args: {
  deliveryStateId: Id<'deliveryStates'>
  taskId: Id<'deliveryTasks'>
  type: ReviewType
  decision: ReviewDecision
  summary: string
  findings?: ReviewFinding[]
  followUpTaskIds?: Id<'deliveryTasks'>[]
  now: number
}): ReviewReportRecord {
  return {
    deliveryStateId: args.deliveryStateId,
    taskId: args.taskId,
    type: args.type,
    decision: args.decision,
    summary: args.summary,
    findings: args.findings ?? [],
    followUpTaskIds: args.followUpTaskIds ?? [],
    reviewerRole: 'executive',
    createdAt: args.now,
  }
}

type ReviewReportAuthzCtx = QueryCtx | MutationCtx

async function requireDeliveryTaskForReview(
  ctx: ReviewReportAuthzCtx,
  taskId: Id<'deliveryTasks'>
): Promise<Doc<'deliveryTasks'>> {
  const deliveryTask = await ctx.db.get(taskId)
  if (!deliveryTask) {
    throw new Error('Delivery task not found')
  }

  const deliveryState = await ctx.db.get(deliveryTask.deliveryStateId)
  if (!deliveryState) {
    throw new Error('Delivery state not found')
  }

  await requireProjectOwner(ctx, deliveryState.projectId)
  return deliveryTask
}

export const create = mutation({
  args: {
    deliveryStateId: v.id('deliveryStates'),
    taskId: v.id('deliveryTasks'),
    type: ReviewTypeValidator,
    decision: ReviewDecisionValidator,
    summary: v.string(),
    findings: v.optional(
      v.array(
        v.object({
          severity: v.union(v.literal('high'), v.literal('medium'), v.literal('low')),
          title: v.string(),
          detail: v.string(),
          filePath: v.optional(v.string()),
          lineRef: v.optional(v.string()),
        })
      )
    ),
    followUpTaskIds: v.optional(v.array(v.id('deliveryTasks'))),
  },
  handler: async (ctx, args) => {
    const deliveryTask = await requireDeliveryTaskForReview(ctx, args.taskId)
    if (deliveryTask.deliveryStateId !== args.deliveryStateId) {
      throw new Error('Delivery task does not belong to the specified delivery state')
    }

    const record = createReviewReportRecord({
      deliveryStateId: args.deliveryStateId,
      taskId: args.taskId,
      type: args.type,
      decision: args.decision,
      summary: args.summary,
      findings: args.findings,
      followUpTaskIds: args.followUpTaskIds,
      now: Date.now(),
    })

    return await ctx.db.insert('reviewReports', record)
  },
})

export const listByTask = query({
  args: { taskId: v.id('deliveryTasks') },
  handler: async (ctx, args) => {
    await requireDeliveryTaskForReview(ctx, args.taskId)

    return await ctx.db
      .query('reviewReports')
      .withIndex('by_task_created', (q) => q.eq('taskId', args.taskId))
      .order('desc')
      .collect()
  },
})
