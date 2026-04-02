import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

import { resolveAdminUserIdFromUrlValue } from './admin'

describe('admin user id resolution', () => {
  test('normalizes valid URL ids and rejects malformed or stale ids', async () => {
    const ctx = {
      db: {
        normalizeId(table: string, value: string) {
          if (table !== 'users') return null
          if (value === 'valid-user-id') return 'normalized-user-id'
          return null
        },
        async get(id: string) {
          return id === 'normalized-user-id' ? { _id: id } : null
        },
      },
    } as const

    await expect(resolveAdminUserIdFromUrlValue(ctx, 'not-a-convex-id')).resolves.toBeNull()
    await expect(resolveAdminUserIdFromUrlValue(ctx, 'valid-user-id')).resolves.toBe(
      'normalized-user-id'
    )
    await expect(resolveAdminUserIdFromUrlValue(ctx, 'stale-user-id')).resolves.toBeNull()
  })

  test('exports a public Convex query for client-side URL resolution', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'admin.ts'), 'utf8')

    expect(source).toContain('export const resolveAdminUserIdFromUrl = query({')
    expect(source).toContain('resolveAdminUserIdFromUrlValue(ctx, args.userId)')
  })
})
