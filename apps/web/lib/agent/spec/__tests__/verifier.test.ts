/**
 * Verifier Tests - Tests for spec verification
 */

import { describe, test, expect } from 'bun:test'
import { verifySpec, canMarkAsVerified, getStatusFromVerification } from '../verifier'
import type { FormalSpecification } from '../types'

function createSpecForVerification(): FormalSpecification {
  return {
    id: 'spec_test_123',
    version: 1,
    tier: 'ambient',
    status: 'executing',
    intent: {
      goal: 'Add a new feature',
      rawMessage: 'Add a new feature',
      constraints: [
        { type: 'behavioral', rule: 'Handle errors gracefully', assertion: 'try-catch present' },
      ],
      acceptanceCriteria: [
        {
          id: 'ac-1',
          trigger: 'the feature is implemented',
          behavior: 'the system provides the new functionality',
          verificationMethod: 'automated',
          status: 'pending',
        },
        {
          id: 'ac-2',
          trigger: 'a user uses the feature',
          behavior: 'the system responds correctly',
          verificationMethod: 'llm-judge',
          status: 'pending',
        },
      ],
    },
    plan: {
      steps: [
        {
          id: 'step-1',
          description: 'Implement',
          tools: ['write_files'],
          targetFiles: ['src/'],
          status: 'completed',
        },
      ],
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
      promptHash: 'abc123',
      timestamp: Date.now(),
      chatId: 'chat_123',
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

describe('verifySpec', () => {
  test('verifies successful execution', async () => {
    const spec = createSpecForVerification()
    const executionResults = {
      filesModified: ['src/feature.ts'],
      commandsRun: ['npm test'],
      errors: [],
      output: 'Feature added successfully',
    }

    const report = await verifySpec(spec, executionResults)

    // Verification may pass or fail depending on criterion matching
    // but should always return results
    expect(report.criterionResults.length).toBe(2)
    expect(report.status).toBeDefined()
  })

  test('fails verification with errors', async () => {
    const spec = createSpecForVerification()
    const executionResults = {
      filesModified: [],
      commandsRun: [],
      errors: ['Build failed', 'Type error'],
      output: '',
    }

    const report = await verifySpec(spec, executionResults)

    expect(report.passed).toBe(false)
    expect(report.status).toBe('failed')
  })

  test('generates summary', async () => {
    const spec = createSpecForVerification()
    const executionResults = {
      filesModified: ['src/feature.ts'],
      errors: [],
      output: 'Success',
    }

    const report = await verifySpec(spec, executionResults)

    expect(report.summary).toBeTruthy()
    expect(report.summary.length).toBeGreaterThan(0)
  })

  test('generates recommendations for failures', async () => {
    const spec = createSpecForVerification()
    const executionResults = {
      filesModified: [],
      errors: ['Test failed'],
      output: '',
    }

    const report = await verifySpec(spec, executionResults)

    expect(report.recommendations.length).toBeGreaterThan(0)
  })

  test('verifies constraints', async () => {
    const spec = createSpecForVerification()
    const executionResults = {
      filesModified: ['src/feature.ts'],
      errors: [],
      output: 'Success',
    }

    const report = await verifySpec(spec, executionResults)

    expect(report.constraintResults.length).toBeGreaterThan(0)
  })

  test('includes timestamp', async () => {
    const spec = createSpecForVerification()
    const before = Date.now()
    const report = await verifySpec(spec, { errors: [] })
    const after = Date.now()

    expect(report.timestamp).toBeGreaterThanOrEqual(before)
    expect(report.timestamp).toBeLessThanOrEqual(after)
  })
})

describe('canMarkAsVerified', () => {
  test('returns true for passed status', () => {
    const report = {
      passed: true,
      status: 'passed' as const,
      criterionResults: [],
      constraintResults: [],
      summary: '',
      recommendations: [],
      timestamp: Date.now(),
    }

    expect(canMarkAsVerified(report)).toBe(true)
  })

  test('returns true for partial status', () => {
    const report = {
      passed: false,
      status: 'partial' as const,
      criterionResults: [],
      constraintResults: [],
      summary: '',
      recommendations: [],
      timestamp: Date.now(),
    }

    expect(canMarkAsVerified(report)).toBe(true)
  })

  test('returns false for failed status', () => {
    const report = {
      passed: false,
      status: 'failed' as const,
      criterionResults: [],
      constraintResults: [],
      summary: '',
      recommendations: [],
      timestamp: Date.now(),
    }

    expect(canMarkAsVerified(report)).toBe(false)
  })
})

describe('getStatusFromVerification', () => {
  test('returns verified for passed', () => {
    const report = {
      passed: true,
      status: 'passed' as const,
      criterionResults: [],
      constraintResults: [],
      summary: '',
      recommendations: [],
      timestamp: Date.now(),
    }

    expect(getStatusFromVerification(report)).toBe('verified')
  })

  test('returns failed for failed', () => {
    const report = {
      passed: false,
      status: 'failed' as const,
      criterionResults: [],
      constraintResults: [],
      summary: '',
      recommendations: [],
      timestamp: Date.now(),
    }

    expect(getStatusFromVerification(report)).toBe('failed')
  })

  test('returns drifted for other statuses', () => {
    const report = {
      passed: false,
      status: 'inconclusive' as const,
      criterionResults: [],
      constraintResults: [],
      summary: '',
      recommendations: [],
      timestamp: Date.now(),
    }

    expect(getStatusFromVerification(report)).toBe('drifted')
  })
})

describe('Verification terminal semantics', () => {
  test('passed verification is considered terminal success', () => {
    const report = {
      passed: true,
      status: 'passed' as const,
      criterionResults: [{ criterionId: 'ac1', passed: true }],
      constraintResults: [],
      summary: 'All passed',
      recommendations: [],
      timestamp: Date.now(),
    }

    // passed status should result in verified
    expect(getStatusFromVerification(report)).toBe('verified')
    expect(canMarkAsVerified(report)).toBe(true)
  })

  test('failed verification is not considered terminal success', () => {
    const report = {
      passed: false,
      status: 'failed' as const,
      criterionResults: [{ criterionId: 'ac1', passed: false, message: 'Failed' }],
      constraintResults: [],
      summary: 'Failed',
      recommendations: ['Fix issues'],
      timestamp: Date.now(),
    }

    // failed status should result in failed
    expect(getStatusFromVerification(report)).toBe('failed')
    expect(canMarkAsVerified(report)).toBe(false)
  })

  test('inconclusive verification is not considered terminal success', () => {
    const report = {
      passed: false,
      status: 'inconclusive' as const,
      criterionResults: [],
      constraintResults: [],
      summary: 'Inconclusive',
      recommendations: [],
      timestamp: Date.now(),
    }

    // inconclusive status should result in drifted, not verified
    expect(getStatusFromVerification(report)).toBe('drifted')
    // Note: canMarkAsVerified returns false for inconclusive
    expect(canMarkAsVerified(report)).toBe(false)
  })

  test('partial verification is informational but may not auto-green strict flows', () => {
    const report = {
      passed: false,
      status: 'partial' as const,
      criterionResults: [
        { criterionId: 'ac1', passed: true },
        { criterionId: 'ac2', passed: false },
      ],
      constraintResults: [],
      summary: 'Partial',
      recommendations: [],
      timestamp: Date.now(),
    }

    // Current behavior: partial is considered verified by canMarkAsVerified
    // This documents the current state. In strict build flows, this may need
    // to be tightened to require 'passed' status only.
    expect(canMarkAsVerified(report)).toBe(true)

    // However, partial results in drifted status, not verified
    expect(getStatusFromVerification(report)).toBe('drifted')
  })

  test('manual verification criteria require explicit resolution', async () => {
    const spec: FormalSpecification = {
      id: 'spec_manual_test',
      version: 1,
      tier: 'ambient',
      status: 'executing',
      intent: {
        goal: 'Test manual criteria',
        rawMessage: 'Test',
        constraints: [],
        acceptanceCriteria: [
          {
            id: 'ac-manual',
            trigger: 'manual review',
            behavior: 'expert approves',
            verificationMethod: 'manual',
            status: 'pending',
          },
        ],
      },
      plan: { steps: [], dependencies: [], risks: [], estimatedTools: [] },
      validation: { preConditions: [], postConditions: [], invariants: [] },
      provenance: {
        model: 'gpt-4o',
        promptHash: 'test',
        timestamp: Date.now(),
        chatId: 'chat_123',
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    const results = {
      filesModified: ['src/test.ts'],
      errors: [],
      output: 'Done',
    }

    const report = await verifySpec(spec, results)

    // Manual criteria should not auto-pass without explicit approval
    // The verification should remain pending (not passed)
    expect(report.criterionResults[0].passed).toBe(false)
  })
})
