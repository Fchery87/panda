import { describe, expect, it } from 'bun:test'
import {
  applyProviderModelSync,
  buildAvailableModelsFromProviderConfigs,
  hydrateProvidersWithCatalog,
  normalizeModelIds,
  shouldRefreshProviderModels,
  type ProviderModelConfig,
} from './model-sync'
import type { ProviderCatalogEntry } from './provider-catalog'

describe('hydrateProvidersWithCatalog', () => {
  it('updates provider model lists from the latest catalog while preserving user config', () => {
    const providers: Record<string, ProviderModelConfig> = {
      openai: {
        provider: 'openai',
        name: 'OpenAI',
        enabled: true,
        apiKey: 'sk-test',
        defaultModel: 'gpt-4o',
        availableModels: ['gpt-4o'],
        baseUrl: 'https://api.openai.com/v1',
      },
      anthropic: {
        provider: 'anthropic',
        name: 'Anthropic',
        enabled: false,
        apiKey: '',
        defaultModel: 'claude-sonnet-4-5',
        availableModels: ['claude-sonnet-4-5'],
      },
    }

    const catalog = [
      {
        id: 'openai',
        name: 'OpenAI',
        description: 'OpenAI',
        logoUrl: 'https://example.com/openai.svg',
        models: [
          {
            id: 'gpt-5.5',
            name: 'GPT-5.5',
            provider: 'openai',
            maxTokens: 32000,
            contextWindow: 200000,
            capabilities: {
              streaming: true,
              functionCalling: true,
              vision: true,
              jsonMode: true,
              toolUse: true,
            },
          },
          {
            id: 'gpt-4o',
            name: 'GPT-4o',
            provider: 'openai',
            maxTokens: 16000,
            contextWindow: 128000,
            capabilities: {
              streaming: true,
              functionCalling: true,
              vision: true,
              jsonMode: true,
              toolUse: true,
            },
          },
        ],
        defaultModel: 'gpt-5.5',
        hasSpecialImplementation: true,
        providerType: 'openai',
      },
      {
        id: 'anthropic',
        name: 'Anthropic',
        description: 'Anthropic',
        logoUrl: 'https://example.com/anthropic.svg',
        models: [
          {
            id: 'claude-opus-4-6',
            name: 'Claude Opus 4.6',
            provider: 'anthropic',
            maxTokens: 8192,
            contextWindow: 1000000,
            capabilities: {
              streaming: true,
              functionCalling: true,
              vision: true,
              jsonMode: true,
              toolUse: true,
            },
          },
          {
            id: 'claude-sonnet-4-5',
            name: 'Claude Sonnet 4.5',
            provider: 'anthropic',
            maxTokens: 8192,
            contextWindow: 200000,
            capabilities: {
              streaming: true,
              functionCalling: true,
              vision: true,
              jsonMode: true,
              toolUse: true,
            },
          },
        ],
        defaultModel: 'claude-opus-4-6',
        hasSpecialImplementation: true,
        providerType: 'anthropic',
      },
    ] satisfies ProviderCatalogEntry[]

    const hydrated = hydrateProvidersWithCatalog(providers, catalog, 123)

    expect(hydrated.openai.availableModels).toEqual(['gpt-5.5', 'gpt-4o'])
    expect(hydrated.openai.defaultModel).toBe('gpt-4o')
    expect(hydrated.openai.modelsLastSyncedAt).toBe(123)
    expect(hydrated.openai.modelsSource).toBe('catalog')

    expect(hydrated.anthropic.availableModels).toEqual(['claude-opus-4-6', 'claude-sonnet-4-5'])
    expect(hydrated.anthropic.defaultModel).toBe('claude-sonnet-4-5')
  })
})

describe('applyProviderModelSync', () => {
  it('replaces stale models with scanned models and promotes a valid default model', () => {
    const result = applyProviderModelSync<ProviderModelConfig>(
      {
        provider: 'openai',
        name: 'OpenAI',
        enabled: true,
        apiKey: 'sk-test',
        defaultModel: 'gpt-4o-mini',
        availableModels: ['gpt-4o-mini', 'gpt-4o'],
      },
      ['gpt-5.5', 'gpt-4.1'],
      {
        syncedAt: 456,
        source: 'provider',
      }
    )

    expect(result.availableModels).toEqual(['gpt-5.5', 'gpt-4.1'])
    expect(result.defaultModel).toBe('gpt-5.5')
    expect(result.modelsLastSyncedAt).toBe(456)
    expect(result.modelsSource).toBe('provider')
  })
})

describe('buildAvailableModelsFromProviderConfigs', () => {
  it('uses the freshest provider configs to build the live selector options', () => {
    const availableModels = buildAvailableModelsFromProviderConfigs({
      openai: {
        enabled: true,
        name: 'OpenAI',
        availableModels: ['gpt-5.5', 'gpt-4.1'],
      },
      anthropic: {
        enabled: true,
        name: 'Anthropic',
        availableModels: ['claude-opus-4-6'],
      },
      disabled: {
        enabled: false,
        name: 'Disabled',
        availableModels: ['ignore-me'],
      },
    })

    expect(availableModels).toEqual([
      { id: 'gpt-5.5', name: 'gpt-5.5', provider: 'OpenAI', providerKey: 'openai' },
      { id: 'gpt-4.1', name: 'gpt-4.1', provider: 'OpenAI', providerKey: 'openai' },
      {
        id: 'claude-opus-4-6',
        name: 'claude-opus-4-6',
        provider: 'Anthropic',
        providerKey: 'anthropic',
      },
    ])
  })

  it('deduplicates repeated model IDs before building selector options', () => {
    const availableModels = buildAvailableModelsFromProviderConfigs({
      openai: {
        enabled: true,
        name: 'OpenAI',
        availableModels: ['openai/gpt-oss-20b', 'openai/gpt-oss-20b', 'gpt-5.5'],
      },
    })

    expect(availableModels).toEqual([
      {
        id: 'openai/gpt-oss-20b',
        name: 'gpt-oss-20b',
        provider: 'OpenAI',
        providerKey: 'openai',
      },
      { id: 'gpt-5.5', name: 'gpt-5.5', provider: 'OpenAI', providerKey: 'openai' },
    ])
  })
})

describe('normalizeModelIds', () => {
  it('removes blanks and duplicates while preserving order', () => {
    expect(normalizeModelIds(['gpt-4o', ' ', 'gpt-4o', 'gpt-5.5'])).toEqual(['gpt-4o', 'gpt-5.5'])
  })
})

describe('shouldRefreshProviderModels', () => {
  it('refreshes enabled providers with API keys when sync metadata is stale', () => {
    expect(
      shouldRefreshProviderModels(
        {
          enabled: true,
          apiKey: 'sk-test',
          modelsLastSyncedAt: Date.now() - 1000 * 60 * 60 * 7,
        },
        Date.now()
      )
    ).toBe(true)
  })

  it('does not refresh disabled or credential-less providers', () => {
    expect(
      shouldRefreshProviderModels(
        {
          enabled: false,
          apiKey: 'sk-test',
        },
        Date.now()
      )
    ).toBe(false)

    expect(
      shouldRefreshProviderModels(
        {
          enabled: true,
          apiKey: '',
        },
        Date.now()
      )
    ).toBe(false)
  })
})
