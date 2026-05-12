import { describe, expect, test } from 'bun:test'

import { buildModelPreflight } from './model-preflight'

describe('buildModelPreflight', () => {
  test('summarizes provider and model readiness for a write-capable mode', () => {
    expect(
      buildModelPreflight({
        mode: 'build',
        providerId: 'anthropic',
        modelId: 'claude-sonnet-4-6',
        providerModels: [
          {
            id: 'claude-sonnet-4-6',
            name: 'Claude Sonnet 4.6',
            provider: 'anthropic',
            maxTokens: 8192,
            contextWindow: 1_000_000,
            capabilities: {
              streaming: true,
              functionCalling: true,
              vision: true,
              jsonMode: true,
              toolUse: true,
              supportsReasoning: true,
            },
            pricing: { inputPerToken: 0.000003, outputPerToken: 0.000015 },
          },
        ],
      })
    ).toEqual({
      tone: 'ready',
      modelLabel: 'anthropic / claude-sonnet-4-6',
      modeSupport: 'Build mode can use tools with this model.',
      toolGrammar: 'Tool grammar: anthropic-native, anthropic-xml-fallback',
      context: 'Context: 1000000 tokens from provider metadata',
      cost: 'Cost visibility: pricing available',
      reasoning: 'Reasoning: supported',
      notes: [],
    })
  })

  test('warns when a write-capable mode uses an unmanifested model', () => {
    const preflight = buildModelPreflight({
      mode: 'code',
      providerId: 'custom',
      modelId: 'unknown-model',
      providerModels: [],
    })

    expect(preflight.tone).toBe('warning')
    expect(preflight.modeSupport).toBe('Code mode needs tool support; this model is unverified.')
    expect(preflight.toolGrammar).toBe('Tool grammar: no verified grammar')
    expect(preflight.context).toBe('Context: 32000 tokens from fallback estimate')
    expect(preflight.cost).toBe('Cost visibility: pricing unavailable')
    expect(preflight.reasoning).toBe('Reasoning: unknown')
    expect(preflight.notes).toContain('Use Ask or Plan first if tool execution is uncertain.')
  })
})
