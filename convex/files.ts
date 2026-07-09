import { query, mutation, internalMutation, action } from './_generated/server'
import { api } from './_generated/api'
import { v } from 'convex/values'
import JSZip from 'jszip'
import { requireFileOwner, requireProjectOwner } from './lib/authz'
import {
  buildContentFieldsForOptionalContent,
  deleteUnreferencedFileContents,
  ensureInlineTextContent,
  hydrateFileForPublicRead,
  hydrateSnapshotForPublicRead,
  resolveContent,
  sha256Hex,
  utf8Size,
} from './lib/fileContentStore'
import type { Id } from './_generated/dataModel'
import type { MutationCtx } from './_generated/server'

type FileMetadataSource = {
  _id: Id<'files'>
  projectId: Id<'projects'>
  path: string
  content?: string
  contentHash?: string
  contentSize?: number
  isBinary?: boolean
  updatedAt: number
}

async function toMetadataPayload(file: FileMetadataSource) {
  const content = file.content ?? ''
  return {
    fileId: file._id,
    projectId: file.projectId,
    path: file.path,
    isBinary: file.isBinary,
    size: file.contentSize ?? utf8Size(content),
    contentHash: file.contentHash ?? (await sha256Hex(content)),
    updatedAt: file.updatedAt,
  }
}

async function upsertFileMetadata(ctx: MutationCtx, file: FileMetadataSource) {
  const payload = await toMetadataPayload(file)
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
    const files = await ctx.db
      .query('files')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .take(2000)
    return await Promise.all(files.map((file) => hydrateFileForPublicRead(ctx, file)))
  },
})

// listMetadata (query) - hot file metadata projection without content reads
export const listMetadata = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const { project } = await requireProjectOwner(ctx, args.projectId)
    const metas = await ctx.db
      .query('fileMetadata')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .take(2000)
    const projected = metas.map(({ _id, fileId, ...meta }) => ({ _id: fileId, ...meta }))
    if (project.fileMetadataBackfilledAt !== undefined) {
      return projected.sort((a, b) => a.path.localeCompare(b.path))
    }

    const projectedFileIds = new Set(metas.map((meta) => meta.fileId))

    // Transitional fallback for projects created before metadata projection backfill.
    // Merge missing legacy rows instead of switching to metadata-only as soon as the
    // first projected row exists. This preserves hot file-tree correctness during
    // partial backfills or first writes on old projects.
    const files = await ctx.db
      .query('files')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .take(2000)
    const missingLegacy = files.filter((file) => !projectedFileIds.has(file._id))
    const legacyProjected = await Promise.all(
      missingLegacy.map(async (file) => {
        const content =
          (await resolveContent(ctx, {
            legacyContent: file.content,
            contentRef: file.contentRef,
          })) ?? ''
        return {
          _id: file._id,
          _creationTime: file._creationTime,
          projectId: file.projectId,
          path: file.path,
          isBinary: file.isBinary,
          updatedAt: file.updatedAt,
          size: file.contentSize ?? utf8Size(content),
          contentHash: file.contentHash ?? (await sha256Hex(content)),
        }
      })
    )

    return [...projected, ...legacyProjected].sort((a, b) => a.path.localeCompare(b.path))
  },
})

