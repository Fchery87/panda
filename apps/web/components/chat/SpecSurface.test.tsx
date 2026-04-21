import { describe, it, expect } from 'bun:test'
import { PlanVerificationDrawer } from './PlanVerificationDrawer'

describe('PlanVerificationDrawer', () => {
  it('returns null when mode is closed', () => {
    const result = PlanVerificationDrawer({
      mode: 'closed',
      spec: { id: 's1' } as any,
      onClose: () => {},
    })
    expect(result).toBeNull()
  })

  it('returns null when spec is null', () => {
    const result = PlanVerificationDrawer({
      mode: 'inspect',
      spec: null,
      onClose: () => {},
    })
    expect(result).toBeNull()
  })

  it('returns element when mode is inspect with spec', () => {
    const spec = {
      id: 's1',
      version: 1,
      tier: 'explicit',
      status: 'draft',
      intent: {
        goal: 'Add login form',
        rawMessage: '',
        constraints: [],
        acceptanceCriteria: [],
      },
      plan: { steps: [], dependencies: [], risks: [], estimatedTools: [] },
      validation: { preConditions: [], postConditions: [], invariants: [] },
      provenance: { model: 'test', promptHash: 'h', timestamp: 0, chatId: 'c1' },
      createdAt: 0,
      updatedAt: 0,
    } as any
    const result = PlanVerificationDrawer({
      mode: 'inspect',
      spec,
      onClose: () => {},
    })
    expect(result).not.toBeNull()
  })
})
