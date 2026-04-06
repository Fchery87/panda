import {
  canTransitionDeliveryPhase,
  type DeliveryPhase,
} from '../apps/web/lib/delivery/status-machine'
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import { v } from 'convex/values'
import {
  DeliveryPhase as DeliveryPhaseValidator,
  DeliveryRole as DeliveryRoleValidator,
} from './schema'
import { requireChatOwner, requireProjectOwner } from './lib/authz'

export type DeliveryRole = 'builder' | 'manager' | 'executive'
export type DeliveryStatus = 'draft' | 'active' | 'blocked' | 'completed' | 'cancelled' | 'failed'
export type GateStatus = 'not_required' | 'pending' | 'passed' | 'failed' | 'waived'

export type DeliveryStateSummary = {
  projectName?: string
  goal: string
  summary?: string
  currentPhaseSummary?: string
  activeTaskTitle?: string
  nextStepBrief?: string
  recentChangesDigest?: string
  openRisksDigest?: string
  decisionDigest?: string
}

export type DeliveryStateRecord = {
  projectId: Id<'projects'>
  chatId: Id<'chats'>
  title: string
  description?: string
  goal: string
  constraints: string[]
  currentPhase: DeliveryPhase
  status: DeliveryStatus
  activeRole: DeliveryRole
  summary: DeliveryStateSummary
  activeTaskIds: Id<'deliveryTasks'>[]
  pendingReviewIds: Id<'reviewReports'>[]
  pendingQaIds: Id<'qaReports'>[]
  latestShipReportId?: Id<'shipReports'>
  reviewGateStatus: GateStatus
  qaGateStatus: GateStatus
  shipGateStatus: GateStatus
  affectedFiles: string[]
  affectedRoutes: string[]
  openRiskCount: number
  unresolvedDefectCount: number
  evidenceMissing: boolean
  advisoryGateMode: boolean
  createdAt: number
  updatedAt: number
  lastUpdatedByRole: DeliveryRole
}

export function createDeliveryStateRecord(args: {
  projectId: Id<'projects'>
  chatId: Id<'chats'>
  title: string
  goal: string
  now: number
  description?: string
  constraints?: string[]
  currentPhase?: DeliveryPhase
  status?: DeliveryStatus
  activeRole?: DeliveryRole
  activeTaskIds?: Id<'deliveryTasks'>[]
  pendingReviewIds?: Id<'reviewReports'>[]
  pendingQaIds?: Id<'qaReports'>[]
  affectedFiles?: string[]
  affectedRoutes?: string[]
  openRiskCount?: number
  unresolvedDefectCount?: number
  evidenceMissing?: boolean
  advisoryGateMode?: boolean
}): DeliveryStateRecord {
  return {
    projectId: args.projectId,
    chatId: args.chatId,
    title: args.title,
    description: args.description,
    goal: args.goal,
    constraints: args.constraints ?? [],
    currentPhase: args.currentPhase ?? 'intake',
    status: args.status ?? 'draft',
    activeRole: args.activeRole ?? 'manager',
    summary: {
      goal: args.goal,
    },
    activeTaskIds: args.activeTaskIds ?? [],
    pendingReviewIds: args.pendingReviewIds ?? [],
    pendingQaIds: args.pendingQaIds ?? [],
    reviewGateStatus: 'not_required',
    qaGateStatus: 'not_required',
    shipGateStatus: 'not_required',
    affectedFiles: args.affectedFiles ?? [],
    affectedRoutes: args.affectedRoutes ?? [],
    openRiskCount: args.openRiskCount ?? 0,
    unresolvedDefectCount: args.unresolvedDefectCount ?? 0,
    evidenceMissing: args.evidenceMissing ?? false,
    advisoryGateMode: args.advisoryGateMode ?? true,
    createdAt: args.now,
    updatedAt: args.now,
    lastUpdatedByRole: 'manager',
  }
}

type DeliveryStateAuthzCtx = QueryCtx | MutationCtx

export function transitionDeliveryStatePhase(
  state: DeliveryStateRecord,
  args: { to: DeliveryPhase; now: number }
): DeliveryStateRecord {
  if (!canTransitionDeliveryPhase(state.currentPhase, args.to)) {
    throw new Error('Invalid delivery phase transition')
  }

  return {
    ...state,
    currentPhase: args.to,
    updatedAt: args.now,
    lastUpdatedByRole: 'manager',
  }
}

export function updateDeliveryStateSummary(
  state: DeliveryStateRecord,
  args: {
    currentPhaseSummary?: string
    activeTaskTitle?: string
    nextStepBrief?: string
    recentChangesDigest?: string
    openRisksDigest?: string
    decisionDigest?: string
    summary?: string
    now: number
  }
): DeliveryStateRecord {
  return {
    ...state,
    summary: {
      ...state.summary,
      ...(args.currentPhaseSummary !== undefined
        ? { currentPhaseSummary: args.currentPhaseSummary }
        : {}),
      ...(args.activeTaskTitle !== undefined ? { activeTaskTitle: args.activeTaskTitle } : {}),
      ...(args.nextStepBrief !== undefined ? { nextStepBrief: args.nextStepBrief } : {}),
      ...(args.recentChangesDigest !== undefined
        ? { recentChangesDigest: args.recentChangesDigest }
        : {}),
      ...(args.openRisksDigest !== undefined ? { openRisksDigest: args.openRisksDigest } : {}),
      ...(args.decisionDigest !== undefined ? { decisionDigest: args.decisionDigest } : {}),
      ...(args.summary !== undefined ? { summary: args.summary } : {}),
    },
    updatedAt: args.now,
    lastUpdatedByRole: 'manager',
  }
}

