import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { requireProjectOwner } from './lib/authz'
import {
  deleteUnreferencedFileContents,
  ensureInlineTextContent,
  resolveContent,
  upsertFileMetadataProjection,
} from './lib/fileContentStore'

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

    if (!file) return null
    return (
      (await resolveContent(ctx, {
        legacyContent: file.content,
        contentRef: file.contentRef,
      })) ?? null
    )
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

    const contentFields = await ensureInlineTextContent(ctx, {
      projectId: args.projectId,
      content: args.content,
    })

    const fileId = existing
      ? existing._id
      : await ctx.db.insert('files', {
          projectId: args.projectId,
          path: PROJECT_OVERVIEW_PATH,
          content: args.content,
          ...contentFields,
          updatedAt: now,
        })

    if (existing) {
      const oldContentRef = existing.contentRef
      await ctx.db.patch(existing._id, { content: args.content, ...contentFields, updatedAt: now })
      await deleteUnreferencedFileContents(ctx, [oldContentRef])
    }

    await upsertFileMetadataProjection(ctx, {
      fileId,
      projectId: args.projectId,
      path: PROJECT_OVERVIEW_PATH,
      content: args.content,
      contentHash: contentFields.contentHash,
      contentSize: contentFields.contentSize,
      updatedAt: now,
    })

    return fileId
  },
})
