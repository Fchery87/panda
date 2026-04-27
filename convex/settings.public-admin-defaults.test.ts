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

  test('does not return raw global provider configs from effective user settings', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dir, 'settings.ts'), 'utf8')

    const getEffectiveStart = source.indexOf('export const getEffective = query({')
    const getAdminDefaultsStart = source.indexOf('export const getAdminDefaults = query({')
    const getEffectiveBlock = source.slice(getEffectiveStart, getAdminDefaultsStart)

    expect(getEffectiveBlock).not.toContain(
      'effectiveProviderConfigs = adminSettings.globalProviderConfigs'
    )
    expect(getEffectiveBlock).not.toContain('providerConfigs: effectiveProviderConfigs')
  })
})
