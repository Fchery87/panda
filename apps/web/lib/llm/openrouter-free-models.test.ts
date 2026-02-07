import { describe, expect, it } from 'bun:test'
import {
  extractOpenRouterFreeCodingModelIds,
  extractOpenRouterFreeModelIds,
} from './openrouter-free-models'

describe('extractOpenRouterFreeModelIds', () => {
  it('returns only free model IDs and preserves API order', () => {
    const payload = {
      data: [
        { id: 'openai/gpt-5', pricing: { prompt: '0.000001', completion: '0.000002' } },
        { id: 'qwen/qwen3-coder:free', pricing: { prompt: '0.000001', completion: '0.000001' } },
        { id: 'google/gemini-2.5-flash-lite-preview', pricing: { prompt: '0', completion: '0' } },
        { id: 'qwen/qwen3-coder:free', pricing: { prompt: '0', completion: '0' } },
        {
          id: 'meta-llama/llama-3.3-70b-instruct',
          pricing: { prompt: '0', completion: '0.00001' },
        },
      ],
    }

    expect(extractOpenRouterFreeModelIds(payload)).toEqual([
      'qwen/qwen3-coder:free',
      'google/gemini-2.5-flash-lite-preview',
    ])
  })

  it('handles unknown payload shapes safely', () => {
    expect(extractOpenRouterFreeModelIds({})).toEqual([])
    expect(extractOpenRouterFreeModelIds({ data: null })).toEqual([])
    expect(extractOpenRouterFreeModelIds({ data: [{ id: '' }, { id: 'x' }] })).toEqual([])
  })

  it('returns only free coding model IDs', () => {
    const payload = {
      data: [
        {
          id: 'qwen/qwen3-coder:free',
          name: 'Qwen3 Coder',
          pricing: { prompt: '0.000001', completion: '0.000001' },
        },
        {
          id: 'google/gemma-3n-e4b-it:free',
          name: 'Gemma 3n',
          description: 'General purpose assistant',
          pricing: { prompt: '0', completion: '0' },
        },
        {
          id: 'moonshotai/kimi-dev-72b:free',
          name: 'Kimi Dev',
          description: 'Strong for programming tasks',
          pricing: { prompt: '0', completion: '0' },
        },
      ],
    }

    expect(extractOpenRouterFreeCodingModelIds(payload)).toEqual([
      'qwen/qwen3-coder:free',
      'moonshotai/kimi-dev-72b:free',
    ])
  })
})
