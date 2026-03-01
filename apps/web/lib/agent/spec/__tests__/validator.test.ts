/**
 * Validator Tests - Tests for spec validation
 */

import { describe, test, expect } from 'bun:test'
import { validateSpec, quickValidate } from '../validator'
import type { FormalSpecification } from '../types'

function createValidSpec(): FormalSpecification {
  return {
    id: 'spec_test_123',
    version: 1,
    tier: 'ambient',
    status: 'draft',
    intent: {
      goal: 'Add a new feature to the application',
      rawMessage: 'Add a new feature',
      constraints: [{ type: 'structural', rule: 'Follow existing patterns', target: 'src/' }],
      acceptanceCriteria: [
        {
          id: 'ac-1',
          trigger: 'the feature is implemented',
          behavior: 'the system provides the new functionality',
          verificationMethod: 'automated',
          status: 'pending',
        },
      ],
    },
    plan: {
      steps: [
        {
          id: 'step-1',
          description: 'Implement the feature',
          tools: ['write_files'],
          targetFiles: ['src/feature.ts'],
          status: 'pending',
        },
      ],
      dependencies: [{ path: 'src/', access: 'write', reason: 'Feature implementation' }],
      risks: [
        { description: 'May break existing code', severity: 'medium', mitigation: 'Add tests' },
      ],
      estimatedTools: ['write_files'],
    },
    validation: {
      preConditions: [
        { description: 'Project builds', check: 'npm run build', type: 'command-passes' },
      ],
      postConditions: [{ description: 'Tests pass', check: 'npm test', type: 'command-passes' }],
      invariants: [
        { description: 'No breaking changes', scope: 'src/', rule: 'APIs remain stable' },
      ],
    },
    provenance: {
      model: 'gpt-4o',
      promptHash: 'abc123',
      timestamp: Date.now(),
      chatId: 'chat_123',
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

describe('validateSpec', () => {
  test('validates a correct spec', async () => {
    const spec = createValidSpec()
    const result = await validateSpec(spec)

    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  test('detects missing id', async () => {
    const spec = { ...createValidSpec(), id: '' }
    const result = await validateSpec(spec)

    expect(result.isValid).toBe(false)
    expect(result.errors.some((e) => e.field === 'id')).toBe(true)
  })

  test('detects invalid version', async () => {
    const spec = { ...createValidSpec(), version: 0 }
    const result = await validateSpec(spec)

    expect(result.isValid).toBe(false)
    expect(result.errors.some((e) => e.field === 'version')).toBe(true)
  })

  test('detects missing goal', async () => {
    const spec = createValidSpec()
    spec.intent = { ...spec.intent, goal: '' }
    const result = await validateSpec(spec)

    expect(result.isValid).toBe(false)
    expect(result.errors.some((e) => e.field === 'intent.goal')).toBe(true)
  })

  test('detects short goal', async () => {
    const spec = createValidSpec()
    spec.intent = { ...spec.intent, goal: 'Hi' }
    const result = await validateSpec(spec)

    expect(result.isValid).toBe(false)
    expect(result.errors.some((e) => e.field === 'intent.goal')).toBe(true)
  })

  test('detects no steps', async () => {
    const spec = createValidSpec()
    spec.plan = { ...spec.plan, steps: [] }
    const result = await validateSpec(spec)

    expect(result.isValid).toBe(false)
    expect(result.errors.some((e) => e.field === 'plan.steps')).toBe(true)
  })

  test('detects duplicate step ids', async () => {
    const spec = createValidSpec()
    spec.plan = {
      ...spec.plan,
      steps: [
        { id: 'step-1', description: 'Step 1', tools: [], targetFiles: [], status: 'pending' },
        { id: 'step-1', description: 'Step 2', tools: [], targetFiles: [], status: 'pending' },
      ],
    }
    const result = await validateSpec(spec)

    expect(result.errors.some((e) => e.code === 'SEM-002')).toBe(true)
  })

  test('warns on long goal', async () => {
    const spec = createValidSpec()
    spec.intent = { ...spec.intent, goal: 'a'.repeat(600) }
    const result = await validateSpec(spec)

    expect(result.warnings.some((e) => e.field === 'intent.goal')).toBe(true)
  })

  test('validates acceptance criteria EARS syntax', async () => {
    const spec = createValidSpec()
    spec.intent = {
      ...spec.intent,
      acceptanceCriteria: [
        {
          id: 'ac-1',
          trigger: 'user clicks button',
          behavior: 'modal opens',
          verificationMethod: 'automated',
          status: 'pending',
        },
      ],
    }
    const result = await validateSpec(spec)

    expect(result.warnings.some((e) => e.code === 'SEM-003')).toBe(true)
  })
})

describe('quickValidate', () => {
  test('validates minimal spec', () => {
    const spec: Partial<FormalSpecification> = {
      id: 'test',
      intent: { goal: 'Test', rawMessage: 'Test', constraints: [], acceptanceCriteria: [] },
      plan: {
        steps: [{ id: '1', description: 'Step', tools: [], targetFiles: [], status: 'pending' }],
        dependencies: [],
        risks: [],
        estimatedTools: [],
      },
    }

    const result = quickValidate(spec)
    expect(result.isValid).toBe(true)
  })

  test('detects missing id', () => {
    const result = quickValidate({})
    expect(result.isValid).toBe(false)
    expect(result.errors.some((e) => e.field === 'id')).toBe(true)
  })

  test('detects missing goal', () => {
    const result = quickValidate({ id: 'test' })
    expect(result.isValid).toBe(false)
    expect(result.errors.some((e) => e.field === 'intent.goal')).toBe(true)
  })

  test('detects missing steps', () => {
    const result = quickValidate({
      id: 'test',
      intent: { goal: 'Test', rawMessage: 'Test', constraints: [], acceptanceCriteria: [] },
    })
    expect(result.isValid).toBe(false)
    expect(result.errors.some((e) => e.field === 'plan.steps')).toBe(true)
  })
})
