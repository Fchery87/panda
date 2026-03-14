import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('admin user pagination', () => {
  test('applies cursor pagination instead of returning a placeholder nextCursor', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'admin.ts'), 'utf8')

    const listUsersStart = source.indexOf('export const listUsers = query({')
    const getUserDetailsStart = source.indexOf('export const getUserDetails = query({')
    const listUsersBlock = source.slice(listUsersStart, getUserDetailsStart)

    expect(listUsersBlock).toContain("ctx.db.get(args.cursor as Id<'users'>)")
    expect(listUsersBlock).toContain('allUsers = allUsers.filter')
    expect(listUsersBlock).toContain('nextCursor: hasMore ? results[results.length - 1]._id : null')
  })
})
