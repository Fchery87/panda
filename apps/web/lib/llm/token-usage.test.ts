import { describe, expect, it } from 'bun:test'
import {
  estimateCompletionTokens,
  estimatePromptTokens,
  computeContextMetrics,
} from './token-usage'

describe('token usage estimators', () => {
  it('estimates prompt tokens for a message list', () => {
    const count = estimatePromptTokens({
      providerType: 'openai',
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'Explain TypeScript discriminated unions.' },
      ],
    })

    expect(count).toBeGreaterThan(0)
  })

  it('estimates completion tokens for streaming text', () => {
    const count = estimateCompletionTokens({
      providerType: 'openai',
      model: 'gpt-4o',
      content: 'Here is a concise explanation with one short example.',
    })

    expect(count).toBeGreaterThan(0)
  })

  it('computes context usage metrics with clamping', () => {
    const metrics = computeContextMetrics({
      usedTokens: 150000,
      contextWindow: 128000,
    })

    expect(metrics.usedTokens).toBe(128000)
    expect(metrics.remainingTokens).toBe(0)
    expect(metrics.usagePct).toBe(100)
  })
})
