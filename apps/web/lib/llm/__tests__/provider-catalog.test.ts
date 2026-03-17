import { describe, it, expect } from 'bun:test'
import { buildCatalogFromResponse, searchCatalog, getCatalogEntry } from '../provider-catalog'
import type { ModelsDevResponse } from '../models-dev'

const mockData: ModelsDevResponse = {
  openai: {
    provider_id: 'openai',
    provider_name: 'OpenAI',
    base_url: 'https://api.openai.com/v1',
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
    provider_id: 'mistral',
    provider_name: 'Mistral AI',
    base_url: 'https://api.mistral.ai/v1',
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
    provider_id: 'empty-provider',
    provider_name: 'Empty',
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
