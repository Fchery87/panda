import { describe, it, expect } from 'bun:test'
import { buildActiveSpecSystemContent } from './runtime'
import type { FormalSpecification } from '../spec/types'

describe('buildActiveSpecSystemContent', () => {
  it('produces content with goal, constraints, acceptance criteria, and plan', () => {
    const spec = {
      id: 's1',
      version: 1,
      tier: 'explicit' as const,
      status: 'executing' as const,
      intent: {
        goal: 'Add auth',
        rawMessage: 'Add auth',
        constraints: [{ type: 'security' as const, requirement: 'no plaintext passwords' }],
        acceptanceCriteria: [
          {
            id: 'a1',
            trigger: 'user submits login',
            behavior: 'login works',
            verificationMethod: 'automated' as const,
            status: 'pending' as const,
          },
        ],
      },
      plan: {
        steps: [
          {
            id: 'st1',
            description: 'add login route',
            tools: [],
            targetFiles: [],
            status: 'pending' as const,
          },
        ],
        dependencies: [],
        risks: [],
        estimatedTools: [],
      },
      validation: { preConditions: [], postConditions: [], invariants: [] },
      provenance: { model: 'test', promptHash: 'h', timestamp: 0, chatId: 'c1' },
      createdAt: 0,
      updatedAt: 0,
    } as FormalSpecification

    const content = buildActiveSpecSystemContent(spec)

    expect(content).toContain('Add auth')
    expect(content).toContain('no plaintext passwords')
    expect(content).toContain('login works')
    expect(content).toContain('add login route')
    expect(content).toContain('Scope Rule')
  })

  it('handles spec with no constraints, criteria, or plan steps', () => {
    const spec = {
      id: 's2',
      version: 1,
      tier: 'ambient' as const,
      status: 'approved' as const,
      intent: {
        goal: 'Fix typo',
        rawMessage: 'Fix typo',
        constraints: [],
        acceptanceCriteria: [],
      },
      plan: { steps: [], dependencies: [], risks: [], estimatedTools: [] },
      validation: { preConditions: [], postConditions: [], invariants: [] },
      provenance: { model: 'test', promptHash: 'h', timestamp: 0, chatId: 'c1' },
      createdAt: 0,
      updatedAt: 0,
    } as FormalSpecification

    const content = buildActiveSpecSystemContent(spec)

    expect(content).toContain('Fix typo')
    expect(content).toContain('Scope Rule')
    expect(content).not.toContain('Constraints')
  })
})
