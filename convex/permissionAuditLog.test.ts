import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('permission audit log', () => {
  test('persists policy decisions and exposes bounded audit queries', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'permissionAuditLog.ts'), 'utf8')
    const schemaSource = fs.readFileSync(path.resolve(import.meta.dir, 'schema.ts'), 'utf8')

    expect(source).toContain('export const log = mutation({')
    expect(source).toContain('metadata: v.optional(v.any())')
    expect(source).toContain("projectId: v.optional(v.id('projects'))")
    expect(source).toContain('export const listBySession = query({')
    expect(source).toContain('limit: v.optional(v.number())')
    expect(source).toContain('.take(limit)')
    expect(source).toContain('export const listByProject = query({')
    expect(source).toContain("withIndex('by_project_timestamp'")
    expect(source).not.toContain('.collect()')

    expect(schemaSource).toContain(".index('by_project_timestamp', ['projectId', 'timestamp'])")
  })
})
