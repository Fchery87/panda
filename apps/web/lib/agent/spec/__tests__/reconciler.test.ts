/**
 * Spec Reconciler Tests
 *
 * Tests for the SpecReconciler class including:
 * - Drift detection
 * - Reconciliation
 * - Version chaining
 * - Spec comparison
 */

import { describe, test, expect } from 'bun:test'
import { SpecReconciler, createSpecReconciler, type ReconciliationChange } from '../reconciler'
import type { FormalSpecification } from '../types'

// Test fixtures
const createMockSpec = (overrides: Partial<FormalSpecification> = {}): FormalSpecification => ({
  id: 'spec_test_001',
  version: 1,
  tier: 'ambient',
  status: 'verified',
  intent: {
    goal: 'Test specification',
    rawMessage: 'Create a test feature',
    constraints: [
      { type: 'structural', rule: 'Use TypeScript', target: 'src/**/*.ts' },
      { type: 'behavioral', rule: 'Handle errors gracefully', assertion: 'try-catch blocks' },
    ],
    acceptanceCriteria: [
      {
        id: 'ac-1',
        trigger: 'user submits form',
        behavior: 'validation runs',
        verificationMethod: 'automated',
        status: 'passed',
      },
    ],
  },
  plan: {
    steps: [
      {
        id: 'step-1',
        description: 'Create component',
        tools: ['write_files'],
        targetFiles: ['src/components/Test.tsx'],
        status: 'completed',
      },
    ],
    dependencies: [
      { path: 'src/components/Test.tsx', access: 'write', reason: 'Create component' },
      { path: 'src/types.ts', access: 'read', reason: 'Import types' },
    ],
    risks: [],
    estimatedTools: ['write_files'],
  },
  validation: {
    preConditions: [],
    postConditions: [],
    invariants: [
      { description: 'Types remain valid', scope: 'src/types.ts', rule: 'No breaking changes' },
    ],
  },
  provenance: {
    model: 'gpt-4o',
    promptHash: 'abc123',
    timestamp: Date.now(),
    chatId: 'chat_001',
  },
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
})

