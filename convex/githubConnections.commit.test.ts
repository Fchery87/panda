import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('GitHub working-copy commit flow', () => {
  test('schema stores Panda-authored commit attribution', () => {
    const schemaSource = fs.readFileSync(path.resolve(import.meta.dir, 'schema.ts'), 'utf8')

    expect(schemaSource).toContain('githubCommits: defineTable({')
    expect(schemaSource).toContain('authorName: v.string()')
    expect(schemaSource).toContain("requestedBy: v.id('users')")
    expect(schemaSource).toContain(".index('by_project_branch', ['projectId', 'branch'])")
  })

  test('commitWorkingCopy requires a Panda branch and user attribution', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'githubConnections.ts'), 'utf8')
    const block = source.slice(
      source.indexOf('export const commitWorkingCopy'),
      source.indexOf('export const upsertConnectionForInstallation')
    )

    expect(block).toContain('!syncState?.workingBranch')
    expect(block).toContain('Panda GitHub App')
    expect(block).toContain('Requested by Panda user')
    expect(block).toContain("await ctx.db.insert('githubCommits'")
    expect(block).toContain('changedFiles: []')
  })
})
