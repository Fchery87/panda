import { describe, it, expect } from 'bun:test'
import { buildCatalogFromResponse, searchCatalog, getCatalogEntry } from '../provider-catalog'
import type { ModelsDevResponse } from '../models-dev'

const mockData: ModelsDevResponse = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    api: 'https://api.openai.com/v1',
    models: {
      'gpt-4o': {
        id: 'gpt-4o',
        name: 'GPT-4o',
        context_length: 128000,
        max_output_tokens: 16384,
        capabilities: ['tools', 'vision'],
      },
    },
  },
  mistral: {
    id: 'mistral',
    name: 'Mistral AI',
    api: 'https://api.mistral.ai/v1',
    models: {
      'mistral-large': {
        id: 'mistral-large',
        name: 'Mistral Large',
        context_length: 128000,
        capabilities: ['tools'],
      },
    },
  },
  'empty-provider': {
    id: 'empty-provider',
    name: 'Empty',
    models: {},
  },
}

describe('buildCatalogFromResponse', () => {
  it('builds entries for providers with models', () => {
    const catalog = buildCatalogFromResponse(mockData)
    expect(catalog.length).toBe(2)
  })

  it('marks known providers as having special implementation', () => {
    const catalog = buildCatalogFromResponse(mockData)
    const openai = catalog.find((e) => e.id === 'openai')
    const mistral = catalog.find((e) => e.id === 'mistral')
    expect(openai?.hasSpecialImplementation).toBe(true)
    expect(mistral?.hasSpecialImplementation).toBe(false)
  })

  it('sorts special implementations first', () => {
    const catalog = buildCatalogFromResponse(mockData)
    expect(catalog[0].id).toBe('openai')
  })

  it('includes base URL and logo URL', () => {
    const catalog = buildCatalogFromResponse(mockData)
    const mistral = catalog.find((e) => e.id === 'mistral')
    expect(mistral?.baseUrl).toBe('https://api.mistral.ai/v1')
    expect(mistral?.logoUrl).toBe('https://models.dev/logos/mistral.svg')
  })

  it('orders provider models newest-first when release metadata is available', () => {
    const catalog = buildCatalogFromResponse({
      openai: {
        id: 'openai',
        name: 'OpenAI',
        api: 'https://api.openai.com/v1',
        models: {
          'gpt-4o': {
            id: 'gpt-4o',
            name: 'GPT-4o',
            release_date: '2024-05-01',
            context_length: 128000,
          },
          'gpt-5.5': {
            id: 'gpt-5.5',
            name: 'GPT-5.5',
            release_date: '2026-03-20',
            context_length: 256000,
          },
        },
      },
    })

    expect(catalog[0]?.models.map((model) => model.id)).toEqual(['gpt-5.5', 'gpt-4o'])
    expect(catalog[0]?.defaultModel).toBe('gpt-5.5')
  })

  it('uses models.dev record keys as model IDs when model.id is omitted', () => {
    const catalog = buildCatalogFromResponse({
      futurelab: {
        id: 'futurelab',
        name: 'Future Lab',
        api: 'https://api.futurelab.dev/v1',
        models: {
          'future-code-1': {
            name: 'Future Code 1',
            release_date: '2026-04-01',
          },
        },
      },
    } as ModelsDevResponse)

    expect(catalog[0]?.models[0]?.id).toBe('future-code-1')
    expect(catalog[0]?.defaultModel).toBe('future-code-1')
  })
})

describe('searchCatalog', () => {
  const catalog = buildCatalogFromResponse(mockData)

  it('returns all entries for empty query', () => {
    expect(searchCatalog(catalog, '').length).toBe(2)
  })

  it('filters by name', () => {
    const results = searchCatalog(catalog, 'mistral')
    expect(results.length).toBe(1)
    expect(results[0].id).toBe('mistral')
  })

  it('filters by ID', () => {
    const results = searchCatalog(catalog, 'openai')
    expect(results.length).toBe(1)
  })

  it('is case insensitive', () => {
    const results = searchCatalog(catalog, 'MISTRAL')
    expect(results.length).toBe(1)
  })
})

describe('getCatalogEntry', () => {
  const catalog = buildCatalogFromResponse(mockData)

  it('finds by ID', () => {
    expect(getCatalogEntry(catalog, 'openai')?.name).toBe('OpenAI')
  })

  it('returns undefined for unknown ID', () => {
    expect(getCatalogEntry(catalog, 'nonexistent')).toBeUndefined()
  })
})
