import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import { requireAuth, getCurrentUserId } from './lib/auth'
import { trackUserAnalytics } from './lib/userAnalytics'
import { RuntimePreview } from './schema'

// list (query) - list all projects for current user
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx)
    if (!userId) return []

    return await ctx.db
      .query('projects')
      .withIndex('by_creator', (q) => q.eq('createdBy', userId as Id<'users'>))
      .collect()
  },
})

// get (query) - get single project by id
export const get = query({
  args: { id: v.id('projects') },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    if (!userId) return null

    const project = await ctx.db.get(args.id)

    if (!project || project.createdBy !== (userId as Id<'users'>)) {
      return null
    }

    return project
  },
})

// Default limits if not configured
const DEFAULT_MAX_PROJECTS_PER_USER = 100

// create (mutation) - create new project
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    repoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx)

    // Check resource limits
    const adminSettings = await ctx.db.query('adminSettings').order('desc').first()
    const maxProjects = adminSettings?.maxProjectsPerUser ?? DEFAULT_MAX_PROJECTS_PER_USER

    const existingProjects = await ctx.db
      .query('projects')
      .withIndex('by_creator', (q) => q.eq('createdBy', userId))
      .collect()

    if (existingProjects.length >= maxProjects) {
      throw new Error(
        `Project limit reached. You have ${existingProjects.length} projects (maximum: ${maxProjects}). Please delete an existing project before creating a new one.`
      )
    }

    const now = Date.now()

    const projectId = await ctx.db.insert('projects', {
      name: args.name,
      description: args.description,
      createdBy: userId,
      createdAt: now,
      lastOpenedAt: now,
      repoUrl: args.repoUrl,
      runtimePreview: null,
      agentPolicy: null,
    })

    await trackUserAnalytics(ctx, userId, {
      totalProjects: 1,
    })

    return projectId
  },
})

// update (mutation) - update project name/description
export const update = mutation({
  args: {
    id: v.id('projects'),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    repoUrl: v.optional(v.string()),
    lastOpenedAt: v.optional(v.number()),
    agentPolicy: v.optional(
      v.union(
        v.null(),
        v.object({
          autoApplyFiles: v.boolean(),
          autoRunCommands: v.boolean(),
          allowedCommandPrefixes: v.array(v.string()),
        })
      )
    ),
    runtimePreview: v.optional(v.union(v.null(), RuntimePreview)),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx)

    const project = await ctx.db.get(args.id)

    if (!project || project.createdBy !== userId) {
      throw new Error('Project not found or access denied')
    }

    const updates: Partial<typeof project> = {}

    if (args.name !== undefined) updates.name = args.name
    if (args.description !== undefined) updates.description = args.description
    if (args.repoUrl !== undefined) updates.repoUrl = args.repoUrl
    if (args.lastOpenedAt !== undefined) updates.lastOpenedAt = args.lastOpenedAt
    if (args.agentPolicy !== undefined) updates.agentPolicy = args.agentPolicy
    if (args.runtimePreview !== undefined) updates.runtimePreview = args.runtimePreview

    await ctx.db.patch(args.id, updates)

    return args.id
  },
})

// remove (mutation) - delete project and cascade delete related files/chats
export const remove = mutation({
  args: { id: v.id('projects') },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx)

    const project = await ctx.db.get(args.id)

    if (!project || project.createdBy !== userId) {
      throw new Error('Project not found or access denied')
    }

    // Delete all files associated with this project
    const files = await ctx.db
      .query('files')
      .withIndex('by_project', (q) => q.eq('projectId', args.id))
      .collect()

    for (const file of files) {
      // Delete file snapshots
      const snapshots = await ctx.db
        .query('fileSnapshots')
        .withIndex('by_file', (q) => q.eq('fileId', file._id))
        .collect()

      for (const snapshot of snapshots) {
        await ctx.db.delete(snapshot._id)
      }

      await ctx.db.delete(file._id)
    }

    // Delete all chats associated with this project
    const chats = await ctx.db
      .query('chats')
      .withIndex('by_project', (q) => q.eq('projectId', args.id))
      .collect()

    let deletedMessageCount = 0

    for (const chat of chats) {
      // Delete all messages for this chat
      const messages = await ctx.db
        .query('messages')
        .withIndex('by_chat', (q) => q.eq('chatId', chat._id))
        .collect()

      deletedMessageCount += messages.length

      for (const message of messages) {
        // Delete artifacts associated with this message
        const artifacts = await ctx.db
          .query('artifacts')
          .withIndex('by_message', (q) => q.eq('messageId', message._id))
          .collect()

        for (const artifact of artifacts) {
          await ctx.db.delete(artifact._id)
        }

        await ctx.db.delete(message._id)
      }

      await ctx.db.delete(chat._id)
    }

    // Delete all jobs associated with this project
    const jobs = await ctx.db
      .query('jobs')
      .withIndex('by_project', (q) => q.eq('projectId', args.id))
      .collect()

    for (const job of jobs) {
      await ctx.db.delete(job._id)
    }

    // Finally, delete the project
    await ctx.db.delete(args.id)

    await trackUserAnalytics(ctx, userId, {
      totalProjects: -1,
      totalChats: -chats.length,
      totalMessages: -deletedMessageCount,
    })

    return args.id
  },
})
