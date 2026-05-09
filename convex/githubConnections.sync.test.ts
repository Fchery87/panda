import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('GitHub explicit sync flow', () => {
  test('syncFromGitHub refuses to overwrite dirty working copies', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'githubConnections.ts'), 'utf8')
    const block = source.slice(
      source.indexOf('export const syncFromGitHub'),
      source.indexOf('export const upsertConnectionForInstallation')
    )

    expect(block).toContain('if (syncState.changedFiles.length > 0)')
    expect(block).toContain("status: 'conflict'")
    expect(block).toContain('applied: false')
    expect(block).toContain("await ctx.db.insert('files'")
    expect(block).toContain('lastSyncedCommitSha: args.remoteCommitSha')
  })

  test('source control panel exposes explicit sync action', () => {
    const source = fs.readFileSync(
      path.resolve(import.meta.dir, '../apps/web/components/sidebar/SourceControlPane.tsx'),
      'utf8'
    )

    expect(source).toContain('syncFromGitHub')
    expect(source).toContain('Sync from GitHub')
    expect(source).toContain('handleSyncFromGitHub')
  })
})
