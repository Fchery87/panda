/**
 * Checkpoints Module
 *
 * Manages checkpoints for rollback functionality:
 * - Create checkpoints before file modifications
 * - List checkpoints for a project/chat
 * - Restore files to checkpoint state
 */

import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import {
  requireCheckpointOwner,
  requireChatOwner,
  requireProjectOwner,
  requireSnapshotOwner,
} from './lib/authz'

const MAX_CHECKPOINTS_PER_PROJECT = 50

export const list = query({
  args: {
    projectId: v.id('projects'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    const limit = Math.min(args.limit ?? 20, 50)
    return await ctx.db
      .query('checkpoints')
      .withIndex('by_project_created', (q) => q.eq('projectId', args.projectId))
      .order('desc')
      .take(limit)
  },
})

export const listByChat = query({
  args: {
    chatId: v.id('chats'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireChatOwner(ctx, args.chatId)
    const limit = Math.min(args.limit ?? 20, 50)
    return await ctx.db
      .query('checkpoints')
      .withIndex('by_chat', (q) => q.eq('chatId', args.chatId))
      .order('desc')
      .take(limit)
  },
})

export const get = query({
  args: { id: v.id('checkpoints') },
  handler: async (ctx, args) => {
    await requireCheckpointOwner(ctx, args.id)
    return await ctx.db.get(args.id)
  },
})

export const create = mutation({
  args: {
    projectId: v.id('projects'),
    chatId: v.id('chats'),
    name: v.string(),
    description: v.optional(v.string()),
    filesChanged: v.array(v.string()),
    snapshotIds: v.array(v.id('fileSnapshots')),
  },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    await requireChatOwner(ctx, args.chatId)
    for (const snapshotId of args.snapshotIds) {
      await requireSnapshotOwner(ctx, snapshotId)
    }
    const now = Date.now()

    const checkpointId = await ctx.db.insert('checkpoints', {
      projectId: args.projectId,
      chatId: args.chatId,
      name: args.name,
      description: args.description,
      filesChanged: args.filesChanged,
      snapshotIds: args.snapshotIds,
      createdAt: now,
    })

    // Prune oldest checkpoints, excluding the one we just created.
    const existingCheckpoints = await ctx.db
      .query('checkpoints')
      .withIndex('by_project_created', (q) => q.eq('projectId', args.projectId))
      .order('asc')
      .collect()

    const withoutNew = existingCheckpoints.filter((cp) => cp._id !== checkpointId)
    if (withoutNew.length >= MAX_CHECKPOINTS_PER_PROJECT) {
      const toDelete = withoutNew.slice(0, withoutNew.length - MAX_CHECKPOINTS_PER_PROJECT + 1)
      for (const cp of toDelete) {
        await ctx.db.delete(cp._id)
      }
    }

    return checkpointId
  },
})

export const restore = mutation({
  args: {
    checkpointId: v.id('checkpoints'),
  },
  handler: async (ctx, args) => {
    const { checkpoint } = await requireCheckpointOwner(ctx, args.checkpointId)

    const results: Array<{
      filePath: string
      success: boolean
      error?: string
    }> = []

    for (const snapshotId of checkpoint.snapshotIds) {
      const snapshot = await ctx.db.get(snapshotId)
      if (!snapshot) {
        continue
      }

      const targetFile = await ctx.db.get(snapshot.fileId)
      if (!targetFile) {
        results.push({
          filePath: `unknown-${snapshot.fileId}`,
          success: false,
          error: 'File not found',
        })
        continue
      }

      try {
        await ctx.db.patch(targetFile._id, {
          content: snapshot.content,
          updatedAt: Date.now(),
        })
        results.push({
          filePath: targetFile.path,
          success: true,
        })
      } catch (error) {
        results.push({
          filePath: targetFile.path,
          success: false,
          error: error instanceof Error ? error.message : 'Failed to restore file',
        })
      }
    }

    return {
      checkpointId: args.checkpointId,
      restoredAt: Date.now(),
      results,
    }
  },
})

export const remove = mutation({
  args: { id: v.id('checkpoints') },
  handler: async (ctx, args) => {
    await requireCheckpointOwner(ctx, args.id)
    await ctx.db.delete(args.id)
    return args.id
  },
})

export const getLatest = query({
  args: {
    projectId: v.id('projects'),
  },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    const checkpoint = await ctx.db
      .query('checkpoints')
      .withIndex('by_project_created', (q) => q.eq('projectId', args.projectId))
      .order('desc')
      .first()

    return checkpoint
  },
})

export const createForFileChanges = mutation({
  args: {
    projectId: v.id('projects'),
    chatId: v.id('chats'),
    name: v.string(),
    description: v.optional(v.string()),
    filePaths: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    await requireChatOwner(ctx, args.chatId)
    const snapshotIds: Id<'fileSnapshots'>[] = []

    for (const filePath of args.filePaths) {
      const file = await ctx.db
        .query('files')
        .withIndex('by_path', (q) => q.eq('projectId', args.projectId).eq('path', filePath))
        .first()

      if (!file || !file.content) {
        continue
      }

      const latestSnapshot = await ctx.db
        .query('fileSnapshots')
        .withIndex('by_snapshot', (q) => q.eq('fileId', file._id))
        .order('desc')
        .first()

      const snapshotNumber = (latestSnapshot?.snapshotNumber ?? 0) + 1

      const snapshotId = await ctx.db.insert('fileSnapshots', {
        fileId: file._id,
        snapshotNumber,
        content: file.content,
        createdAt: Date.now(),
      })

      snapshotIds.push(snapshotId)
    }

    if (snapshotIds.length === 0) {
      return null
    }

    const checkpointId = await ctx.db.insert('checkpoints', {
      projectId: args.projectId,
      chatId: args.chatId,
      name: args.name,
      description: args.description,
      filesChanged: args.filePaths,
      snapshotIds,
      createdAt: Date.now(),
    })

    // Prune oldest checkpoints, excluding the one we just created.
    const existingCheckpoints = await ctx.db
      .query('checkpoints')
      .withIndex('by_project_created', (q) => q.eq('projectId', args.projectId))
      .order('asc')
      .collect()

    const withoutNew = existingCheckpoints.filter((cp) => cp._id !== checkpointId)
    if (withoutNew.length >= MAX_CHECKPOINTS_PER_PROJECT) {
      const toDelete = withoutNew.slice(0, withoutNew.length - MAX_CHECKPOINTS_PER_PROJECT + 1)
      for (const cp of toDelete) {
        await ctx.db.delete(cp._id)
      }
    }

    return checkpointId
  },
})
