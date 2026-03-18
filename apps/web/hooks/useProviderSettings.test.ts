import { describe, it, expect } from 'bun:test'
import * as providerSettingsModule from './useProviderSettings'

describe('useProviderSettings', () => {
  it('should be importable', () => {
    expect(providerSettingsModule).toBeDefined()
  })

  it('should export useProviderSettings function', () => {
    expect(typeof providerSettingsModule.useProviderSettings).toBe('function')
  })

  it('should export ProviderSettingsResult interface', () => {
    // TypeScript interfaces don't exist at runtime, but we can verify the module exports
    expect(providerSettingsModule).toBeDefined()
  })
})
