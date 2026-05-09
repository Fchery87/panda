import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('GitHub pull request draft and creation flow', () => {
  test('schema stores draft and created pull request states', () => {
    const schemaSource = fs.readFileSync(path.resolve(import.meta.dir, 'schema.ts'), 'utf8')

    expect(schemaSource).toContain('githubPullRequests: defineTable({')
    expect(schemaSource).toContain("v.literal('draft')")
    expect(schemaSource).toContain("v.literal('created')")
    expect(schemaSource).toContain('confirmedAt: v.optional(v.number())')
  })

  test('PR creation requires pushed commit and explicit confirmation', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'githubConnections.ts'), 'utf8')
    const draftBlock = source.slice(
      source.indexOf('export const createPullRequestDraft'),
      source.indexOf('export const confirmCreatePullRequest')
    )
    const confirmBlock = source.slice(
      source.indexOf('export const confirmCreatePullRequest'),
      source.indexOf('export const getLatestPullRequestForProject')
    )

    expect(draftBlock).toContain('if (!commit.pushedAt)')
    expect(draftBlock).toContain('buildPullRequestBody')
    expect(confirmBlock).toContain('confirmed: v.boolean()')
    expect(confirmBlock).toContain('if (!args.confirmed)')
    expect(confirmBlock).toContain("status: 'created'")
  })
})
