import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('admin user pagination', () => {
  test('uses bounded Convex pagination and indexed admin/banned filters', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'admin.ts'), 'utf8')

    const listUsersStart = source.indexOf('export const listUsers = query({')
    const getUserDetailsStart = source.indexOf('export const getUserDetails = query({')
    const listUsersBlock = source.slice(listUsersStart, getUserDetailsStart)

    expect(listUsersBlock).toContain('const paginationOpts = { numItems: limit')
    expect(listUsersBlock).toContain('paginate(paginationOpts)')
    expect(listUsersBlock).toContain("withIndex('by_admin'")
    expect(listUsersBlock).toContain("withIndex('by_banned'")
    expect(listUsersBlock).toContain('hasMore: !page.isDone')
    expect(listUsersBlock).toContain('nextCursor: page.isDone ? null : page.continueCursor')
    expect(listUsersBlock).not.toContain("ctx.db.get(args.cursor as Id<'users'>)")
    expect(listUsersBlock).not.toContain('allUsers = allUsers.filter')
    expect(listUsersBlock).not.toContain('limit * 5')
  })
})
