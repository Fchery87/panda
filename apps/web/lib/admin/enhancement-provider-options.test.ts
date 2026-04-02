import { describe, expect, test } from 'bun:test'

import { getEnhancementProviderOptions } from './enhancement-provider-options'

describe('enhancement provider options', () => {
  test('exposes the shared enhancement provider catalog', () => {
    const providers = getEnhancementProviderOptions()

    expect(providers.openai.name).toBe('OpenAI')
    expect(providers.anthropic.name).toBe('Anthropic')
    expect(providers.openrouter.availableModels).toContain('qwen/qwen3-coder:free')
    expect(providers.groq.enabled).toBe(true)
  })
})
