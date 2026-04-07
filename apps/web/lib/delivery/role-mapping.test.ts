import { describe, expect, test } from 'bun:test'
import { mapChatModeToDeliveryRole } from './role-mapping'

describe('delivery role mapping', () => {
  test('maps build mode to builder', () => {
    expect(mapChatModeToDeliveryRole('build')).toBe('builder')
  })

  test('maps ask/code to manager and architect to executive', () => {
    expect(mapChatModeToDeliveryRole('ask')).toBe('manager')
    expect(mapChatModeToDeliveryRole('code')).toBe('manager')
    expect(mapChatModeToDeliveryRole('architect')).toBe('executive')
  })
})
