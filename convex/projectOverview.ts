import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { requireProjectOwner } from './lib/authz'

/** The reserved file path used for the project overview */
export const PROJECT_OVERVIEW_PATH = 'PROJECT_OVERVIEW.md'

/**
 * Get the project overview content for a project.
 * Returns null if no overview exists yet.
 */
export const get = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    const file = await ctx.db
      .query('files')
      .withIndex('by_path', (q) =>
        q.eq('projectId', args.projectId).eq('path', PROJECT_OVERVIEW_PATH)
      )
      .unique()

    return file?.content ?? null
  },
})

/**
 * Set (create or overwrite) the project overview for a project.
 * Uses the existing files table — no schema changes required.
 */
export const update = mutation({
  args: {
    projectId: v.id('projects'),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    const now = Date.now()

    const existing = await ctx.db
      .query('files')
      .withIndex('by_path', (q) =>
        q.eq('projectId', args.projectId).eq('path', PROJECT_OVERVIEW_PATH)
      )
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, { content: args.content, updatedAt: now })
      return existing._id
    } else {
      return await ctx.db.insert('files', {
        projectId: args.projectId,
        path: PROJECT_OVERVIEW_PATH,
        content: args.content,
        updatedAt: now,
      })
    }
  },
})
