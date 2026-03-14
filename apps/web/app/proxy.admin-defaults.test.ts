import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('proxy admin defaults enforcement', () => {
  test('loads public admin defaults in proxy to gate maintenance and registration earlier', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, '..', 'proxy.ts'), 'utf8')

    expect(source).toContain("import { ConvexHttpClient } from 'convex/browser'")
    expect(source).toContain('api.settings.getAdminDefaults')
    expect(source).toContain('shouldRedirectToMaintenance')
    expect(source).toContain('shouldRedirectToLoginDisabled')
  })
})
