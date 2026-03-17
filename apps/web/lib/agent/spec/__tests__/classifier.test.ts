/**
 * Classifier Tests - Tests for intent classification with LLM provider mocks
 */

import { describe, test, expect } from 'bun:test'
import {
  classifyIntent,
  classifyBatch,
  getClassificationStats,
  type ClassificationContext,
} from '../classifier'
import type {
  LLMProvider,
  ModelInfo,
  CompletionOptions,
  CompletionResponse,
} from '../../../llm/types'
import type { SpecTier } from '../types'

describe('classifyIntent', () => {
  test('classifies questions as instant', async () => {
    const questions = [
      'What is TypeScript?',
      'How do I use React hooks?',
      'Why is my code not working?',
      'Explain closures in JavaScript',
    ]

    for (const q of questions) {
      const result = await classifyIntent(q)
      expect(result.tier).toBe('instant')
      expect(result.confidence).toBeGreaterThan(0.8)
    }
  })

  test('classifies typo fixes as instant', async () => {
    const result = await classifyIntent('Fix the typo in the header')
    expect(result.tier).toBe('instant')
  })

  test('classifies code changes appropriately', async () => {
    const changes = [
      'Refactor the auth hook',
      'Add error handling to the API',
      'Update the button component styles',
      'Extract this logic into a utility function',
    ]

    for (const change of changes) {
      const result = await classifyIntent(change)
      expect(['instant', 'ambient', 'explicit']).toContain(result.tier)
      expect(result.confidence).toBeGreaterThan(0)
    }
  })

  test('classifies system building as explicit', async () => {
    const builds = [
      'Build a payment system',
      'Create a real-time chat application',
      'Implement a microservices architecture',
      'Design a database schema for users',
    ]

    for (const build of builds) {
      const result = await classifyIntent(build)
      expect(result.tier).toBe('explicit')
    }
  })

  test('provides reasoning for classification', async () => {
    const result = await classifyIntent('What is TypeScript?')
    expect(result.reasoning).toBeTruthy()
    expect(result.reasoning.length).toBeGreaterThan(0)
  })

  test('provides factor analysis', async () => {
    const result = await classifyIntent('Build a new feature')
    expect(result.factors.scope).toBeTruthy()
    expect(result.factors.risk).toBeTruthy()
    expect(result.factors.complexity).toBeTruthy()
  })

  test('uses context for classification', async () => {
    const result = await classifyIntent('Add a new feature', {
      mode: 'build',
      conversationDepth: 5,
    })
    expect(['instant', 'ambient', 'explicit']).toContain(result.tier)
    expect(result.factors).toBeDefined()
  })
})

describe('classifyBatch', () => {
  test('classifies multiple messages', async () => {
    const messages = [
      { message: 'What is TypeScript?' },
      { message: 'Build a payment system' },
      { message: 'Refactor the auth hook' },
    ]

    const results = await classifyBatch(messages)

    expect(results).toHaveLength(3)
    expect(results[0].tier).toBe('instant')
    expect(results[1].tier).toBe('explicit')
  })
})

describe('getClassificationStats', () => {
  test('calculates statistics', async () => {
    const messages = [
      { message: 'What is TypeScript?' },
      { message: 'Build a payment system' },
      { message: 'Refactor the auth hook' },
    ]

    const results = await classifyBatch(messages)
    const stats = getClassificationStats(results)

    expect(stats.instant).toBeGreaterThanOrEqual(0)
    expect(stats.ambient).toBeGreaterThanOrEqual(0)
    expect(stats.explicit).toBeGreaterThanOrEqual(0)
    expect(stats.averageConfidence).toBeGreaterThan(0)
    expect(stats.averageConfidence).toBeLessThanOrEqual(1)
  })
})

