import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('Convex auth identity source', () => {
  test('provider and sharing functions do not use identity.subject for user ownership lookups', () => {
    const providers = fs.readFileSync(path.resolve(import.meta.dir, 'providers.ts'), 'utf8')
    const sharing = fs.readFileSync(path.resolve(import.meta.dir, 'sharing.ts'), 'utf8')

    expect(providers).not.toContain('identity.subject')
    expect(sharing).not.toContain('identity.subject')
  })
})
