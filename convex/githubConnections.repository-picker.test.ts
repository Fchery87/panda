import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('GitHub repository picker backend contract', () => {
  test('project schema stores exactly one linked GitHub repository', () => {
    const schemaSource = fs.readFileSync(path.resolve(import.meta.dir, 'schema.ts'), 'utf8')

    expect(schemaSource).toContain('githubRepository: v.optional(')
    expect(schemaSource).toContain("connectionId: v.id('githubConnections')")
    expect(schemaSource).toContain('repositoryId: v.string()')
    expect(schemaSource).toContain('fullName: v.string()')
    expect(schemaSource).not.toContain('githubRepositories: v.array')
  })

  test('repository listing is bounded and does not expose token values', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'githubConnections.ts'), 'utf8')
    const listBlock = source.slice(
      source.indexOf('export const listAuthorizedRepositories'),
      source.indexOf('export const linkRepositoryToProject')
    )

    expect(listBlock).toContain('limit: v.optional(v.number())')
    expect(listBlock).toContain('args.limit ?? 25')
    expect(listBlock).toContain('connected: true')
    expect(listBlock).not.toContain('accessToken')
    expect(listBlock).not.toContain('installationToken')
  })
})