export function syncDeliveryStateDerivedCounts(
  state: DeliveryStateRecord,
  args: {
    openRiskCount: number
    unresolvedDefectCount: number
    evidenceMissing: boolean
    now: number
  }
): DeliveryStateRecord {
  return {
    ...state,
    openRiskCount: args.openRiskCount,
    unresolvedDefectCount: args.unresolvedDefectCount,
    evidenceMissing: args.evidenceMissing,
    updatedAt: args.now,
    lastUpdatedByRole: 'manager',
  }
}

async function requireDeliveryStateOwner(
  ctx: DeliveryStateAuthzCtx,
  deliveryStateId: Id<'deliveryStates'>
): Promise<Doc<'deliveryStates'>> {
  const deliveryState = await ctx.db.get(deliveryStateId)
  if (!deliveryState) {
    throw new Error('Delivery state not found')
  }

  await requireProjectOwner(ctx, deliveryState.projectId)
  return deliveryState
}

export const create = mutation({
  args: {
    projectId: v.id('projects'),
    chatId: v.id('chats'),
    title: v.string(),
    goal: v.string(),
    description: v.optional(v.string()),
    constraints: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { project } = await requireProjectOwner(ctx, args.projectId)
    const { chat } = await requireChatOwner(ctx, args.chatId)

    if (chat.projectId !== project._id) {
      throw new Error('Chat does not belong to the specified project')
    }

    const now = Date.now()
    const record = createDeliveryStateRecord({
      projectId: args.projectId,
      chatId: args.chatId,
      title: args.title,
      goal: args.goal,
      description: args.description,
      constraints: args.constraints,
      now,
    })

    return await ctx.db.insert('deliveryStates', record)
  },
})

export const get = query({
  args: { id: v.id('deliveryStates') },
  handler: async (ctx, args) => {
    return await requireDeliveryStateOwner(ctx, args.id)
  },
})

export const getActiveByChat = query({
  args: { chatId: v.id('chats') },
  handler: async (ctx, args) => {
    await requireChatOwner(ctx, args.chatId)

    const states = await ctx.db
      .query('deliveryStates')
      .withIndex('by_chat_updated', (q) => q.eq('chatId', args.chatId))
      .order('desc')
      .take(20)

    return states.find((state) => state.status === 'draft' || state.status === 'active') ?? null
  },
})

export const transitionPhase = mutation({
  args: {
    id: v.id('deliveryStates'),
    to: DeliveryPhaseValidator,
  },
  handler: async (ctx, args) => {
    const state = await requireDeliveryStateOwner(ctx, args.id)
    const nextState = transitionDeliveryStatePhase(state, {
      to: args.to,
      now: Date.now(),
    })

    await ctx.db.patch(args.id, {
      currentPhase: nextState.currentPhase,
      updatedAt: nextState.updatedAt,
      lastUpdatedByRole: nextState.lastUpdatedByRole,
    })

    return args.id
  },
})

export const updateSummary = mutation({
  args: {
    id: v.id('deliveryStates'),
    currentPhaseSummary: v.optional(v.string()),
    activeTaskTitle: v.optional(v.string()),
    nextStepBrief: v.optional(v.string()),
    recentChangesDigest: v.optional(v.string()),
    openRisksDigest: v.optional(v.string()),
    decisionDigest: v.optional(v.string()),
    summary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const state = await requireDeliveryStateOwner(ctx, args.id)
    const nextState = updateDeliveryStateSummary(state, {
      currentPhaseSummary: args.currentPhaseSummary,
      activeTaskTitle: args.activeTaskTitle,
      nextStepBrief: args.nextStepBrief,
      recentChangesDigest: args.recentChangesDigest,
      openRisksDigest: args.openRisksDigest,
      decisionDigest: args.decisionDigest,
      summary: args.summary,
      now: Date.now(),
    })

    await ctx.db.patch(args.id, {
      summary: nextState.summary,
      updatedAt: nextState.updatedAt,
      lastUpdatedByRole: nextState.lastUpdatedByRole,
    })

    return args.id
  },
})

export const syncDerivedCounts = mutation({
  args: {
    id: v.id('deliveryStates'),
    openRiskCount: v.number(),
    unresolvedDefectCount: v.number(),
    evidenceMissing: v.boolean(),
    activeRole: v.optional(DeliveryRoleValidator),
  },
  handler: async (ctx, args) => {
    const state = await requireDeliveryStateOwner(ctx, args.id)
    const nextState = syncDeliveryStateDerivedCounts(state, {
      openRiskCount: args.openRiskCount,
      unresolvedDefectCount: args.unresolvedDefectCount,
      evidenceMissing: args.evidenceMissing,
      now: Date.now(),
    })

    await ctx.db.patch(args.id, {
      openRiskCount: nextState.openRiskCount,
      unresolvedDefectCount: nextState.unresolvedDefectCount,
      evidenceMissing: nextState.evidenceMissing,
      activeRole: args.activeRole ?? nextState.activeRole,
      updatedAt: nextState.updatedAt,
      lastUpdatedByRole: nextState.lastUpdatedByRole,
    })

    return args.id
  },
})
