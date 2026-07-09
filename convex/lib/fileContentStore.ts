import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'

type ReadCtx = QueryCtx | MutationCtx

const textEncoder = new TextEncoder()

function toHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function sha256Hex(content: string): Promise<string> {
  const bytes = textEncoder.encode(content)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return toHex(digest)
}

export function utf8Size(content: string): number {
  return textEncoder.encode(content).byteLength
}

export type FileContentFields = {
  contentRef: Id<'fileContents'>
  contentHash: string
  contentSize: number
}

export async function ensureInlineTextContent(
  ctx: MutationCtx,
  args: {
    projectId: Id<'projects'>
    content: string
    isBinary?: boolean
  }
): Promise<FileContentFields> {
  const contentHash = await sha256Hex(args.content)
  const contentSize = utf8Size(args.content)

  const candidates = await ctx.db
    .query('fileContents')
    .withIndex('by_project_hash_size', (q) =>
      q.eq('projectId', args.projectId).eq('contentHash', contentHash).eq('size', contentSize)
    )
    .take(20)

  const existing = candidates.find(
    (candidate) => candidate.kind === 'inlineText' && candidate.content === args.content
  )

  if (existing) {
    return {
      contentRef: existing._id,
      contentHash,
      contentSize,
    }
  }

  const now = Date.now()
  const contentRef = await ctx.db.insert('fileContents', {
    projectId: args.projectId,
    contentHash,
    hashAlgorithm: 'sha256',
    size: contentSize,
    kind: 'inlineText',
    content: args.content,
    isBinary: args.isBinary,
    createdAt: now,
    updatedAt: now,
  })

  return {
    contentRef,
    contentHash,
    contentSize,
  }
}

export async function buildContentFieldsForOptionalContent(
  ctx: MutationCtx,
  args: {
    projectId: Id<'projects'>
    content?: string
    isBinary?: boolean
  }
): Promise<Partial<FileContentFields>> {
  if (args.content === undefined) return {}
  return await ensureInlineTextContent(ctx, {
    projectId: args.projectId,
    content: args.content,
    isBinary: args.isBinary,
  })
}

export async function resolveContent(
  ctx: ReadCtx,
  args: {
    legacyContent?: string
    contentRef?: Id<'fileContents'>
  }
): Promise<string | undefined> {
  if (args.legacyContent !== undefined) return args.legacyContent
  if (!args.contentRef) return undefined

  const stored = await ctx.db.get(args.contentRef)
  if (!stored) return undefined
  if (stored.kind === 'inlineText') return stored.content

  // Storage-backed rows are reserved for the same seam. Existing public APIs still
  // return `content: string`, so storage-only reads must stay behind future API work.
  return undefined
}

export async function hydrateFileForPublicRead(ctx: ReadCtx, file: Doc<'files'>) {
  const content = await resolveContent(ctx, {
    legacyContent: file.content,
    contentRef: file.contentRef,
  })

  return {
    _id: file._id,
    _creationTime: file._creationTime,
    projectId: file.projectId,
    path: file.path,
    content,
    isBinary: file.isBinary,
    updatedAt: file.updatedAt,
  }
}

export async function hydrateSnapshotForPublicRead(ctx: ReadCtx, snapshot: Doc<'fileSnapshots'>) {
  const content =
    (await resolveContent(ctx, {
      legacyContent: snapshot.content,
      contentRef: snapshot.contentRef,
    })) ?? ''

  return {
    _id: snapshot._id,
    _creationTime: snapshot._creationTime,
    fileId: snapshot.fileId,
    snapshotNumber: snapshot.snapshotNumber,
    content,
    createdAt: snapshot.createdAt,
  }
}

export async function upsertFileMetadataProjection(
  ctx: MutationCtx,
  args: {
    fileId: Id<'files'>
    projectId: Id<'projects'>
    path: string
    content?: string
    contentHash?: string
    contentSize?: number
    isBinary?: boolean
    updatedAt: number
  }
) {
  const content = args.content ?? ''
  const payload = {
    fileId: args.fileId,
    projectId: args.projectId,
    path: args.path,
    isBinary: args.isBinary,
    size: args.contentSize ?? utf8Size(content),
    contentHash: args.contentHash ?? (await sha256Hex(content)),
    updatedAt: args.updatedAt,
  }
  const existing = await ctx.db
    .query('fileMetadata')
    .withIndex('by_file', (q) => q.eq('fileId', args.fileId))
    .unique()
  if (existing) {
    await ctx.db.patch(existing._id, payload)
  } else {
    await ctx.db.insert('fileMetadata', payload)
  }
}

export async function deleteUnreferencedFileContents(
  ctx: MutationCtx,
  refs: Array<Id<'fileContents'> | undefined>
) {
  const uniqueRefs = [...new Set(refs.filter((ref): ref is Id<'fileContents'> => Boolean(ref)))]
  let deleted = 0

  for (const ref of uniqueRefs) {
    const fileReference = await ctx.db
      .query('files')
      .withIndex('by_content_ref', (q) => q.eq('contentRef', ref))
      .first()
    if (fileReference) continue

    const snapshotReference = await ctx.db
      .query('fileSnapshots')
      .withIndex('by_content_ref', (q) => q.eq('contentRef', ref))
      .first()
    if (snapshotReference) continue

    const row = await ctx.db.get(ref)
    if (!row) continue

    if (row.kind === 'storage' && row.storageId) {
      await ctx.storage.delete(row.storageId)
    }
    await ctx.db.delete(row._id)
    deleted += 1
  }

  return deleted
}

export async function deleteProjectFileContents(ctx: MutationCtx, projectId: Id<'projects'>) {
  const batchSize = 1000
  const maxRows = 5000
  let deleted = 0

  while (true) {
    const rows = await ctx.db
      .query('fileContents')
      .withIndex('by_project_created', (q) => q.eq('projectId', projectId))
      .take(batchSize)

    if (rows.length === 0) return deleted
    if (deleted + rows.length > maxRows) {
      throw new Error('Project file content deletion exceeded the 5000-row safety ceiling')
    }

    for (const row of rows) {
      if (row.kind === 'storage' && row.storageId) {
        await ctx.storage.delete(row.storageId)
      }
      await ctx.db.delete(row._id)
    }

    deleted += rows.length
  }
}
