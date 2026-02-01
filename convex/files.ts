import { query, mutation, action } from './_generated/server'
import { api } from './_generated/api'
import { v } from 'convex/values'
import JSZip from 'jszip'

// Helper to get current user ID - returns 'mock-user-id' for now
export function getCurrentUserId(): string {
  return 'mock-user-id'
}

// list (query) - list files by projectId
export const list = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('files')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect()
  },
})

// get (query) - get file by id
export const get = query({
  args: { id: v.id('files') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

// getByPath (query) - get file by projectId + path
export const getByPath = query({
  args: {
    projectId: v.id('projects'),
    path: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('files')
      .withIndex('by_path', (q) => q.eq('projectId', args.projectId).eq('path', args.path))
      .unique()
  },
})

// batchGet (query) - get multiple files by projectId + paths
export const batchGet = query({
  args: {
    projectId: v.id('projects'),
    paths: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const results: Array<{ path: string; content: string | null; exists: boolean }> = []

    for (const path of args.paths) {
      const file = await ctx.db
        .query('files')
        .withIndex('by_path', (q) => q.eq('projectId', args.projectId).eq('path', path))
        .unique()

      results.push({
        path,
        content: file?.content ?? null,
        exists: file !== null,
      })
    }

    return results
  },
})

// upsert (mutation) - create or update file
export const upsert = mutation({
  args: {
    id: v.optional(v.id('files')),
    projectId: v.id('projects'),
    path: v.string(),
    content: v.optional(v.string()),
    isBinary: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    if (args.id) {
      // Update existing file
      const existing = await ctx.db.get(args.id)
      if (!existing) {
        throw new Error('File not found')
      }

      // Check if content has changed for snapshot
      if (args.content !== undefined && args.content !== existing.content) {
        // Create snapshot before updating
        const lastSnapshot = await ctx.db
          .query('fileSnapshots')
          .withIndex('by_file', (q) => q.eq('fileId', args.id!))
          .order('desc')
          .first()

        const snapshotNumber = lastSnapshot ? lastSnapshot.snapshotNumber + 1 : 1

        await ctx.db.insert('fileSnapshots', {
          fileId: args.id,
          snapshotNumber,
          content: existing.content || '',
          createdAt: now,
        })
      }

      await ctx.db.patch(args.id, {
        content: args.content,
        isBinary: args.isBinary,
        updatedAt: now,
      })

      return args.id
    } else {
      // Create new file
      return await ctx.db.insert('files', {
        projectId: args.projectId,
        path: args.path,
        content: args.content,
        isBinary: args.isBinary,
        updatedAt: now,
      })
    }
  },
})

// remove (mutation) - delete file and its snapshots
export const remove = mutation({
  args: { id: v.id('files') },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.id)

    if (!file) {
      throw new Error('File not found')
    }

    // Delete all snapshots for this file
    const snapshots = await ctx.db
      .query('fileSnapshots')
      .withIndex('by_file', (q) => q.eq('fileId', args.id))
      .collect()

    for (const snapshot of snapshots) {
      await ctx.db.delete(snapshot._id)
    }

    // Delete the file
    await ctx.db.delete(args.id)

    return args.id
  },
})

// createSnapshot (mutation) - create version snapshot
export const createSnapshot = mutation({
  args: {
    fileId: v.id('files'),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId)

    if (!file) {
      throw new Error('File not found')
    }

    const now = Date.now()

    // Get the last snapshot number
    const lastSnapshot = await ctx.db
      .query('fileSnapshots')
      .withIndex('by_file', (q) => q.eq('fileId', args.fileId))
      .order('desc')
      .first()

    const snapshotNumber = lastSnapshot ? lastSnapshot.snapshotNumber + 1 : 1

    const snapshotId = await ctx.db.insert('fileSnapshots', {
      fileId: args.fileId,
      snapshotNumber,
      content: args.content,
      createdAt: now,
    })

    return snapshotId
  },
})

// listSnapshots (query) - list snapshots for a file
export const listSnapshots = query({
  args: { fileId: v.id('files') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('fileSnapshots')
      .withIndex('by_file', (q) => q.eq('fileId', args.fileId))
      .order('desc')
      .collect()
  },
})

// downloadProject (action) - generate ZIP of all project files
export const downloadProject = action({
  args: { projectId: v.id('projects') },
  returns: v.object({
    zipData: v.string(), // Base64 encoded ZIP
    filename: v.string(),
  }),
  handler: async (ctx, args) => {
    // Get project details
    const project: { name: string } | null = await ctx.runQuery(api.projects.get, {
      id: args.projectId,
    })
    if (!project) {
      throw new Error('Project not found')
    }

    // Get all files for this project
    const files: Array<{ path: string; content?: string | null }> = await ctx.runQuery(
      api.files.list,
      { projectId: args.projectId }
    )

    // Create ZIP archive
    const zip = new JSZip()

    for (const file of files) {
      if (file.content !== undefined && file.content !== null) {
        zip.file(file.path, file.content)
      }
    }

    // Generate ZIP as base64 string
    const zipBase64: string = await zip.generateAsync({ type: 'base64' })

    // Format filename: project-name-YYYY-MM-DD.zip
    const date = new Date()
    const dateStr: string = date.toISOString().split('T')[0]
    const sanitizedName: string = project.name.replace(/[^a-zA-Z0-9-_]/g, '-')
    const filename: string = `${sanitizedName}-${dateStr}.zip`

    return {
      zipData: zipBase64,
      filename,
    }
  },
})
