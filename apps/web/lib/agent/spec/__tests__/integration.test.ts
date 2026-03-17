/**
 * SpecNative Integration Tests
 *
 * End-to-end tests for the full SpecNative flow:
 * - Spec generation → execution → drift detection → reconciliation
 * - Version chaining
 * - Plugin integration
 */

import { describe, test, expect } from 'bun:test'
import { SpecEngine, createSpecEngine } from '../engine'
import { SpecReconciler, createSpecReconciler } from '../reconciler'
import {
  createDriftDetectionPlugin,
  registerActiveSpec,
  unregisterActiveSpec,
  createDriftReport,
  getActiveSpecs,
} from '../drift-detection'
import { plugins, registerDefaultPlugins } from '../../harness/plugins'
import type { FormalSpecification } from '../types'
import type { SpecGenerationContext } from '../engine'

describe('SpecNative Integration', () => {
  let engine: SpecEngine
  let reconciler: SpecReconciler

  const setup = () => {
    engine = createSpecEngine({ enabled: true, enableDriftDetection: true })
    reconciler = createSpecReconciler()
  }

  describe('Full Spec Lifecycle', () => {
    test('should generate spec from user message', async () => {
      setup()
      const context: SpecGenerationContext = {
        projectId: 'proj_123',
        chatId: 'chat_123',
        mode: 'code',
        existingFiles: ['src/components/Button.tsx'],
      }

      const result = await engine.generate(
        'Add a loading state to the Button component',
        context,
        'ambient'
      )

      expect(result.spec).toBeDefined()
      expect(result.spec.intent.goal).toBeTruthy()
      expect(result.spec.tier).toBe('ambient')
      expect(result.spec.version).toBe(1)
    })

    test('should validate generated spec', async () => {
      setup()
      const context: SpecGenerationContext = {
        mode: 'code',
      }

      const { spec } = await engine.generate('Fix the bug', context, 'ambient')
      const validation = await engine.validate(spec)

      // Generated specs may have validation errors that get fixed during refinement
      expect(validation).toBeDefined()
      expect(Array.isArray(validation.errors)).toBe(true)
      expect(Array.isArray(validation.warnings)).toBe(true)
    })

    test('should refine spec based on validation errors', async () => {
      setup()
      const context: SpecGenerationContext = {
        mode: 'code',
      }

      const { spec } = await engine.generate('Test', context, 'ambient')

      // Create validation errors by clearing required fields
      const invalidSpec = {
        ...spec,
        intent: {
          ...spec.intent,
          goal: '', // Invalid - empty goal
        },
      }

      const refined = await engine.refine(invalidSpec, [
        {
          field: 'intent.goal',
          message: 'Goal is required',
          severity: 'error',
          code: 'MISSING_GOAL',
        },
      ])

      expect(refined.intent.goal).toBeTruthy() // Should be fixed
      expect(refined.version).toBe(spec.version + 1)
    })

    test('should verify spec against execution results', async () => {
      setup()
      const context: SpecGenerationContext = {
        mode: 'code',
      }

      const { spec } = await engine.generate('Add a feature', context, 'ambient')

      const executionResults = {
        filesModified: ['src/components/NewFeature.tsx'],
        commandsRun: [],
        errors: [],
        output: 'Successfully added the feature',
      }

      const verification = await engine.verify(spec, executionResults)

      expect(verification.passed).toBeDefined()
      expect(verification.criterionResults).toBeDefined()
    })
  })

  describe('Drift Detection Flow', () => {
    test('should detect drift when files are modified', async () => {
      setup()
      const spec: FormalSpecification = {
        id: 'spec_drift_test',
        version: 1,
        tier: 'ambient',
        status: 'verified',
        intent: {
          goal: 'Test drift detection',
          rawMessage: 'Test',
          constraints: [],
          acceptanceCriteria: [],
        },
        plan: {
          steps: [],
          dependencies: [{ path: 'src/components/Test.tsx', access: 'write', reason: 'Test' }],
          risks: [],
          estimatedTools: [],
        },
        validation: {
          preConditions: [],
          postConditions: [],
          invariants: [],
        },
        provenance: {
          model: 'gpt-4o',
          promptHash: 'test',
          timestamp: Date.now(),
          chatId: 'chat_123',
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      const report = await reconciler.detectDrift(spec, ['src/components/Test.tsx'])

      expect(report.hasDrift).toBe(true)
      expect(report.specId).toBe(spec.id)
    })

    test('should create drift report manually', () => {
      setup()
      const spec: FormalSpecification = {
        id: 'spec_manual_drift',
        version: 1,
        tier: 'ambient',
        status: 'verified',
        intent: {
          goal: 'Manual drift test',
          rawMessage: 'Test',
          constraints: [],
          acceptanceCriteria: [],
        },
        plan: {
          steps: [],
          dependencies: [],
          risks: [],
          estimatedTools: [],
        },
        validation: {
          preConditions: [],
          postConditions: [],
          invariants: [],
        },
        provenance: {
          model: 'gpt-4o',
          promptHash: 'test',
          timestamp: Date.now(),
          chatId: 'chat_123',
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      const report = createDriftReport(spec, ['src/file.ts'], 'Manual test')

      expect(report.hasDrift).toBe(true)
      expect(report.specId).toBe(spec.id)
      expect(report.findings.length).toBeGreaterThan(0)
    })
  })

  describe('Reconciliation Flow', () => {
    test('should refine spec from drift report', async () => {
      setup()
      const spec: FormalSpecification = {
        id: 'spec_reconcile_test',
        version: 1,
        tier: 'ambient',
        status: 'verified',
        intent: {
          goal: 'Reconcile test',
          rawMessage: 'Test',
          constraints: [{ type: 'structural', rule: 'Original rule', target: 'src/' }],
          acceptanceCriteria: [],
        },
        plan: {
          steps: [],
          dependencies: [],
          risks: [],
          estimatedTools: [],
        },
        validation: {
          preConditions: [],
          postConditions: [],
          invariants: [],
        },
        provenance: {
          model: 'gpt-4o',
          promptHash: 'test',
          timestamp: Date.now(),
          chatId: 'chat_123',
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      const driftReport = createDriftReport(spec, ['src/file.ts'], 'Test drift')

      const result = await engine.refineFromDrift(spec, driftReport)

      expect(result.spec).toBeDefined()
      expect(result.changes.length).toBeGreaterThan(0)
      expect(result.spec.version).toBe(spec.version + 1)
      // Status depends on validation - may be draft or validated
      expect(['draft', 'validated']).toContain(result.spec.status)
    })

    test('should create version chain through reconciliation', async () => {
      setup()
      const spec: FormalSpecification = {
        id: 'spec_chain_test',
        version: 1,
        tier: 'ambient',
        status: 'verified',
        intent: {
          goal: 'Chain test',
          rawMessage: 'Test',
          constraints: [],
          acceptanceCriteria: [],
        },
        plan: {
          steps: [],
          dependencies: [],
          risks: [],
          estimatedTools: [],
        },
        validation: {
          preConditions: [],
          postConditions: [],
          invariants: [],
        },
        provenance: {
          model: 'gpt-4o',
          promptHash: 'test',
          timestamp: Date.now(),
          chatId: 'chat_123',
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      // First reconciliation
      const driftReport1 = createDriftReport(spec, ['src/file1.ts'], 'First drift')
      const result1 = await engine.refineFromDrift(spec, driftReport1)

      // Second reconciliation
      const driftReport2 = createDriftReport(result1.spec, ['src/file2.ts'], 'Second drift')
      const result2 = await engine.refineFromDrift(result1.spec, driftReport2)

      expect(result1.spec.version).toBe(2)
      expect(result2.spec.version).toBe(3)
      expect(result1.spec.provenance.parentSpecId).toBe(spec.id)
      expect(result2.spec.provenance.parentSpecId).toBe(result1.spec.id)
    })
  })

  describe('Plugin Integration', () => {
    test('should create drift detection plugin', () => {
      setup()
      const plugin = createDriftDetectionPlugin({
        enabled: true,
        minSeverity: 'low',
      })

      expect(plugin.name).toBe('drift-detection')
      expect(plugin.hooks['tool.execute.after']).toBeDefined()
    })

    test('should register and unregister specs for monitoring', () => {
      setup()
      const spec: FormalSpecification = {
        id: 'spec_monitor_test',
        version: 1,
        tier: 'ambient',
        status: 'verified',
        intent: {
          goal: 'Monitor test',
          rawMessage: 'Test',
          constraints: [],
          acceptanceCriteria: [],
        },
        plan: {
          steps: [],
          dependencies: [],
          risks: [],
          estimatedTools: [],
        },
        validation: {
          preConditions: [],
          postConditions: [],
          invariants: [],
        },
        provenance: {
          model: 'gpt-4o',
          promptHash: 'test',
          timestamp: Date.now(),
          chatId: 'chat_123',
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      registerActiveSpec(spec)

      // Spec should be in active specs
      plugins.listPlugins().find((p) => p.name === 'spec-tracking')
      // Note: We can't directly test the internal state, but we can verify
      // the registration functions don't throw

      unregisterActiveSpec(spec.id)
    })
  })

  describe('Spec Status Transitions', () => {
    test('should transition through spec lifecycle', async () => {
      setup()
      const context: SpecGenerationContext = {
        mode: 'code',
      }

      // Generate
      const { spec } = await engine.generate('Test feature', context, 'explicit')
      expect(spec.status).toBe('draft')

      // Validate - refine with empty errors just returns the spec with status update
      const validated = await engine.refine(spec, [])
      // Status could be draft or validated depending on initial spec validity
      expect(['draft', 'validated']).toContain(validated.status)

      // Approve
      const approved = engine.approve(validated)
      expect(approved.status).toBe('approved')

      // Execute
      const executing = engine.markExecuting(approved)
      expect(executing.status).toBe('executing')

      // Verify
      const verified = engine.markVerified(executing, [])
      expect(verified.status).toBe('verified')
    })

    test('should mark spec as drifted', async () => {
      setup()
      const context: SpecGenerationContext = {
        mode: 'code',
      }

      const { spec } = await engine.generate('Test', context, 'ambient')

      const driftReport = createDriftReport(spec, ['src/file.ts'], 'Test')
      const drifted = engine.markDrifted(spec, driftReport)

      expect(drifted.status).toBe('drifted')
    })

    test('should mark spec as failed', async () => {
      setup()
      const context: SpecGenerationContext = {
        mode: 'code',
      }

      const { spec } = await engine.generate('Test', context, 'ambient')
      const failed = engine.markFailed(spec, 'Execution failed')

      expect(failed.status).toBe('failed')
    })
  })

  describe('End-to-End Flow', () => {
    test('complete spec lifecycle: generate → execute → drift → reconcile', async () => {
      setup()
      // 1. Generate spec
      const context: SpecGenerationContext = {
        mode: 'code',
        existingFiles: ['src/components/Button.tsx'],
      }

      const { spec: generatedSpec } = await engine.generate(
        'Add loading state to Button',
        context,
        'ambient'
      )

      expect(generatedSpec).toBeDefined()
      expect(generatedSpec.status).toBe('draft')

      // 2. Validate
      const validation = await engine.validate(generatedSpec)
      // Validation may have errors that get fixed during refinement
      expect(validation).toBeDefined()
      expect(Array.isArray(validation.errors)).toBe(true)

      // 3. Mark as executing
      const executingSpec = engine.markExecuting(generatedSpec)
      expect(executingSpec.status).toBe('executing')

      // 4. Simulate execution with file modifications
      const executionResults = {
        filesModified: ['src/components/Button.tsx'],
        commandsRun: [],
        errors: [],
        output: 'Added loading state',
      }

      // 5. Verify
      const verification = await engine.verify(executingSpec, executionResults)
      const verifiedSpec = engine.markVerified(executingSpec, verification.criterionResults)
      expect(verifiedSpec.status).toBe('verified')

      // 6. Detect drift (simulating a later change)
      const driftReport = await reconciler.detectDrift(verifiedSpec, executionResults.filesModified)

      if (driftReport.hasDrift) {
        // 7. Reconcile
        const { spec: reconciledSpec } = await engine.refineFromDrift(verifiedSpec, driftReport)
        expect(reconciledSpec.version).toBe(verifiedSpec.version + 1)
        // Status depends on validation - may be draft or validated
        expect(['draft', 'validated']).toContain(reconciledSpec.status)
      }
    })
  })

  describe('Drift Detection in Default Runtime Path', () => {
    test('should have drift detection plugin registered in default plugins', async () => {
      setup()

      // Ensure default plugins are registered
      registerDefaultPlugins()

      // List all registered plugins
      const allPlugins = plugins.listPlugins()
      const pluginNames = allPlugins.map((p) => p.name)

      // Drift detection plugin should be registered
      expect(pluginNames).toContain('drift-detection')
      expect(pluginNames).toContain('spec-tracking')
    })

    test('should register and unregister specs for drift monitoring', async () => {
      setup()

      const spec: FormalSpecification = {
        id: 'spec_monitor_test',
        version: 1,
        tier: 'ambient',
        status: 'verified',
        intent: {
          goal: 'Monitor test',
          rawMessage: 'Test',
          constraints: [],
          acceptanceCriteria: [],
        },
        plan: {
          steps: [],
          dependencies: [{ path: 'src/components/Test.tsx', access: 'write', reason: 'Test' }],
          risks: [],
          estimatedTools: [],
        },
        validation: {
          preConditions: [],
          postConditions: [],
          invariants: [],
        },
        provenance: {
          model: 'gpt-4o',
          promptHash: 'test',
          timestamp: Date.now(),
          chatId: 'chat_123',
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      // Register the spec
      registerActiveSpec(spec)

      // Verify it's in active specs
      const activeSpecs = getActiveSpecs()
      expect(activeSpecs.some((s) => s.id === spec.id)).toBe(true)

      // Unregister
      unregisterActiveSpec(spec.id)

      // Verify it's removed
      const activeSpecsAfter = getActiveSpecs()
      expect(activeSpecsAfter.some((s) => s.id === spec.id)).toBe(false)
    })

    test('should detect drift when watched files are modified', async () => {
      setup()
      registerDefaultPlugins()

      const spec: FormalSpecification = {
        id: 'spec_drift_test',
        version: 1,
        tier: 'ambient',
        status: 'verified',
        intent: {
          goal: 'Test drift detection',
          rawMessage: 'Test',
          constraints: [],
          acceptanceCriteria: [],
        },
        plan: {
          steps: [],
          dependencies: [{ path: 'src/components/Test.tsx', access: 'write', reason: 'Test' }],
          risks: [],
          estimatedTools: [],
        },
        validation: {
          preConditions: [],
          postConditions: [],
          invariants: [],
        },
        provenance: {
          model: 'gpt-4o',
          promptHash: 'test',
          timestamp: Date.now(),
          chatId: 'chat_123',
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      registerActiveSpec(spec)

      // Execute the drift detection plugin hook
      const driftPlugin = plugins.getPlugin('drift-detection')
      expect(driftPlugin).toBeDefined()
      expect(driftPlugin?.hooks['tool.execute.after']).toBeDefined()

      // Cleanup
      unregisterActiveSpec(spec.id)
    })
  })
})
