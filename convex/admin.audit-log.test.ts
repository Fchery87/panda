import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('admin settings audit logging', () => {
  test('records UPDATE_SETTINGS entries when admin settings change', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'admin.ts'), 'utf8')

    const updateStart = source.indexOf('export const updateSettings = mutation({')
    const listUsersStart = source.indexOf('export const listUsers = query({')
    const updateBlock = source.slice(updateStart, listUsersStart)

    expect(updateBlock).toContain("await ctx.db.insert('auditLog'")
    expect(updateBlock).toContain("action: 'UPDATE_SETTINGS'")
    expect(updateBlock).toContain("resource: 'adminSettings'")
    expect(updateBlock).toContain('details:')
  })
})
