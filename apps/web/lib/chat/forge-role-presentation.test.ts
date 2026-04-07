import { describe, expect, test } from 'bun:test'
import {
  getForgeRolePresentationForMode,
  mapChatModeToForgeRole,
  mapForgeRoleToChatMode,
} from './forge-role-presentation'

describe('forge role presentation', () => {
  test('maps architect to executive', () => {
    expect(mapChatModeToForgeRole('architect')).toBe('executive')
    expect(mapForgeRoleToChatMode('executive')).toBe('architect')
  })

  test('maps code and ask compatibility modes to manager', () => {
    expect(mapChatModeToForgeRole('code')).toBe('manager')
    expect(mapChatModeToForgeRole('ask')).toBe('manager')
    expect(mapForgeRoleToChatMode('manager')).toBe('code')
  })

  test('maps build to builder', () => {
    expect(mapChatModeToForgeRole('build')).toBe('builder')
    expect(mapForgeRoleToChatMode('builder')).toBe('build')
  })

  test('exposes presentation copy for the active mode', () => {
    expect(getForgeRolePresentationForMode('build')).toEqual(
      expect.objectContaining({
        role: 'builder',
        label: 'Builder',
      })
    )
  })
})