// get (query) - get file by id
export const get = query({
  args: { id: v.id('files') },
  handler: async (ctx, args) => {
    await requireFileOwner(ctx, args.id)
    const file = await ctx.db.get(args.id)
    if (!file) return null
    return await hydrateFileForPublicRead(ctx, file)
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
    const file = await ctx.db
      .query('files')
      .withIndex('by_path', (q) => q.eq('projectId', args.projectId).eq('path', args.path))
      .unique()
    if (!file) return null
    return await hydrateFileForPublicRead(ctx, file)
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
        content: file
          ? ((await resolveContent(ctx, {
              legacyContent: file.content,
              contentRef: file.contentRef,
            })) ?? null)
          : null,
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

      const pathChanged = args.path !== existing.path
      const contentChanged = args.content !== undefined && args.content !== existing.content
      const isBinaryChanged = args.isBinary !== undefined && args.isBinary !== existing.isBinary

      if (!pathChanged && !contentChanged && !isBinaryChanged) {
        return args.id
      }

      if (pathChanged) {
        const pathConflict = await ctx.db
          .query('files')
          .withIndex('by_path', (q) => q.eq('projectId', args.projectId).eq('path', args.path))
          .unique()
        if (pathConflict && pathConflict._id !== args.id) {
          throw new Error(`File already exists at path: ${args.path}`)
        }
      }

      const nextContentFields = await buildContentFieldsForOptionalContent(ctx, {
        projectId: args.projectId,
        content: args.content,
        isBinary: args.isBinary ?? existing.isBinary,
      })

      // Check if content has changed for snapshot
      if (contentChanged) {
        // Create snapshot before updating, but do not duplicate the same automatic snapshot body
        const lastSnapshot = await ctx.db
          .query('fileSnapshots')
          .withIndex('by_file', (q) => q.eq('fileId', args.id!))
          .order('desc')
          .first()

        const snapshotContent =
          (await resolveContent(ctx, {
            legacyContent: existing.content,
            contentRef: existing.contentRef,
          })) ?? ''
        const snapshotContentFields = await ensureInlineTextContent(ctx, {
          projectId: args.projectId,
          content: snapshotContent,
          isBinary: existing.isBinary,
        })
        if (
          !lastSnapshot ||
          (lastSnapshot.contentHash ?? '') !== snapshotContentFields.contentHash ||
          (lastSnapshot.contentSize ?? -1) !== snapshotContentFields.contentSize
        ) {
          const snapshotNumber = lastSnapshot ? lastSnapshot.snapshotNumber + 1 : 1

          await ctx.db.insert('fileSnapshots', {
            fileId: args.id,
            snapshotNumber,
            content: snapshotContent,
            contentRef: snapshotContentFields.contentRef,
            contentHash: snapshotContentFields.contentHash,
            contentSize: snapshotContentFields.contentSize,
            createdAt: now,
          })
        }
      }

      const patch: Partial<typeof existing> = {
        path: args.path,
        ...nextContentFields,
        updatedAt: now,
      }
      if (args.content !== undefined) patch.content = args.content
      if (args.isBinary !== undefined) patch.isBinary = args.isBinary

      await ctx.db.patch(args.id, patch)
      await upsertFileMetadata(ctx, {
        _id: args.id,
        projectId: args.projectId,
        path: args.path,
        content: args.content ?? existing.content,
        contentHash: nextContentFields.contentHash ?? existing.contentHash,
        contentSize: nextContentFields.contentSize ?? existing.contentSize,
        isBinary: args.isBinary ?? existing.isBinary,
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

      const contentFields = await buildContentFieldsForOptionalContent(ctx, {
        projectId: args.projectId,
        content: args.content,
        isBinary: args.isBinary,
      })

      // Create new file
      const fileId = await ctx.db.insert('files', {
        projectId: args.projectId,
        path: args.path,
        content: args.content,
        ...contentFields,
        isBinary: args.isBinary,
        updatedAt: now,
      })
      await upsertFileMetadata(ctx, {
        _id: fileId,
        projectId: args.projectId,
        path: args.path,
        content: args.content,
        contentHash: contentFields.contentHash,
        contentSize: contentFields.contentSize,
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
    const { file } = await requireFileOwner(ctx, args.id)

    const contentRefs = [file.contentRef]
    const maxSnapshots = 5000
    let deletedSnapshots = 0

    // Delete all snapshots for this file before deleting the source file row.
    while (true) {
      const snapshots = await ctx.db
        .query('fileSnapshots')
        .withIndex('by_file', (q) => q.eq('fileId', args.id))
        .take(500)

      if (snapshots.length === 0) break
      if (deletedSnapshots + snapshots.length > maxSnapshots) {
        throw new Error(`Refusing to delete more than ${maxSnapshots} snapshots for one file`)
      }

      contentRefs.push(...snapshots.map((snapshot) => snapshot.contentRef))

      for (const snapshot of snapshots) {
        await ctx.db.delete(snapshot._id)
      }

      deletedSnapshots += snapshots.length
    }

    await removeFileMetadata(ctx, args.id)

    // Delete the file
    await ctx.db.delete(args.id)

    await deleteUnreferencedFileContents(ctx, contentRefs)

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
    const { file } = await requireFileOwner(ctx, args.fileId)
    const contentFields = await ensureInlineTextContent(ctx, {
      projectId: file.projectId,
      content: args.content,
      isBinary: file.isBinary,
    })

    const snapshotId = await ctx.db.insert('fileSnapshots', {
      fileId: args.fileId,
      snapshotNumber,
      content: args.content,
      contentRef: contentFields.contentRef,
      contentHash: contentFields.contentHash,
      contentSize: contentFields.contentSize,
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
    const snapshots = await ctx.db
      .query('fileSnapshots')
      .withIndex('by_file', (q) => q.eq('fileId', args.fileId))
      .order('desc')
      .take(2000)
    return await Promise.all(
      snapshots.map((snapshot) => hydrateSnapshotForPublicRead(ctx, snapshot))
    )
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
    const limit = Math.min(Math.max(args.limit ?? 500, 1), 2000)
    for (const file of files) {
      const content =
        (await resolveContent(ctx, {
          legacyContent: file.content,
          contentRef: file.contentRef,
        })) ?? ''
      await upsertFileMetadata(ctx, {
        ...file,
        content,
        contentHash: file.contentHash,
        contentSize: file.contentSize,
      })
      written += 1
    }
    const hasMore = files.length === limit
    if (!hasMore) {
      await ctx.db.patch(args.projectId, { fileMetadataBackfilledAt: Date.now() })
    }

    return { written, hasMore }
  },
})

const backfillContentStoreArgs = {
  projectId: v.id('projects'),
  limit: v.optional(v.number()),
  afterPath: v.optional(v.string()),
  includeSnapshots: v.optional(v.boolean()),
  snapshotFileId: v.optional(v.id('files')),
  afterSnapshotNumber: v.optional(v.number()),
}

async function backfillContentStoreForProject(
  ctx: MutationCtx,
  args: {
    projectId: Id<'projects'>
    limit?: number
    afterPath?: string
    includeSnapshots?: boolean
    snapshotFileId?: Id<'files'>
    afterSnapshotNumber?: number
  }
) {
  const limit = Math.min(Math.max(args.limit ?? 100, 1), 500)
  const files = await ctx.db
    .query('files')
    .withIndex('by_path', (q) => {
      const scoped = q.eq('projectId', args.projectId)
      return args.afterPath ? scoped.gt('path', args.afterPath) : scoped
    })
    .take(limit)

  let filesScanned = 0
  let filesPatched = 0
  let snapshotsScanned = 0
  let snapshotsPatched = 0
  let hasMoreSnapshots = false
  let snapshotCursor: { fileId: Id<'files'>; afterSnapshotNumber: number; path: string } | undefined

  const processSnapshotBatch = async (
    file: NonNullable<(typeof files)[number]>,
    afterSnapshotNumber?: number
  ) => {
    const snapshotLimit = 100
    const snapshots = await ctx.db
      .query('fileSnapshots')
      .withIndex('by_snapshot', (q) => {
        const scoped = q.eq('fileId', file._id)
        return afterSnapshotNumber ? scoped.gt('snapshotNumber', afterSnapshotNumber) : scoped
      })
      .take(snapshotLimit)
    for (const snapshot of snapshots) {
      snapshotsScanned += 1
      const snapshotContent = await resolveContent(ctx, {
        legacyContent: snapshot.content,
        contentRef: snapshot.contentRef,
      })
      if (snapshotContent === undefined) continue
      const snapshotContentFields = await ensureInlineTextContent(ctx, {
        projectId: file.projectId,
        content: snapshotContent,
        isBinary: file.isBinary,
      })
      if (
        snapshot.contentRef !== snapshotContentFields.contentRef ||
        snapshot.contentHash !== snapshotContentFields.contentHash ||
        snapshot.contentSize !== snapshotContentFields.contentSize
      ) {
        await ctx.db.patch(snapshot._id, snapshotContentFields)
        snapshotsPatched += 1
      }
    }

    const lastSnapshot = snapshots[snapshots.length - 1]
    if (snapshots.length === snapshotLimit && lastSnapshot) {
      hasMoreSnapshots = true
      snapshotCursor = {
        fileId: file._id,
        afterSnapshotNumber: lastSnapshot.snapshotNumber,
        path: file.path,
      }
    }
  }

  if (args.snapshotFileId) {
    const snapshotFile = await ctx.db.get(args.snapshotFileId)
    if (!snapshotFile || snapshotFile.projectId !== args.projectId) {
      throw new Error('Snapshot backfill file does not belong to the specified project')
    }
    await processSnapshotBatch(snapshotFile, args.afterSnapshotNumber)
    return {
      filesScanned,
      filesPatched,
      snapshotsScanned,
      snapshotsPatched,
      nextAfterPath: args.afterPath,
      hasMore: hasMoreSnapshots,
      hasMoreSnapshots,
      snapshotCursor,
    }
  }

  for (const file of files) {
    filesScanned += 1
    const content = await resolveContent(ctx, {
      legacyContent: file.content,
      contentRef: file.contentRef,
    })
    if (content !== undefined) {
      const contentFields = await ensureInlineTextContent(ctx, {
        projectId: file.projectId,
        content,
        isBinary: file.isBinary,
      })
      if (
        file.contentRef !== contentFields.contentRef ||
        file.contentHash !== contentFields.contentHash ||
        file.contentSize !== contentFields.contentSize
      ) {
        await ctx.db.patch(file._id, contentFields)
        filesPatched += 1
      }
      await upsertFileMetadata(ctx, {
        ...file,
        content,
        contentHash: contentFields.contentHash,
        contentSize: contentFields.contentSize,
      })
    }

    if (args.includeSnapshots && !hasMoreSnapshots) {
      await processSnapshotBatch(file)
      if (hasMoreSnapshots) break
    }
  }

  const lastFile = files[files.length - 1]
  return {
    filesScanned,
    filesPatched,
    snapshotsScanned,
    snapshotsPatched,
    nextAfterPath: snapshotCursor?.path ?? lastFile?.path,
    hasMore: hasMoreSnapshots || files.length === limit,
    hasMoreSnapshots,
    snapshotCursor,
  }
}

// backfillContentStore (mutation) - owner-checked non-destructive repair for legacy inline file content
export const backfillContentStore = mutation({
  args: backfillContentStoreArgs,
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    return await backfillContentStoreForProject(ctx, args)
  },
})

// backfillContentStoreInternal (internalMutation) - maintenance entry point for bounded operational backfill observation.
export const backfillContentStoreInternal = internalMutation({
  args: backfillContentStoreArgs,
  handler: async (ctx, args) => {
    return await backfillContentStoreForProject(ctx, args)
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
