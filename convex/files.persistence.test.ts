import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('files persistence write reduction', () => {
  test('upsert skips unchanged existing files and preserves changed-file snapshot behavior', () => {
    const filesSource = fs.readFileSync(path.resolve(import.meta.dir, 'files.ts'), 'utf8')
    const upsertBody = filesSource.slice(
      filesSource.indexOf('export const upsert = mutation'),
      filesSource.indexOf('// rename (mutation)')
    )

    expect(upsertBody).toContain('const pathChanged = args.path !== existing.path')
    expect(upsertBody).toContain(
      'const contentChanged = args.content !== undefined && args.content !== existing.content'
    )
    expect(upsertBody).toContain(
      'const isBinaryChanged = args.isBinary !== undefined && args.isBinary !== existing.isBinary'
    )
    expect(upsertBody).toContain('if (!pathChanged && !contentChanged && !isBinaryChanged)')
    expect(upsertBody).toContain('return args.id')
    expect(upsertBody).toContain('if (contentChanged)')
    expect(upsertBody).toContain("ctx.db.insert('fileSnapshots'")
    expect(upsertBody).toContain('lastSnapshot.contentHash')
    expect(upsertBody).toContain('snapshotContentFields.contentHash')
    expect(upsertBody).toContain('contentRef: snapshotContentFields.contentRef')
    expect(upsertBody).toContain('...contentFields')
    expect(upsertBody).toContain("ctx.db.insert('files'")
    expect(upsertBody).toContain('await upsertFileMetadata(ctx')
  })

  test('file content store is additive, per-project, and non-destructive during backfill', () => {
    const schemaSource = fs.readFileSync(path.resolve(import.meta.dir, 'schema.ts'), 'utf8')
    const filesSource = fs.readFileSync(path.resolve(import.meta.dir, 'files.ts'), 'utf8')
    const helperSource = fs.readFileSync(
      path.resolve(import.meta.dir, 'lib', 'fileContentStore.ts'),
      'utf8'
    )
    const projectsSource = fs.readFileSync(path.resolve(import.meta.dir, 'projects.ts'), 'utf8')
    const githubConnectionsSource = fs.readFileSync(
      path.resolve(import.meta.dir, 'githubConnections.ts'),
      'utf8'
    )
    const githubSource = fs.readFileSync(path.resolve(import.meta.dir, 'github.ts'), 'utf8')
    const projectOverviewSource = fs.readFileSync(
      path.resolve(import.meta.dir, 'projectOverview.ts'),
      'utf8'
    )
    const memoryBankSource = fs.readFileSync(path.resolve(import.meta.dir, 'memoryBank.ts'), 'utf8')
    const adminSource = fs.readFileSync(path.resolve(import.meta.dir, 'admin.ts'), 'utf8')
    const retentionSource = fs.readFileSync(path.resolve(import.meta.dir, 'retention.ts'), 'utf8')

    expect(schemaSource).toContain('fileContents: defineTable')
    expect(schemaSource).toContain(
      ".index('by_project_hash_size', ['projectId', 'contentHash', 'size'])"
    )
    expect(schemaSource).toContain("hashAlgorithm: v.literal('sha256')")
    expect(schemaSource).toContain('fileMetadataBackfilledAt: v.optional(v.number())')
    expect(schemaSource).toContain("contentRef: v.optional(v.id('fileContents'))")
    expect(schemaSource).toContain(".index('by_content_ref', ['contentRef'])")
    expect(helperSource).toContain("crypto.subtle.digest('SHA-256'")
    expect(helperSource).toContain(
      "candidate.kind === 'inlineText' && candidate.content === args.content"
    )
    expect(helperSource).toContain('export async function deleteUnreferencedFileContents')
    expect(helperSource).toContain(".query('files')")
    expect(helperSource).toContain(".query('fileSnapshots')")
    expect(filesSource).toContain('project.fileMetadataBackfilledAt !== undefined')
    expect(filesSource).toContain('const projectedFileIds = new Set')
    expect(filesSource).toContain('const missingLegacy = files.filter')
    expect(filesSource).toContain('return [...projected, ...legacyProjected]')
    expect(filesSource).toContain('fileMetadataBackfilledAt: Date.now()')
    expect(filesSource).toContain('export const backfillContentStore = mutation')
    expect(filesSource).toContain('limit = Math.min(Math.max(args.limit ?? 100, 1), 500)')
    expect(filesSource).toContain("snapshotFileId: v.optional(v.id('files'))")
    expect(filesSource).toContain('afterSnapshotNumber: v.optional(v.number())')
    expect(filesSource).toContain('snapshotCursor')
    expect(filesSource).toContain('if (hasMoreSnapshots) break')
    expect(filesSource).toContain('hasMore: hasMoreSnapshots')
    expect(filesSource).toContain('nextAfterPath: snapshotCursor?.path ?? lastFile?.path')
    expect(filesSource).toContain('while (true)')
    expect(filesSource).toContain('deletedSnapshots + snapshots.length > maxSnapshots')
    expect(filesSource).toContain('deleteUnreferencedFileContents(ctx, contentRefs)')
    expect(filesSource).not.toContain('content: undefined')
    for (const directWriter of [
      projectsSource,
      githubConnectionsSource,
      githubSource,
      projectOverviewSource,
      memoryBankSource,
    ]) {
      expect(directWriter).toContain('upsertFileMetadataProjection(ctx')
    }
    for (const directWriter of [
      githubConnectionsSource,
      githubSource,
      projectOverviewSource,
      memoryBankSource,
    ]) {
      expect(directWriter).toContain('deleteUnreferencedFileContents')
    }
    expect(projectsSource).toContain('async function deleteProjectFilesWithSnapshots')
    expect(projectsSource).toContain('if (deleted + files.length > maxRows)')
    expect(projectsSource).toContain("deleteByIndex(ctx, 'fileMetadata', 'by_file'")
    expect(projectsSource).toContain('Cannot create GitHub project file without content')
    expect(projectsSource).toContain('fileMetadataBackfilledAt: now')
    expect(projectsSource).toContain('deleteProjectFileContents(ctx, args.id)')
    expect(adminSource).toContain('async function deleteProjectFilesWithSnapshots')
    expect(adminSource).toContain('if (deleted + files.length > maxRows)')
    expect(adminSource).toContain("deleteByIndex(ctx, 'fileMetadata', 'by_file'")
    expect(adminSource).toContain('deleteProjectFileContents(ctx, project._id)')
    expect(retentionSource).not.toContain('fileSnapshots')
  })

  test('github sync preserves existing metadata when file content is omitted', () => {
    const githubConnectionsSource = fs.readFileSync(
      path.resolve(import.meta.dir, 'githubConnections.ts'),
      'utf8'
    )

    expect(githubConnectionsSource).toContain('file.content !== undefined')
    expect(githubConnectionsSource).toContain('!existing && file.content === undefined && !file.isBinary')
    expect(githubConnectionsSource).toContain('Cannot sync new GitHub file without content')
    expect(githubConnectionsSource).toContain(
      'contentHash: contentFields.contentHash ?? existing?.contentHash'
    )
    expect(githubConnectionsSource).toContain(
      'contentSize: contentFields.contentSize ?? existing?.contentSize'
    )
  })
})
