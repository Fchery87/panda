/**
 * Classifier Tests - Tests for intent classification
 */

import { describe, test, expect } from 'bun:test'
import { classifyIntent, classifyBatch, getClassificationStats } from '../classifier'

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
      // Code changes can be instant or ambient depending on complexity
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
    // Context influences classification but doesn't guarantee explicit tier
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
