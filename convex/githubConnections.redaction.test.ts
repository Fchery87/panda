import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('GitHub connection metadata', () => {
  test('schema stores installation metadata without token fields', () => {
    const schemaSource = fs.readFileSync(path.resolve(import.meta.dir, 'schema.ts'), 'utf8')

    expect(schemaSource).toContain('githubConnections: defineTable({')
    expect(schemaSource).toContain('installationId: v.string()')
    expect(schemaSource).toContain('accountLogin: v.string()')
    expect(schemaSource).toContain(".index('by_user_installation', ['userId', 'installationId'])")
    expect(schemaSource).not.toContain('githubAccessToken')
    expect(schemaSource).not.toContain('installationToken')
  })

  test('status query returns redacted connection metadata only', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'githubConnections.ts'), 'utf8')
    const getStatusBlock = source.slice(
      source.indexOf('export const getStatus'),
      source.indexOf('export const getInstallUrl')
    )

    expect(getStatusBlock).toContain('connected: true')
    expect(getStatusBlock).toContain('accountLogin: connection.accountLogin')
    expect(getStatusBlock).toContain('repositorySelection: connection.repositorySelection')
    expect(getStatusBlock).not.toContain('token')
    expect(getStatusBlock).not.toContain('installationToken')
  })
})
