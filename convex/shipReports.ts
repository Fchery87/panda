import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import { v } from 'convex/values'
import { requireProjectOwner } from './lib/authz'
import { ShipDecision as ShipDecisionValidator } from './schema'

export type ShipDecision = 'ready' | 'ready_with_risk' | 'not_ready'

export type ShipReportRecord = {
  deliveryStateId: Id<'deliveryStates'>
  decision: ShipDecision
  summary: string
  openRisks: string[]
  unresolvedDefects: string[]
  evidenceSummary: string
  createdAt: number
}

export function createShipReportRecord(args: {
  deliveryStateId: Id<'deliveryStates'>
  decision: ShipDecision
  summary: string
  openRisks?: string[]
  unresolvedDefects?: string[]
  evidenceSummary: string
  now: number
}): ShipReportRecord {
  return {
    deliveryStateId: args.deliveryStateId,
    decision: args.decision,
    summary: args.summary,
    openRisks: args.openRisks ?? [],
    unresolvedDefects: args.unresolvedDefects ?? [],
    evidenceSummary: args.evidenceSummary,
    createdAt: args.now,
  }
}

type ShipAuthzCtx = QueryCtx | MutationCtx

async function requireDeliveryStateForShip(
  ctx: ShipAuthzCtx,
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
    deliveryStateId: v.id('deliveryStates'),
    decision: ShipDecisionValidator,
    summary: v.string(),
    openRisks: v.optional(v.array(v.string())),
    unresolvedDefects: v.optional(v.array(v.string())),
    evidenceSummary: v.string(),
  },
  handler: async (ctx, args) => {
    await requireDeliveryStateForShip(ctx, args.deliveryStateId)

    const record = createShipReportRecord({
      deliveryStateId: args.deliveryStateId,
      decision: args.decision,
      summary: args.summary,
      openRisks: args.openRisks,
      unresolvedDefects: args.unresolvedDefects,
      evidenceSummary: args.evidenceSummary,
      now: Date.now(),
    })

    return await ctx.db.insert('shipReports', record)
  },
})

export const listByDeliveryState = query({
  args: { deliveryStateId: v.id('deliveryStates') },
  handler: async (ctx, args) => {
    await requireDeliveryStateForShip(ctx, args.deliveryStateId)

    return await ctx.db
      .query('shipReports')
      .withIndex('by_delivery_created', (q) => q.eq('deliveryStateId', args.deliveryStateId))
      .order('desc')
      .collect()
  },
})
