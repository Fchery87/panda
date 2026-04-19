import { describe, expect, test } from 'bun:test'
import { buildSpecSystemMessage, registerActiveSpecForDrift } from './injector'
import type { FormalSpecification } from './types'

const fakeSpec: FormalSpecification = {
  id: 'spec-1',
  version: 1,
  tier: 'explicit',
  status: 'approved',
  intent: {
    goal: 'Implement feature X',
    rawMessage: 'Add feature X',
    constraints: [
      { type: 'structural', rule: 'Must not break existing tests', target: 'src/**/*.test.ts' },
      { type: 'behavioral', rule: 'Must respond within 200ms', assertion: 'responseTime < 200' },
    ],
    acceptanceCriteria: [
      {
        id: 'ac-1',
        trigger: 'When feature X is invoked',
        behavior: 'All tests pass',
        verificationMethod: 'automated',
        status: 'pending',
      },
    ],
  },
  plan: {
    steps: [
      {
        id: 's1',
        description: 'Write types',
        tools: ['write_files'],
        targetFiles: ['src/types.ts'],
        status: 'pending',
      },
      {
        id: 's2',
        description: 'Implement',
        tools: ['write_files'],
        targetFiles: ['src/impl.ts'],
        status: 'pending',
      },
    ],
    dependencies: [],
    risks: [],
    estimatedTools: ['write_files'],
  },
  validation: {
    preConditions: [],
    postConditions: [],
    invariants: [],
  },
  provenance: {
    model: 'test',
    promptHash: 'abc',
    timestamp: Date.now(),
    chatId: 'chat-1',
  },
  createdAt: Date.now(),
  updatedAt: Date.now(),
}

describe('buildSpecSystemMessage', () => {
  test('returns string with constraints', () => {
    const msg = buildSpecSystemMessage(fakeSpec)
    expect(typeof msg).toBe('string')
    expect(msg).toContain('Must not break existing tests')
  })

  test('includes acceptance criteria', () => {
    const msg = buildSpecSystemMessage(fakeSpec)
    expect(msg).toContain('All tests pass')
  })

  test('includes execution plan', () => {
    const msg = buildSpecSystemMessage(fakeSpec)
    expect(msg).toContain('Write types')
  })
})

describe('registerActiveSpecForDrift', () => {
  test('does not throw for a valid spec', () => {
    expect(() => registerActiveSpecForDrift(fakeSpec)).not.toThrow()
  })
})
