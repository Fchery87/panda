import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('settings public admin defaults', () => {
  test('exposes registration and maintenance flags to unauthenticated UI', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'settings.ts'), 'utf8')

    const getAdminDefaultsStart = source.indexOf('export const getAdminDefaults = query({')
    const updateStart = source.indexOf('// update (mutation) - update or create settings')
    const getAdminDefaultsBlock = source.slice(getAdminDefaultsStart, updateStart)

    expect(getAdminDefaultsBlock).toContain(
      'registrationEnabled: adminSettings.registrationEnabled ?? true'
    )
    expect(getAdminDefaultsBlock).toContain(
      'systemMaintenance: adminSettings.systemMaintenance ?? false'
    )
  })
})
