import { v } from 'convex/values'
import { internal } from './_generated/api'
import { internalMutation } from './_generated/server'
import type { Id, TableNames } from './_generated/dataModel'

const DEFAULT_RETENTION_DAYS = 30
const DEFAULT_BATCH_LIMIT = 500
const MS_PER_DAY = 24 * 60 * 60 * 1000

function clampLimit(limit: number | undefined): number {
  return Math.max(1, Math.min(limit ?? DEFAULT_BATCH_LIMIT, DEFAULT_BATCH_LIMIT))
}

export const cleanupOperationalData = internalMutation({
  args: {
    olderThanMs: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = clampLimit(args.limit)
    const olderThanMs = args.olderThanMs ?? Date.now() - DEFAULT_RETENTION_DAYS * MS_PER_DAY
    let deleted = 0

    // This cleanup only targets high-volume operational detail rows. source-of-truth data
    // such as chats, messages, projects, agentRuns, evalRuns, and checkpoint records stay intact.
    const deleteExpiredAgentRunEvents = async () => {
      if (deleted >= limit) return

      const remaining = limit - deleted
      const expired = await ctx.db
        .query('agentRunEvents')
        .withIndex('by_created', (q) => q.lt('createdAt', olderThanMs))
        .order('asc')
        .take(remaining)

      for (const row of expired) {
        await ctx.db.delete(row._id as Id<TableNames>)
      }

      deleted += expired.length
    }

    const deleteExpiredEvalRunResults = async () => {
      if (deleted >= limit) return

      const remaining = limit - deleted
      const expired = await ctx.db
        .query('evalRunResults')
        .withIndex('by_created', (q) => q.lt('createdAt', olderThanMs))
        .order('asc')
        .take(remaining)

      for (const row of expired) {
        await ctx.db.delete(row._id as Id<TableNames>)
      }

      deleted += expired.length
    }

    const deleteExpiredFileSnapshots = async () => {
      if (deleted >= limit) return

      const remaining = limit - deleted
      const expired = await ctx.db
        .query('fileSnapshots')
        .withIndex('by_created', (q) => q.lt('createdAt', olderThanMs))
        .order('asc')
        .take(remaining)

      for (const row of expired) {
        await ctx.db.delete(row._id as Id<TableNames>)
      }

      deleted += expired.length
    }

    const deleteExpiredRuntimeCheckpoints = async () => {
      if (deleted >= limit) return

      const remaining = limit - deleted
      const expired = await ctx.db
        .query('harnessRuntimeCheckpoints')
        .withIndex('by_saved', (q) => q.lt('savedAt', olderThanMs))
        .order('asc')
        .take(remaining)

      for (const row of expired) {
        await ctx.db.delete(row._id as Id<TableNames>)
      }

      deleted += expired.length
    }

    await deleteExpiredAgentRunEvents()
    await deleteExpiredRuntimeCheckpoints()
    await deleteExpiredEvalRunResults()
    await deleteExpiredFileSnapshots()

    if (deleted === limit) {
      await ctx.scheduler.runAfter(0, internal.retention.cleanupOperationalData, {
        olderThanMs,
        limit,
      })
    }

    return { deleted }
  },
})