describe('SpecReconciler', () => {
  let reconciler: SpecReconciler

  const setup = () => {
    reconciler = createSpecReconciler()
  }

  describe('detectDrift', () => {
    test('should return no drift for unrelated file changes', async () => {
      setup()
      const spec = createMockSpec()
      const modifiedFiles = ['README.md', 'package.json']

      const report = await reconciler.detectDrift(spec, modifiedFiles)

      expect(report.hasDrift).toBe(false)
      expect(report.findings).toHaveLength(0)
      expect(report.specId).toBe(spec.id)
    })

    test('should detect drift for covered file modifications', async () => {
      setup()
      const spec = createMockSpec()
      const modifiedFiles = ['src/components/Test.tsx']

      const report = await reconciler.detectDrift(spec, modifiedFiles)

      expect(report.hasDrift).toBe(true)
      expect(report.findings.length).toBeGreaterThan(0)
      expect(report.modifiedFiles).toEqual(modifiedFiles)
    })

    test('should detect constraint violations', async () => {
      setup()
      const spec = createMockSpec()
      const modifiedFiles = ['src/utils/helper.ts']

      // Add a constraint that covers this file
      spec.intent.constraints.push({
        type: 'structural',
        rule: 'All utils must be pure functions',
        target: 'src/utils/**/*.ts',
      })

      // Add the file as a dependency so it's covered
      spec.plan.dependencies.push({
        path: 'src/utils/helper.ts',
        access: 'write',
        reason: 'Test utility',
      })

      const report = await reconciler.detectDrift(spec, modifiedFiles)

      expect(report.hasDrift).toBe(true)
      const constraintFinding = report.findings.find((f) => f.type === 'constraint_violation')
      expect(constraintFinding).toBeDefined()
    })

    test('should detect invariant breaches', async () => {
      setup()
      const spec = createMockSpec()
      const modifiedFiles = ['src/types.ts']

      const report = await reconciler.detectDrift(spec, modifiedFiles)

      expect(report.hasDrift).toBe(true)
      const invariantFinding = report.findings.find((f) => f.type === 'invariant_breach')
      expect(invariantFinding).toBeDefined()
      expect(invariantFinding?.severity).toBe('high')
    })

    test('should calculate correct severity', async () => {
      setup()
      const spec = createMockSpec()

      // Low severity - no invariant breach (file not covered)
      const lowReport = await reconciler.detectDrift(spec, ['README.md'])
      expect(lowReport.severity).toBe('low')

      // High severity - invariant breach (types.ts is covered by invariant)
      const highReport = await reconciler.detectDrift(spec, ['src/types.ts'])
      expect(highReport.severity).toBe('high')
    })
  })

  describe('reconcile', () => {
    test('should create new spec version', async () => {
      setup()
      const spec = createMockSpec()
      const changes: ReconciliationChange[] = [
        {
          type: 'add_constraint',
          value: { type: 'structural', rule: 'New constraint', target: 'src/' },
          reason: 'Added during reconciliation',
        },
      ]

      const result = await reconciler.reconcile(spec, changes)

      expect(result.success).toBe(true)
      expect(result.newSpec).toBeDefined()
      expect(result.newSpec?.version).toBe(spec.version + 1)
      expect(result.newSpec?.provenance.parentSpecId).toBe(spec.id)
      expect(result.changesApplied).toHaveLength(1)
    })

    test('should apply multiple changes', async () => {
      setup()
      const spec = createMockSpec()
      const changes: ReconciliationChange[] = [
        {
          type: 'add_constraint',
          value: { type: 'structural', rule: 'Constraint 1', target: 'src/' },
          reason: 'Test',
        },
        {
          type: 'add_criterion',
          value: {
            id: 'ac-new',
            trigger: 'test',
            behavior: 'test passes',
            verificationMethod: 'automated',
            status: 'pending',
          },
          reason: 'Test',
        },
      ]

      const result = await reconciler.reconcile(spec, changes)

      expect(result.success).toBe(true)
      expect(result.changesApplied).toHaveLength(2)
      // The reconciler creates a new spec version and applies changes to it
      // The constraint count should include the original 2 + 1 new = 3
      expect(result.newSpec?.intent.constraints.length).toBe(3)
      expect(result.newSpec?.intent.acceptanceCriteria.length).toBe(2)
    })

    test('should handle invalid changes gracefully', async () => {
      setup()
      const spec = createMockSpec()
      const changes: ReconciliationChange[] = [
        {
          type: 'update_constraint',
          targetId: 'non-existent',
          value: { type: 'structural', rule: 'Updated', target: 'src/' },
          reason: 'Test',
        },
      ]

      const result = await reconciler.reconcile(spec, changes)

      expect(result.success).toBe(true) // Still succeeds, just rejects the change
      expect(result.changesRejected).toHaveLength(1)
    })
  })

  describe('createVersion', () => {
    test('should increment version number', async () => {
      setup()
      const spec = createMockSpec({ version: 5 })

      const newSpec = await reconciler.createVersion(spec)

      expect(newSpec.version).toBe(6)
    })

    test('should set parent spec ID', async () => {
      setup()
      const spec = createMockSpec({ id: 'parent_123' })

      const newSpec = await reconciler.createVersion(spec)

      expect(newSpec.provenance.parentSpecId).toBe('parent_123')
    })

    test('should reset status to draft', async () => {
      setup()
      const spec = createMockSpec({ status: 'verified' })

      const newSpec = await reconciler.createVersion(spec)

      expect(newSpec.status).toBe('draft')
    })

    test('should generate new ID', async () => {
      setup()
      const spec = createMockSpec({ id: 'old_id' })

      const newSpec = await reconciler.createVersion(spec)

      expect(newSpec.id).not.toBe('old_id')
      expect(newSpec.id).toContain('spec_')
    })
  })

  describe('getVersionChain', () => {
    test('should return empty array for unregistered spec', async () => {
      setup()
      const chain = await reconciler.getVersionChain('unknown')

      expect(chain).toHaveLength(0)
    })

    test('should build version chain', async () => {
      setup()
      // Create a chain of specs
      const spec1 = createMockSpec({ id: 'spec_1', version: 1 })
      const spec2 = {
        ...createMockSpec({ id: 'spec_2', version: 2 }),
        provenance: { ...spec1.provenance, parentSpecId: 'spec_1' },
      }
      const spec3 = {
        ...createMockSpec({ id: 'spec_3', version: 3 }),
        provenance: { ...spec1.provenance, parentSpecId: 'spec_2' },
      }

      reconciler.registerSpec(spec1)
      reconciler.registerSpec(spec2)
      reconciler.registerSpec(spec3)

      const chain = await reconciler.getVersionChain('spec_3')

      expect(chain).toHaveLength(3)
      expect(chain[0].version).toBe(1)
      expect(chain[1].version).toBe(2)
      expect(chain[2].version).toBe(3)
    })
  })

  describe('compareSpecs', () => {
    test('should detect added constraints', async () => {
      setup()
      const specA = createMockSpec()
      const specB: FormalSpecification = {
        ...createMockSpec(),
        intent: {
          ...specA.intent,
          constraints: [
            ...specA.intent.constraints,
            { type: 'security', requirement: 'Use HTTPS', standard: 'OWASP' },
          ],
        },
      }

      const comparison = await reconciler.compareSpecs(specA, specB)

      expect(comparison.hasChanges).toBe(true)
      expect(comparison.differences.some((d) => d.type === 'constraint_added')).toBe(true)
    })

    test('should detect removed acceptance criteria', async () => {
      setup()
      const specA = createMockSpec()
      const specB = {
        ...createMockSpec(),
        intent: {
          ...specA.intent,
          acceptanceCriteria: [],
        },
      }

      const comparison = await reconciler.compareSpecs(specA, specB)

      expect(comparison.hasChanges).toBe(true)
      expect(comparison.differences.some((d) => d.type === 'criterion_removed')).toBe(true)
    })

    test('should detect changed steps', async () => {
      setup()
      const specA = createMockSpec()
      const specB = {
        ...createMockSpec(),
        plan: {
          ...specA.plan,
          steps: [
            {
              ...specA.plan.steps[0],
              description: 'Modified description',
            },
          ],
        },
      }

      const comparison = await reconciler.compareSpecs(specA, specB)

      expect(comparison.hasChanges).toBe(true)
      expect(comparison.differences.some((d) => d.type === 'step_changed')).toBe(true)
    })

    test('should return no changes for identical specs', async () => {
      setup()
      const specA = createMockSpec()
      const specB = createMockSpec()

      const comparison = await reconciler.compareSpecs(specA, specB)

      expect(comparison.hasChanges).toBe(false)
      expect(comparison.differences).toHaveLength(0)
    })
  })

  describe('registerSpec / unregisterSpec', () => {
    test('should register spec for monitoring', () => {
      setup()
      const spec = createMockSpec()

      reconciler.registerSpec(spec)

      // Should be able to get version chain after registration
      // (though it will just contain this spec)
      expect(reconciler.getVersionChain(spec.id)).resolves.toHaveLength(1)
    })

    test('should unregister spec', () => {
      setup()
      const spec = createMockSpec()
      reconciler.registerSpec(spec)

      reconciler.unregisterSpec(spec.id)

      expect(reconciler.getVersionChain(spec.id)).resolves.toHaveLength(0)
    })
  })

  describe('drift history', () => {
    test('should track drift history', async () => {
      setup()
      const spec = createMockSpec()
      const modifiedFiles = ['src/components/Test.tsx']

      await reconciler.detectDrift(spec, modifiedFiles)
      await reconciler.detectDrift(spec, modifiedFiles)

      const history = reconciler.getDriftHistory(spec.id)

      expect(history).toHaveLength(2)
    })

    test('should clear drift history', async () => {
      setup()
      const spec = createMockSpec()
      await reconciler.detectDrift(spec, ['src/components/Test.tsx'])

      reconciler.clearDriftHistory(spec.id)

      const history = reconciler.getDriftHistory(spec.id)
      expect(history).toHaveLength(0)
    })
  })
})
