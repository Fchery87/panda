import { describe, expect, test } from 'bun:test'
import { mapChatModeToDeliveryRole } from './role-mapping'

describe('delivery role mapping', () => {
  test('maps build/code modes to builder', () => {
    expect(mapChatModeToDeliveryRole('build')).toBe('builder')
    expect(mapChatModeToDeliveryRole('code')).toBe('builder')
  })

  test('maps ask to manager and architect to executive', () => {
    expect(mapChatModeToDeliveryRole('ask')).toBe('manager')
    expect(mapChatModeToDeliveryRole('architect')).toBe('executive')
  })
})