describe('classifyIntent with LLM provider', () => {
  const createMockProvider = (response: {
    tier: SpecTier
    confidence: number
    reasoning: string
    factors: {
      scope: 'single-file' | 'multi-file' | 'system-wide'
      risk: 'read-only' | 'write' | 'destructive'
      complexity: 'simple' | 'medium' | 'complex'
    }
  }): LLMProvider => {
    const mockComplete = async (_options: CompletionOptions): Promise<CompletionResponse> => ({
      message: { content: JSON.stringify(response), role: 'assistant' },
      finishReason: 'stop',
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      model: 'gpt-4o-mini',
    })

    const mockListModels = async (): Promise<ModelInfo[]> => []
    const mockStream = async function* () {}

    return {
      name: 'mock-provider',
      config: {
        provider: 'openai',
        auth: { apiKey: 'test-key' },
        defaultModel: 'gpt-4o-mini',
      },
      listModels: mockListModels,
      complete: mockComplete,
      completionStream: mockStream,
    }
  }

  test('uses LLM provider when confidence is low', async () => {
    const mockProvider = createMockProvider({
      tier: 'ambient',
      confidence: 0.75,
      reasoning: 'Moderate complexity task',
      factors: {
        scope: 'multi-file',
        risk: 'write',
        complexity: 'medium',
      },
    })

    const context: ClassificationContext = { provider: mockProvider }
    const result = await classifyIntent('Refactor the utils module', context)

    expect(result.tier).toBe('ambient')
    expect(result.confidence).toBe(0.75)
  })

  test('falls back to heuristics when LLM fails', async () => {
    const failingProvider: LLMProvider = {
      name: 'failing-provider',
      config: {
        provider: 'openai',
        auth: { apiKey: 'test-key' },
        defaultModel: 'gpt-4o-mini',
      },
      listModels: async (): Promise<ModelInfo[]> => [],
      complete: async (_options: CompletionOptions): Promise<CompletionResponse> => {
        throw new Error('LLM service unavailable')
      },
      completionStream: async function* () {},
    }

    const context: ClassificationContext = { provider: failingProvider }
    const result = await classifyIntent('What is TypeScript?', context)

    // Should still return valid result from heuristics
    expect(result.tier).toBe('instant')
    expect(result.confidence).toBeGreaterThan(0)
  })

  test('falls back to heuristics when LLM returns invalid JSON', async () => {
    const badJsonProvider: LLMProvider = {
      name: 'bad-json-provider',
      config: {
        provider: 'openai',
        auth: { apiKey: 'test-key' },
        defaultModel: 'gpt-4o-mini',
      },
      listModels: async (): Promise<ModelInfo[]> => [],
      complete: async (_options: CompletionOptions): Promise<CompletionResponse> => ({
        message: { content: 'This is not valid JSON', role: 'assistant' },
        finishReason: 'stop',
        usage: { promptTokens: 100, completionTokens: 10, totalTokens: 110 },
        model: 'gpt-4o-mini',
      }),
      completionStream: async function* () {},
    }

    const context: ClassificationContext = { provider: badJsonProvider }
    const result = await classifyIntent('How does React work?', context)

    // Should fall back to heuristics
    expect(result.tier).toBeDefined()
    expect(result.confidence).toBeGreaterThan(0)
  })

  test('validates LLM response structure', async () => {
    const invalidProvider: LLMProvider = {
      name: 'invalid-provider',
      config: {
        provider: 'openai',
        auth: { apiKey: 'test-key' },
        defaultModel: 'gpt-4o-mini',
      },
      listModels: async (): Promise<ModelInfo[]> => [],
      complete: async (_options: CompletionOptions): Promise<CompletionResponse> => ({
        message: { content: JSON.stringify({ invalid: 'response' }), role: 'assistant' },
        finishReason: 'stop',
        usage: { promptTokens: 100, completionTokens: 20, totalTokens: 120 },
        model: 'gpt-4o-mini',
      }),
      completionStream: async function* () {},
    }

    const context: ClassificationContext = { provider: invalidProvider }
    const result = await classifyIntent('Test message', context)

    // Should still return valid result
    expect(result.tier).toBeDefined()
    expect(result.confidence).toBeGreaterThan(0)
  })
})
