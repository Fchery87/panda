import { describe, expect, test } from 'bun:test'
import { buildAssistantAnnotations } from './useAgent-event-utils'

describe('buildAssistantAnnotations reasoning state', () => {
  test('stores safe reasoning summary and token accounting', () => {
    const annotations = buildAssistantAnnotations({
      mode: 'code',
      model: 'test-model',
      provider: 'test-provider',
      toolCalls: [],
      assistantReasoning: 'Summarized reasoning only.',
      runUsage: { promptTokens: 10, completionTokens: 4, totalTokens: 14, source: 'exact' },
      usageSessionTotalTokens: 0,
      contextWindow: 1000,
      contextSource: 'provider',
    })

    expect(annotations.reasoningSummary).toBe('Summarized reasoning only.')
    expect(annotations.reasoningTokens).toBe(4)
    expect(annotations.reasoningState).toEqual({
      mode: 'auto',
      display: 'summary',
      summary: 'Summarized reasoning only.',
      tokenCount: 4,
    })
  })

  test('stores redacted reasoning state when only token accounting is available', () => {
    const annotations = buildAssistantAnnotations({
      mode: 'code',
      model: 'test-model',
      provider: 'test-provider',
      toolCalls: [],
      assistantReasoning: '',
      runUsage: { promptTokens: 10, completionTokens: 4, totalTokens: 14, source: 'estimated' },
      usageSessionTotalTokens: 0,
      contextWindow: 1000,
      contextSource: 'fallback',
    })

    expect(annotations.reasoningSummary).toBeUndefined()
    expect(annotations.reasoningState).toEqual({
      mode: 'auto',
      display: 'hidden',
      redacted: true,
      tokenCount: 4,
    })
  })
})
