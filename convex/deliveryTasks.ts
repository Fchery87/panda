import { canTransitionTask, type DeliveryTaskStatus } from '../apps/web/lib/delivery/status-machine'
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import { v } from 'convex/values'
import {
  AcceptanceCriterion as AcceptanceCriterionValidator,
  DeliveryRole as DeliveryRoleValidator,
  DeliveryTaskStatus as DeliveryTaskStatusValidator,
  TaskEvidenceLink as TaskEvidenceLinkValidator,
} from './schema'
import { requireProjectOwner } from './lib/authz'

export type DeliveryRole = 'builder' | 'manager' | 'executive'

export type TaskEvidenceLink = {
  type:
    | 'agent_run'
    | 'run_event'
    | 'job'
    | 'review_report'
    | 'qa_report'
    | 'ship_report'
    | 'specification'
    | 'eval_run'
    | 'artifact'
    | 'external'
  id?: string
  label: string
  href?: string
}

export type AcceptanceCriterion = {
  id: string
  text: string
  status: 'pending' | 'passed' | 'failed' | 'waived'
  verificationMethod: 'unit' | 'integration' | 'e2e' | 'manual' | 'review'
}

export type DeliveryTaskRecord = {
  deliveryStateId: Id<'deliveryStates'>
  taskKey: string
  title: string
  description: string
  rationale: string
  ownerRole: DeliveryRole
  dependencies: Id<'deliveryTasks'>[]
  filesInScope: string[]
  routesInScope: string[]
  constraints: string[]
  acceptanceCriteria: AcceptanceCriterion[]
  testRequirements: string[]
  reviewRequirements: string[]
  qaRequirements: string[]
  blockers: string[]
  status: DeliveryTaskStatus
  evidence: TaskEvidenceLink[]
  latestRunId?: Id<'agentRuns'>
  latestReviewReportId?: Id<'reviewReports'>
  latestQaReportId?: Id<'qaReports'>
  createdAt: number
  updatedAt: number
}

export function createDeliveryTaskRecord(args: {
  deliveryStateId: Id<'deliveryStates'>
  taskKey: string
  title: string
  description: string
  rationale: string
  ownerRole: DeliveryRole
  now: number
  status?: DeliveryTaskStatus
  dependencies?: Id<'deliveryTasks'>[]
  filesInScope?: string[]
  routesInScope?: string[]
  constraints?: string[]
  acceptanceCriteria?: AcceptanceCriterion[]
  testRequirements?: string[]
  reviewRequirements?: string[]
  qaRequirements?: string[]
  blockers?: string[]
}): DeliveryTaskRecord {
  return {
    deliveryStateId: args.deliveryStateId,
    taskKey: args.taskKey,
    title: args.title,
    description: args.description,
    rationale: args.rationale,
    ownerRole: args.ownerRole,
    dependencies: args.dependencies ?? [],
    filesInScope: args.filesInScope ?? [],
    routesInScope: args.routesInScope ?? [],
    constraints: args.constraints ?? [],
    acceptanceCriteria: args.acceptanceCriteria ?? [],
    testRequirements: args.testRequirements ?? [],
    reviewRequirements: args.reviewRequirements ?? [],
    qaRequirements: args.qaRequirements ?? [],
    blockers: args.blockers ?? [],
    status: args.status ?? 'draft',
    evidence: [],
    createdAt: args.now,
    updatedAt: args.now,
  }
}

type DeliveryTaskAuthzCtx = QueryCtx | MutationCtx

export function attachTaskEvidence(
  task: DeliveryTaskRecord,
  args: { evidence: TaskEvidenceLink[]; now: number }
): DeliveryTaskRecord {
  return {
    ...task,
    evidence: [...task.evidence, ...args.evidence],
    updatedAt: args.now,
  }
}

export function transitionDeliveryTaskRecord(
  task: DeliveryTaskRecord,
  args: { to: DeliveryTaskStatus; now: number }
): DeliveryTaskRecord {
  if (!canTransitionTask(task.status, args.to)) {
    throw new Error('Invalid delivery task transition')
  }

  if (args.to === 'in_review' && task.evidence.length === 0) {
    throw new Error('Cannot enter review without evidence')
  }

  return {
    ...task,
    status: args.to,
    updatedAt: args.now,
  }
}

