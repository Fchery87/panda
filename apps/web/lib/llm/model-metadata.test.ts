import { describe, expect, it } from 'bun:test'
import { resolveContextWindow } from './model-metadata'

describe('resolveContextWindow', () => {
  it('resolves from known model map first', () => {
    const result = resolveContextWindow({
      providerType: 'openai',
      model: 'gpt-4o',
    })

    expect(result.contextWindow).toBe(128000)
    expect(result.source).toBe('map')
  })

  it('resolves from provider model metadata when map misses', () => {
    const result = resolveContextWindow({
      providerType: 'openrouter',
      model: 'acme/custom-model',
      providerModels: [
        {
          id: 'acme/custom-model',
          name: 'Custom',
          provider: 'openrouter',
          maxTokens: 4096,
          contextWindow: 64000,
          capabilities: {
            streaming: true,
            functionCalling: true,
            vision: false,
            jsonMode: true,
            toolUse: true,
          },
        },
      ],
    })

    expect(result.contextWindow).toBe(64000)
    expect(result.source).toBe('provider')
  })

  it('falls back to provider defaults for unknown models', () => {
    const result = resolveContextWindow({
      providerType: 'zai',
      model: 'unknown-zai-model',
    })

    expect(result.source).toBe('fallback')
    expect(result.contextWindow).toBeGreaterThan(0)
  })
})
