import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('GitHub sync state contract', () => {
  test('project schema records durable sync baseline and conflict state', () => {
    const schemaSource = fs.readFileSync(path.resolve(import.meta.dir, 'schema.ts'), 'utf8')

    expect(schemaSource).toContain('githubSyncState: v.optional(')
    expect(schemaSource).toContain('baseBranch: v.string()')
    expect(schemaSource).toContain('baseCommitSha: v.string()')
    expect(schemaSource).toContain('lastSyncedCommitSha: v.string()')
    expect(schemaSource).toContain('changedFiles: v.array(v.string())')
    expect(schemaSource).toContain("v.literal('remote_changed')")
    expect(schemaSource).toContain("v.literal('conflict')")
  })

  test('remote change detection never overwrites project files', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'githubConnections.ts'), 'utf8')
    const block = source.slice(
      source.indexOf('export const detectRemoteChange'),
      source.indexOf('export const createTaskBranch')
    )

    expect(block).toContain('remoteCommitSha !== syncState.lastSyncedCommitSha')
    expect(block).toContain("? 'conflict'")
    expect(block).toContain("'remote_changed'")
    expect(block).not.toContain("ctx.db.insert('files'")
    expect(block).not.toContain('ctx.db.patch(existing._id')
  })
})
