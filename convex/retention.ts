import { v } from 'convex/values'
import { internal } from './_generated/api'
import { internalMutation } from './_generated/server'
import type { Id, TableNames } from './_generated/dataModel'

const DEFAULT_RETENTION_DAYS = 30
const DEFAULT_BATCH_LIMIT = 100
const MS_PER_DAY = 24 * 60 * 60 * 1000

type RetentionTable =
  | 'agentRunEvents'
  | 'harnessRuntimeCheckpoints'
  | 'evalRunResults'
  | 'fileSnapshots'

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

    const deleteExpiredRows = async <TTable extends RetentionTable>(
      table: TTable,
      field: 'createdAt' | 'savedAt'
    ) => {
      if (deleted >= limit) return

      const remaining = limit - deleted
      const rows = await ctx.db.query(table).order('asc').take(limit)
      const expired = rows
        .filter((row) => {
          const timestamp = row[field as keyof typeof row]
          return typeof timestamp === 'number' && timestamp < olderThanMs
        })
        .slice(0, remaining)

      for (const row of expired) {
        await ctx.db.delete(row._id as Id<TableNames>)
      }

      deleted += expired.length
    }

    await deleteExpiredRows('agentRunEvents', 'createdAt')
    await deleteExpiredRows('harnessRuntimeCheckpoints', 'savedAt')
    await deleteExpiredRows('evalRunResults', 'createdAt')
    await deleteExpiredRows('fileSnapshots', 'createdAt')

    if (deleted === limit) {
      await ctx.scheduler.runAfter(0, internal.retention.cleanupOperationalData, {
        olderThanMs,
        limit,
      })
    }

    return { deleted }
  },
})
