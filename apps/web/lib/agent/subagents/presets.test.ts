import { describe, expect, test } from 'bun:test'
import {
  capabilitiesForPreset,
  isMutatingPermissionSet,
  normalizeSubagentName,
  permissionForPreset,
} from './presets'

describe('subagent capability presets', () => {
  test('normalizes user-facing names into runtime-safe slugs', () => {
    expect(normalizeSubagentName(' My Review Agent! ')).toBe('my-review-agent')
    expect(normalizeSubagentName('---')).toBe('')
  })

  test('maps research to read/search without mutation', () => {
    const permission = permissionForPreset('research')

    expect(permission.read_files).toBe('allow')
    expect(permission.search_code).toBe('allow')
    expect(permission.write_files).toBe('deny')
    expect(permission.run_command).toBe('deny')
    expect(capabilitiesForPreset('research')).toEqual(['read', 'search'])
    expect(isMutatingPermissionSet(permission)).toBe(false)
  })

  test('marks assistant and builder presets as mutating because they can request or perform writes', () => {
    expect(isMutatingPermissionSet(permissionForPreset('assistant'))).toBe(true)
    expect(isMutatingPermissionSet(permissionForPreset('builder'))).toBe(true)
    expect(capabilitiesForPreset('builder')).toEqual(['read', 'search', 'edit', 'exec'])
  })
})
