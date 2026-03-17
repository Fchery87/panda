import { describe, it, expect } from 'bun:test'
import { getGlobalRegistry, resetGlobalRegistry } from '../registry'
import { isKnownProvider } from '../types'

describe('ProviderRegistry - Dynamic Providers', () => {
  it('creates OpenAICompatibleProvider for unknown dynamic providers', () => {
    resetGlobalRegistry()
    const registry = getGlobalRegistry()

    const provider = registry.createProvider('mistral', {
      provider: 'mistral',
      auth: { apiKey: 'test-key', baseUrl: 'https://api.mistral.ai/v1' },
      defaultModel: 'mistral-large',
    })

    expect(provider).toBeDefined()
    expect(isKnownProvider('mistral')).toBe(false)
    expect(provider.config.provider).toBe('mistral')
  })

  it('creates specialized provider for known providers', () => {
    resetGlobalRegistry()
    const registry = getGlobalRegistry()

    const anthropicProvider = registry.createProvider('anthropic', {
      provider: 'anthropic',
      auth: { apiKey: 'sk-ant-test123' },
      defaultModel: 'claude-sonnet-4-5',
    })

    expect(anthropicProvider).toBeDefined()
    expect(isKnownProvider('anthropic')).toBe(true)
    expect(anthropicProvider.config.provider).toBe('anthropic')
  })

  it('updates provider config when changed', () => {
    resetGlobalRegistry()
    const registry = getGlobalRegistry()

    registry.createProvider('dynamic-provider', {
      provider: 'dynamic-provider',
      auth: { apiKey: 'old-key', baseUrl: 'https://api.example.com/v1' },
      defaultModel: 'model-1',
    })

    registry.updateProviderConfig('dynamic-provider', {
      auth: { apiKey: 'new-key', baseUrl: 'https://api.example.com/v1' },
      defaultModel: 'model-2',
    })

    const updatedProvider = registry.getProvider('dynamic-provider')
    expect(updatedProvider).toBeDefined()
    expect(updatedProvider?.config.auth.apiKey).toBe('new-key')
    expect(updatedProvider?.config.defaultModel).toBe('model-2')
  })
})
