import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import { v } from 'convex/values'
import { requireProjectOwner } from './lib/authz'
import {
  QaAssertion as QaAssertionValidator,
  QaDecision as QaDecisionValidator,
  QaEvidence as QaEvidenceValidator,
} from './schema'

export type QaDecision = 'pass' | 'concerns' | 'fail'
export type QaAssertion = {
  label: string
  status: 'passed' | 'failed' | 'skipped'
  detail?: string
}

export type QaEvidence = {
  screenshotPath?: string
  consoleErrors: string[]
  networkFailures: string[]
  urlsTested: string[]
  flowNames: string[]
}

export type QaReportRecord = {
  deliveryStateId: Id<'deliveryStates'>
  taskId: Id<'deliveryTasks'>
  browserSessionKey?: string
  decision: QaDecision
  summary: string
  assertions: QaAssertion[]
  evidence: QaEvidence
  defects: Array<{
    severity: 'high' | 'medium' | 'low'
    title: string
    detail: string
    route?: string
  }>
  createdAt: number
}

export function createQaReportRecord(args: {
  deliveryStateId: Id<'deliveryStates'>
  taskId: Id<'deliveryTasks'>
  browserSessionKey?: string
  decision: QaDecision
  summary: string
  assertions: QaAssertion[]
  evidence: Partial<QaEvidence> &
    Pick<QaEvidence, 'urlsTested' | 'flowNames' | 'consoleErrors' | 'networkFailures'>
  defects?: QaReportRecord['defects']
  now: number
}): QaReportRecord {
  return {
    deliveryStateId: args.deliveryStateId,
    taskId: args.taskId,
    browserSessionKey: args.browserSessionKey,
    decision: args.decision,
    summary: args.summary,
    assertions: args.assertions,
    evidence: {
      screenshotPath: args.evidence.screenshotPath,
      urlsTested: args.evidence.urlsTested,
      flowNames: args.evidence.flowNames,
      consoleErrors: args.evidence.consoleErrors,
      networkFailures: args.evidence.networkFailures,
    },
    defects: args.defects ?? [],
    createdAt: args.now,
  }
}

type QaAuthzCtx = QueryCtx | MutationCtx

async function requireDeliveryTaskForQa(
  ctx: QaAuthzCtx,
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
    browserSessionKey: v.optional(v.string()),
    decision: QaDecisionValidator,
    summary: v.string(),
    assertions: v.array(QaAssertionValidator),
    evidence: QaEvidenceValidator,
    defects: v.optional(
      v.array(
        v.object({
          severity: v.union(v.literal('high'), v.literal('medium'), v.literal('low')),
          title: v.string(),
          detail: v.string(),
          route: v.optional(v.string()),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const deliveryTask = await requireDeliveryTaskForQa(ctx, args.taskId)
    if (deliveryTask.deliveryStateId !== args.deliveryStateId) {
      throw new Error('Delivery task does not belong to the specified delivery state')
    }

    const record = createQaReportRecord({
      deliveryStateId: args.deliveryStateId,
      taskId: args.taskId,
      browserSessionKey: args.browserSessionKey,
      decision: args.decision,
      summary: args.summary,
      assertions: args.assertions,
      evidence: args.evidence,
      defects: args.defects,
      now: Date.now(),
    })

    return await ctx.db.insert('qaReports', record)
  },
})

export const listByTask = query({
  args: { taskId: v.id('deliveryTasks') },
  handler: async (ctx, args) => {
    await requireDeliveryTaskForQa(ctx, args.taskId)

    return await ctx.db
      .query('qaReports')
      .withIndex('by_task_created', (q) => q.eq('taskId', args.taskId))
      .order('desc')
      .collect()
  },
})
