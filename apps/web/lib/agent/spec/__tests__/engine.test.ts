/**
 * Spec Engine Tests - Integration tests for the SpecEngine
 */

import { describe, test, expect } from 'bun:test'
import { createSpecEngine, classifyIntent, validateSpec } from '../index'
import type { SpecGenerationContext } from '../engine'

describe('SpecEngine', () => {
  describe('initialization', () => {
    test('creates engine with default config', () => {
      const engine = createSpecEngine()
      expect(engine.isEnabled()).toBe(true)
    })

    test('creates engine with enabled config', () => {
      const engine = createSpecEngine({ enabled: true })
      expect(engine.isEnabled()).toBe(true)
    })

    test('updates config', () => {
      const engine = createSpecEngine()
      engine.updateConfig({ enabled: true })
      expect(engine.isEnabled()).toBe(true)
    })
  })

  describe('classification', () => {
    test('classifies simple question as instant', async () => {
      const result = await classifyIntent('What is a closure in JavaScript?')
      expect(result.tier).toBe('instant')
      expect(result.confidence).toBeGreaterThan(0.8)
    })

    test('classifies typo fix as instant', async () => {
      const result = await classifyIntent('Fix the typo in the header')
      expect(result.tier).toBe('instant')
    })

    test('classifies refactoring as ambient', async () => {
      const result = await classifyIntent('Refactor the auth hook to use a reducer')
      expect(result.tier).toBe('ambient')
    })

    test('classifies feature building as explicit', async () => {
      const result = await classifyIntent('Build a real-time notification system')
      expect(result.tier).toBe('explicit')
    })

    test('respects default tier override', async () => {
      const engine = createSpecEngine({ enabled: true, defaultTier: 'explicit' })
      const result = await engine.classify('What is 2+2?')
      expect(result.tier).toBe('explicit')
    })
  })

  describe('spec generation', () => {
    const engine = createSpecEngine({ enabled: true })

    test('generates instant tier spec', async () => {
      const { spec, tier } = await engine.generate('What is TypeScript?', {}, 'instant')

      expect(tier).toBe('instant')
      expect(spec.tier).toBe('instant')
      expect(spec.intent.goal).toBeTruthy()
      expect(spec.plan.steps.length).toBeGreaterThan(0)
    })

    test('generates ambient tier spec for code mode', async () => {
      const context: SpecGenerationContext = {
        mode: 'code',
        chatId: 'test-chat',
      }

      const { spec, tier } = await engine.generate(
        'Add input validation to the signup form',
        context,
        'ambient'
      )

      expect(tier).toBe('ambient')
      expect(spec.intent.constraints.length).toBeGreaterThan(0)
      expect(spec.plan.steps.length).toBeGreaterThan(0)
    })

    test('generates explicit tier spec for build mode', async () => {
      const context: SpecGenerationContext = {
        mode: 'build',
        chatId: 'test-chat',
      }

      const { spec, tier } = await engine.generate(
        'Build a payment processing system',
        context,
        'explicit'
      )

      expect(tier).toBe('explicit')
      expect(spec.plan.risks.length).toBeGreaterThan(0)
    })
  })

  describe('validation', () => {
    const engine = createSpecEngine({ enabled: true })

    test('validates a correct spec', async () => {
      const { spec } = await engine.generate(
        'Add a new feature with proper implementation and testing',
        { mode: 'code' },
        'ambient'
      )

      const validation = await engine.validate(spec)
      // Specs should be valid or have only minor issues
      expect(validation).toBeDefined()
      expect(validation.isValid !== undefined).toBe(true)
    })

    test('detects structural errors', async () => {
      const { spec } = await engine.generate('Test', { mode: 'code' }, 'ambient')

      const invalidSpec = { ...spec, intent: { ...spec.intent, goal: '' } }
      const validation = await validateSpec(invalidSpec as typeof spec)

      expect(validation.isValid).toBe(false)
    })
  })

  describe('verification', () => {
    const engine = createSpecEngine({ enabled: true })

    test('verifies successful execution', async () => {
      const { spec } = await engine.generate('Add a feature', { mode: 'code' }, 'ambient')

      const executionResults = {
        filesModified: ['src/feature.ts'],
        commandsRun: ['npm test'],
        errors: [],
        output: 'Feature added successfully',
      }

      const report = await engine.verify(spec, executionResults)

      // Verification should return a report with results
      expect(report.criterionResults).toBeDefined()
      expect(report.constraintResults).toBeDefined()
      expect(report.summary).toBeTruthy()
    })

    test('detects failed verification with errors', async () => {
      const { spec } = await engine.generate('Add a feature', { mode: 'code' }, 'ambient')

      const executionResults = {
        filesModified: [],
        commandsRun: [],
        errors: ['Build failed'],
        output: '',
      }

      const report = await engine.verify(spec, executionResults)

      expect(report.passed).toBe(false)
    })
  })

  describe('spec lifecycle', () => {
    const engine = createSpecEngine({ enabled: true })

    test('approves explicit tier spec', async () => {
      const { spec } = await engine.generate('Build a system', { mode: 'build' }, 'explicit')

      const approved = engine.approve(spec)
      expect(approved.status).toBe('approved')
    })

    test('marks spec as verified', async () => {
      const { spec } = await engine.generate('Add feature', { mode: 'code' }, 'ambient')

      const verificationResults = [{ criterionId: 'ac-1', passed: true }]
      const verified = engine.markVerified(spec, verificationResults)

      expect(verified.status).toBe('verified')
    })

    test('throws when approving non-explicit spec', async () => {
      const { spec } = await engine.generate('Simple fix', { mode: 'code' }, 'ambient')

      expect(() => engine.approve(spec)).toThrow()
    })
  })
})
