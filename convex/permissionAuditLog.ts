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
  args: {
    sessionID: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 100, 500))
    return await ctx.db
      .query('permissionAuditLog')
      .withIndex('by_session', (q) => q.eq('sessionID', args.sessionID))
      .order('desc')
      .take(limit)
  },
})

export const listByProject = query({
  args: {
    projectId: v.id('projects'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 100, 500))
    return await ctx.db
      .query('permissionAuditLog')
      .withIndex('by_project_timestamp', (q) => q.eq('projectId', args.projectId))
      .order('desc')
      .take(limit)
  },
})
