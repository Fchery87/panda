import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

export const log = mutation({
  args: {
    sessionID: v.string(),
    tool: v.string(),
    pattern: v.string(),
    decision: v.string(),
    reason: v.optional(v.string()),
    metadata: v.optional(v.any()),
    timestamp: v.number(),
    projectId: v.optional(v.id('projects')),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('permissionAuditLog', args)
  },
})

export const listBySession = query({
  args: { sessionID: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('permissionAuditLog')
      .withIndex('by_session', (q) => q.eq('sessionID', args.sessionID))
      .order('desc')
      .collect()
  },
})
