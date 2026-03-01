/**
 * Unit tests for SpecNative type system
 *
 * Tests type definitions, validators, and type guards
 * to ensure type safety across the spec system.
 */

import { describe, test, expect } from 'bun:test'
import {
  type SpecTier,
  type SpecStatus,
  type Constraint,
  type AcceptanceCriterion,
  type FormalSpecification,
  type SpecEngineConfig,
  isSpecTier,
  isSpecStatus,
  isConstraint,
  isAcceptanceCriterion,
  createAcceptanceCriterion,
  createStructuralConstraint,
  createBehavioralConstraint,
  createPerformanceConstraint,
  createCompatibilityConstraint,
  createSecurityConstraint,
} from '../types'

describe('SpecNative Types', () => {
  describe('SpecTier', () => {
    test('valid tiers', () => {
      const validTiers: SpecTier[] = ['instant', 'ambient', 'explicit']
      for (const tier of validTiers) {
        expect(isSpecTier(tier)).toBe(true)
      }
    })

    test('invalid tiers', () => {
      expect(isSpecTier('invalid')).toBe(false)
      expect(isSpecTier('')).toBe(false)
      expect(isSpecTier(123)).toBe(false)
      expect(isSpecTier(null)).toBe(false)
      expect(isSpecTier(undefined)).toBe(false)
    })
  })

  describe('SpecStatus', () => {
    test('valid statuses', () => {
      const validStatuses: SpecStatus[] = [
        'draft',
        'validated',
        'approved',
        'executing',
        'verified',
        'drifted',
        'failed',
        'archived',
      ]
      for (const status of validStatuses) {
        expect(isSpecStatus(status)).toBe(true)
      }
    })

    test('invalid statuses', () => {
      expect(isSpecStatus('invalid')).toBe(false)
      expect(isSpecStatus('')).toBe(false)
      expect(isSpecStatus(123)).toBe(false)
      expect(isSpecStatus(null)).toBe(false)
    })
  })

  describe('Constraint', () => {
    test('valid structural constraint', () => {
      const constraint: Constraint = {
        type: 'structural',
        rule: 'no new dependencies',
        target: 'package.json',
      }
      expect(isConstraint(constraint)).toBe(true)
    })

    test('valid behavioral constraint', () => {
      const constraint: Constraint = {
        type: 'behavioral',
        rule: 'email must be valid',
        assertion: 'regex match',
      }
      expect(isConstraint(constraint)).toBe(true)
    })

    test('valid performance constraint', () => {
      const constraint: Constraint = {
        type: 'performance',
        metric: 'response time',
        threshold: 500,
        unit: 'ms',
      }
      expect(isConstraint(constraint)).toBe(true)
    })

    test('valid compatibility constraint', () => {
      const constraint: Constraint = {
        type: 'compatibility',
        requirement: 'existing auth unchanged',
        scope: 'auth/*',
      }
      expect(isConstraint(constraint)).toBe(true)
    })

    test('valid security constraint', () => {
      const constraint: Constraint = {
        type: 'security',
        requirement: 'no secrets in logs',
        standard: 'OWASP',
      }
      expect(isConstraint(constraint)).toBe(true)
    })

    test('invalid constraints', () => {
      expect(isConstraint(null)).toBe(false)
      expect(isConstraint(undefined)).toBe(false)
      expect(isConstraint({})).toBe(false)
      expect(isConstraint({ type: 'unknown' })).toBe(false)
      expect(isConstraint({ type: 'structural', rule: 'test' })).toBe(false) // missing target
    })
  })

  describe('AcceptanceCriterion', () => {
    test('valid criterion', () => {
      const criterion: AcceptanceCriterion = {
        id: 'ac-1',
        trigger: 'user submits form',
        behavior: 'validate input fields',
        verificationMethod: 'automated',
        status: 'pending',
      }
      expect(isAcceptanceCriterion(criterion)).toBe(true)
    })

    test('invalid criteria', () => {
      expect(isAcceptanceCriterion(null)).toBe(false)
      expect(isAcceptanceCriterion({})).toBe(false)
      expect(isAcceptanceCriterion({ id: 'ac-1' })).toBe(false) // missing required fields
    })
  })

  describe('createAcceptanceCriterion', () => {
    test('creates criterion with defaults', () => {
      const criterion = createAcceptanceCriterion('ac-1', 'user clicks', 'system responds')
      expect(criterion.id).toBe('ac-1')
      expect(criterion.trigger).toBe('user clicks')
      expect(criterion.behavior).toBe('system responds')
      expect(criterion.verificationMethod).toBe('automated')
      expect(criterion.status).toBe('pending')
    })

    test('creates criterion with custom verification method', () => {
      const criterion = createAcceptanceCriterion(
        'ac-2',
        'error occurs',
        'log the error',
        'llm-judge'
      )
      expect(criterion.verificationMethod).toBe('llm-judge')
    })
  })

  describe('createStructuralConstraint', () => {
    test('creates structural constraint', () => {
      const constraint = createStructuralConstraint('no new deps', 'package.json')
      expect(constraint).toEqual({
        type: 'structural',
        rule: 'no new deps',
        target: 'package.json',
      })
    })
  })

  describe('createBehavioralConstraint', () => {
    test('creates behavioral constraint', () => {
      const constraint = createBehavioralConstraint('validate email', 'regex match')
      expect(constraint).toEqual({
        type: 'behavioral',
        rule: 'validate email',
        assertion: 'regex match',
      })
    })
  })

  describe('createPerformanceConstraint', () => {
    test('creates performance constraint', () => {
      const constraint = createPerformanceConstraint('response time', 500, 'ms')
      expect(constraint).toEqual({
        type: 'performance',
        metric: 'response time',
        threshold: 500,
        unit: 'ms',
      })
    })
  })

  describe('createCompatibilityConstraint', () => {
    test('creates compatibility constraint', () => {
      const constraint = createCompatibilityConstraint('auth unchanged', 'auth/*')
      expect(constraint).toEqual({
        type: 'compatibility',
        requirement: 'auth unchanged',
        scope: 'auth/*',
      })
    })
  })

  describe('createSecurityConstraint', () => {
    test('creates security constraint with standard', () => {
      const constraint = createSecurityConstraint('no secrets', 'OWASP')
      expect(constraint).toEqual({
        type: 'security',
        requirement: 'no secrets',
        standard: 'OWASP',
      })
    })

    test('creates security constraint without standard', () => {
      const constraint = createSecurityConstraint('no secrets')
      expect(constraint).toEqual({
        type: 'security',
        requirement: 'no secrets',
      })
    })
  })

  describe('FormalSpecification', () => {
    test('can create a complete specification', () => {
      const spec: FormalSpecification = {
        id: 'spec-1',
        version: 1,
        tier: 'ambient',
        status: 'draft',
        intent: {
          goal: 'Add input validation',
          rawMessage: 'Add input validation to the signup form',
          constraints: [
            createBehavioralConstraint('email must be valid', 'regex match'),
            createStructuralConstraint('no new dependencies', 'package.json'),
          ],
          acceptanceCriteria: [
            createAcceptanceCriterion('ac-1', 'user submits form', 'validate email format'),
          ],
        },
        plan: {
          steps: [
            {
              id: 'step-1',
              description: 'Add validation logic',
              tools: ['write_files'],
              targetFiles: ['src/validation.ts'],
              status: 'pending',
            },
          ],
          dependencies: [
            {
              path: 'src/validation.ts',
              access: 'write',
              reason: 'Add validation functions',
            },
          ],
          risks: [
            {
              description: 'May break existing forms',
              severity: 'medium',
              mitigation: 'Test all forms',
            },
          ],
          estimatedTools: ['write_files', 'read_files'],
        },
        validation: {
          preConditions: [
            {
              description: 'Validation file exists',
              check: 'src/validation.ts exists',
              type: 'file-exists',
            },
          ],
          postConditions: [
            {
              description: 'Email validation works',
              check: 'email regex passes',
              type: 'llm-assert',
            },
          ],
          invariants: [
            {
              description: 'No secrets in code',
              scope: 'src/*',
              rule: 'no hardcoded passwords',
            },
          ],
        },
        provenance: {
          model: 'gpt-4',
          promptHash: 'abc123',
          timestamp: Date.now(),
          chatId: 'chat-1',
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      expect(spec.id).toBe('spec-1')
      expect(spec.tier).toBe('ambient')
      expect(spec.intent.constraints).toHaveLength(2)
      expect(spec.plan.steps).toHaveLength(1)
    })
  })

  describe('SpecEngineConfig', () => {
    test('default config has enabled: false', () => {
      const config: SpecEngineConfig = {
        enabled: false,
      }
      expect(config.enabled).toBe(false)
    })

    test('full config options', () => {
      const config: SpecEngineConfig = {
        enabled: true,
        defaultTier: 'ambient',
        autoApproveAmbient: true,
        maxSpecsPerProject: 100,
        enableDriftDetection: true,
      }
      expect(config.enabled).toBe(true)
      expect(config.defaultTier).toBe('ambient')
      expect(config.autoApproveAmbient).toBe(true)
      expect(config.maxSpecsPerProject).toBe(100)
      expect(config.enableDriftDetection).toBe(true)
    })
  })
})

describe('SpecNative Type Exports', () => {
  test('all types are importable', () => {
    // This test ensures the module exports all required types
    // If any export is missing, this will fail at compile time
    const types = {
      SpecTier: {} as SpecTier,
      SpecStatus: {} as SpecStatus,
      Constraint: {} as Constraint,
      AcceptanceCriterion: {} as AcceptanceCriterion,
      FormalSpecification: {} as FormalSpecification,
      SpecEngineConfig: {} as SpecEngineConfig,
    }

    expect(types).toBeDefined()
  })
})
