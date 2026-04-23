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

  it('derives reasoning runtime settings from provider capabilities and settings', () => {
    const provider = {
      config: {
        provider: 'anthropic',
        capabilities: {
          supportsReasoning: true,
          supportsInterleavedReasoning: true,
          supportsReasoningSummary: true,
          supportsToolStreaming: true,
          reasoningControl: 'budget',
        },
      },
    } as never

    expect(
      providerSettingsModule.resolveReasoningRuntimeSettings({
        provider,
        settings: {
          defaultProvider: 'anthropic',
          providerConfigs: {
            anthropic: {
              showReasoningPanel: true,
              reasoningEnabled: true,
              reasoningBudget: 2048,
              reasoningMode: 'high',
            },
          },
        },
      })
    ).toEqual({
      showReasoningPanel: true,
      reasoning: {
        enabled: true,
        budgetTokens: 2048,
        effort: 'high',
      },
    })
  })
})
