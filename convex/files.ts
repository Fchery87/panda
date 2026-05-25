import { query, mutation, action } from './_generated/server'
import { api } from './_generated/api'
import { v } from 'convex/values'
import JSZip from 'jszip'
import { requireFileOwner, requireProjectOwner } from './lib/authz'
import type { Id } from './_generated/dataModel'
import type { MutationCtx } from './_generated/server'

function hashContent(content: string): string {
  let hash = 2166136261
  for (let index = 0; index < content.length; index += 1) {
    hash ^= content.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

type FileMetadataSource = {
  _id: Id<'files'>
  projectId: Id<'projects'>
  path: string
  content?: string
  isBinary?: boolean
  updatedAt: number
}

function toMetadataPayload(file: FileMetadataSource) {
  const content = file.content ?? ''
  return {
    fileId: file._id,
    projectId: file.projectId,
    path: file.path,
    isBinary: file.isBinary,
    size: content.length,
    contentHash: hashContent(content),
    updatedAt: file.updatedAt,
  }
}

async function upsertFileMetadata(ctx: MutationCtx, file: FileMetadataSource) {
  const payload = toMetadataPayload(file)
  const existing = await ctx.db
    .query('fileMetadata')
    .withIndex('by_file', (q) => q.eq('fileId', file._id))
    .unique()
  if (existing) {
    await ctx.db.patch(existing._id, payload)
  } else {
    await ctx.db.insert('fileMetadata', payload)
  }
}

async function removeFileMetadata(ctx: MutationCtx, fileId: Id<'files'>) {
  const existing = await ctx.db
    .query('fileMetadata')
    .withIndex('by_file', (q) => q.eq('fileId', fileId))
    .unique()
  if (existing) await ctx.db.delete(existing._id)
}

/**
 * @deprecated Legacy compatibility query. Returns full file content for up to 2,000
 * files and must stay off hot UI paths. Prefer listMetadata for project/file-tree
 * surfaces and get/getByPath/batchGet for explicit lazy content reads.
 */
export const list = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    return await ctx.db
      .query('files')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .take(2000)
  },
})

// listMetadata (query) - hot file metadata projection without content reads
export const listMetadata = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    const metas = await ctx.db
      .query('fileMetadata')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .take(2000)
    if (metas.length > 0) {
      return metas.map(({ _id, fileId, ...meta }) => ({ _id: fileId, ...meta }))
    }

    // Transitional fallback for projects created before metadata projection backfill.
    // Keep callers working, but prefer running files.backfillMetadata so hot paths
    // read only fileMetadata afterwards.
    const files = await ctx.db
      .query('files')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .take(2000)
    return files.map((file) => {
      const { content, ...meta } = file
      return {
        ...meta,
        size: content?.length ?? 0,
        contentHash: hashContent(content ?? ''),
      }
    })
  },
})

// get (query) - get file by id
export const get = query({
  args: { id: v.id('files') },
  handler: async (ctx, args) => {
    await requireFileOwner(ctx, args.id)
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
    await requireProjectOwner(ctx, args.projectId)
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
    await requireProjectOwner(ctx, args.projectId)
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
      const { file: existing } = await requireFileOwner(ctx, args.id)
      if (existing.projectId !== args.projectId) {
        throw new Error('File does not belong to the specified project')
      }

      if (args.path !== existing.path) {
        const pathConflict = await ctx.db
          .query('files')
          .withIndex('by_path', (q) => q.eq('projectId', args.projectId).eq('path', args.path))
          .unique()
        if (pathConflict && pathConflict._id !== args.id) {
          throw new Error(`File already exists at path: ${args.path}`)
        }
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
        path: args.path,
        content: args.content,
        isBinary: args.isBinary,
        updatedAt: now,
      })
      await upsertFileMetadata(ctx, {
        _id: args.id,
        projectId: args.projectId,
        path: args.path,
        content: args.content ?? existing.content,
        isBinary: args.isBinary,
        updatedAt: now,
      })

      return args.id
    } else {
      await requireProjectOwner(ctx, args.projectId)
      const existingByPath = await ctx.db
        .query('files')
        .withIndex('by_path', (q) => q.eq('projectId', args.projectId).eq('path', args.path))
        .unique()
      if (existingByPath) {
        throw new Error(`File already exists at path: ${args.path}`)
      }

      // Create new file
      const fileId = await ctx.db.insert('files', {
        projectId: args.projectId,
        path: args.path,
        content: args.content,
        isBinary: args.isBinary,
        updatedAt: now,
      })
      await upsertFileMetadata(ctx, {
        _id: fileId,
        projectId: args.projectId,
        path: args.path,
        content: args.content,
        isBinary: args.isBinary,
        updatedAt: now,
      })
      return fileId
    }
  },
})

// rename (mutation) - move a file without requiring file content in the payload
export const rename = mutation({
  args: {
    id: v.id('files'),
    projectId: v.id('projects'),
    path: v.string(),
  },
  handler: async (ctx, args) => {
    const { file: existing } = await requireFileOwner(ctx, args.id)
    if (existing.projectId !== args.projectId) {
      throw new Error('File does not belong to the specified project')
    }

    const pathConflict = await ctx.db
      .query('files')
      .withIndex('by_path', (q) => q.eq('projectId', args.projectId).eq('path', args.path))
      .unique()

    if (pathConflict && pathConflict._id !== args.id) {
      throw new Error(`File already exists at path: ${args.path}`)
    }

    const now = Date.now()
    await ctx.db.patch(args.id, { path: args.path, updatedAt: now })
    await upsertFileMetadata(ctx, { ...existing, path: args.path, updatedAt: now })
    return args.id
  },
})

// remove (mutation) - delete file and its snapshots
export const remove = mutation({
  args: { id: v.id('files') },
  handler: async (ctx, args) => {
    await requireFileOwner(ctx, args.id)

    // Delete all snapshots for this file
    const snapshots = await ctx.db
      .query('fileSnapshots')
      .withIndex('by_file', (q) => q.eq('fileId', args.id))
      .take(2000)

    for (const snapshot of snapshots) {
      await ctx.db.delete(snapshot._id)
    }

    await removeFileMetadata(ctx, args.id)

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
    await requireFileOwner(ctx, args.fileId)

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
    await requireFileOwner(ctx, args.fileId)
    return await ctx.db
      .query('fileSnapshots')
      .withIndex('by_file', (q) => q.eq('fileId', args.fileId))
      .order('desc')
      .take(2000)
  },
})

// backfillMetadata (mutation) - transitional repair for existing/directly imported files
export const backfillMetadata = mutation({
  args: { projectId: v.id('projects'), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    const files = await ctx.db
      .query('files')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .take(Math.min(Math.max(args.limit ?? 500, 1), 2000))
    let written = 0
    for (const file of files) {
      await upsertFileMetadata(ctx, file)
      written += 1
    }
    return { written, hasMore: files.length === Math.min(Math.max(args.limit ?? 500, 1), 2000) }
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
