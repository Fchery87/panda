import { describe, expect, test } from 'bun:test'

import {
  buildProviderDefinitionsFromConfigs,
  getSharedProviderDefinitions,
} from './provider-definitions'

describe('buildProviderDefinitionsFromConfigs', () => {
  test('uses fresh saved provider models before static fallback models', () => {
    const definitions = buildProviderDefinitionsFromConfigs(getSharedProviderDefinitions(), {
      crofai: {
        name: 'crof.ai',
        availableModels: ['new-crof-model', 'kimi-k2.5'],
      },
    })

    const crofai = definitions.find((provider) => provider.value === 'crofai')

    expect(crofai?.models.slice(0, 2)).toEqual(['new-crof-model', 'kimi-k2.5'])
    expect(crofai?.models).toContain('glm-5.1')
  })

  test('adds configured providers missing from the shared catalog', () => {
    const definitions = buildProviderDefinitionsFromConfigs(getSharedProviderDefinitions(), {
      customgateway: {
        name: 'Custom Gateway',
        availableModels: ['custom-code-model'],
      },
    })

    expect(definitions.find((provider) => provider.value === 'customgateway')).toEqual({
      value: 'customgateway',
      label: 'Custom Gateway',
      models: ['custom-code-model'],
    })
  })
})
