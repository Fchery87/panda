import { describe, expect, test } from 'bun:test'
import { sortAuditLogsNewestFirst } from './admin'
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

  test('returns filtered audit logs in newest-first order before truncating', () => {
    const ordered = sortAuditLogsNewestFirst([
      { createdAt: 1000, action: 'UPDATE_SETTINGS' },
      { createdAt: 3000, action: 'BAN_USER' },
      { createdAt: 2000, action: 'REVOKE_ADMIN' },
    ])

    expect(ordered.map((log) => log.createdAt)).toEqual([3000, 2000, 1000])
  })

  test('applies newest-first sorting inside getAuditLog before slicing', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'admin.ts'), 'utf8')

    const getAuditLogStart = source.indexOf('export const getAuditLog = query({')
    const checkIsAdminStart = source.indexOf('export const checkIsAdmin = query({')
    const auditLogBlock = source.slice(getAuditLogStart, checkIsAdminStart)

    expect(auditLogBlock).toContain('sortAuditLogsNewestFirst(actorFilteredLogs).slice(0, limit)')
  })
})