async function requireDeliveryTaskOwner(
  ctx: DeliveryTaskAuthzCtx,
  deliveryTaskId: Id<'deliveryTasks'>
): Promise<Doc<'deliveryTasks'>> {
  const deliveryTask = await ctx.db.get(deliveryTaskId)
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
    taskKey: v.string(),
    title: v.string(),
    description: v.string(),
    rationale: v.string(),
    ownerRole: DeliveryRoleValidator,
    dependencies: v.optional(v.array(v.id('deliveryTasks'))),
    filesInScope: v.optional(v.array(v.string())),
    routesInScope: v.optional(v.array(v.string())),
    constraints: v.optional(v.array(v.string())),
    acceptanceCriteria: v.optional(v.array(AcceptanceCriterionValidator)),
    testRequirements: v.optional(v.array(v.string())),
    reviewRequirements: v.optional(v.array(v.string())),
    qaRequirements: v.optional(v.array(v.string())),
    blockers: v.optional(v.array(v.string())),
    status: v.optional(DeliveryTaskStatusValidator),
  },
  handler: async (ctx, args) => {
    const deliveryState = await ctx.db.get(args.deliveryStateId)
    if (!deliveryState) {
      throw new Error('Delivery state not found')
    }

    await requireProjectOwner(ctx, deliveryState.projectId)

    const now = Date.now()
    const record = createDeliveryTaskRecord({
      deliveryStateId: args.deliveryStateId,
      taskKey: args.taskKey,
      title: args.title,
      description: args.description,
      rationale: args.rationale,
      ownerRole: args.ownerRole,
      dependencies: args.dependencies,
      filesInScope: args.filesInScope,
      routesInScope: args.routesInScope,
      constraints: args.constraints,
      acceptanceCriteria: args.acceptanceCriteria,
      testRequirements: args.testRequirements,
      reviewRequirements: args.reviewRequirements,
      qaRequirements: args.qaRequirements,
      blockers: args.blockers,
      status: args.status,
      now,
    })

    return await ctx.db.insert('deliveryTasks', record)
  },
})

export const get = query({
  args: { id: v.id('deliveryTasks') },
  handler: async (ctx, args) => {
    return await requireDeliveryTaskOwner(ctx, args.id)
  },
})

export const listByDeliveryState = query({
  args: { deliveryStateId: v.id('deliveryStates') },
  handler: async (ctx, args) => {
    const deliveryState = await ctx.db.get(args.deliveryStateId)
    if (!deliveryState) {
      throw new Error('Delivery state not found')
    }

    await requireProjectOwner(ctx, deliveryState.projectId)

    return await ctx.db
      .query('deliveryTasks')
      .withIndex('by_delivery_updated', (q) => q.eq('deliveryStateId', args.deliveryStateId))
      .order('desc')
      .collect()
  },
})

export const attachEvidence = mutation({
  args: {
    id: v.id('deliveryTasks'),
    evidence: v.array(TaskEvidenceLinkValidator),
  },
  handler: async (ctx, args) => {
    const task = await requireDeliveryTaskOwner(ctx, args.id)
    const nextTask = attachTaskEvidence(task, {
      evidence: args.evidence,
      now: Date.now(),
    })

    await ctx.db.patch(args.id, {
      evidence: nextTask.evidence,
      updatedAt: nextTask.updatedAt,
    })

    return args.id
  },
})

export const transitionStatus = mutation({
  args: {
    id: v.id('deliveryTasks'),
    to: DeliveryTaskStatusValidator,
  },
  handler: async (ctx, args) => {
    const task = await requireDeliveryTaskOwner(ctx, args.id)
    const nextTask = transitionDeliveryTaskRecord(task, {
      to: args.to,
      now: Date.now(),
    })

    await ctx.db.patch(args.id, {
      status: nextTask.status,
      updatedAt: nextTask.updatedAt,
    })

    return args.id
  },
})

export const setBlockers = mutation({
  args: {
    id: v.id('deliveryTasks'),
    blockers: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await requireDeliveryTaskOwner(ctx, args.id)

    await ctx.db.patch(args.id, {
      blockers: args.blockers,
      updatedAt: Date.now(),
    })

    return args.id
  },
})
