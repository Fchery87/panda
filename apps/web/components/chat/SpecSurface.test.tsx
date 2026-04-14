import { describe, it, expect } from 'bun:test'
import { SpecSurface } from './SpecSurface'

describe('SpecSurface', () => {
  it('returns null when mode is closed', () => {
    const result = SpecSurface({
      mode: 'closed',
      spec: { id: 's1' } as any,
      onApprove: () => {},
      onEdit: () => {},
      onCancel: () => {},
      onClose: () => {},
    })
    expect(result).toBeNull()
  })

  it('returns null when spec is null', () => {
    const result = SpecSurface({
      mode: 'approval',
      spec: null,
      onApprove: () => {},
      onEdit: () => {},
      onCancel: () => {},
      onClose: () => {},
    })
    expect(result).toBeNull()
  })

  it('returns element when mode is approval with spec', () => {
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
    const result = SpecSurface({
      mode: 'approval',
      spec,
      onApprove: () => {},
      onEdit: () => {},
      onCancel: () => {},
      onClose: () => {},
    })
    expect(result).not.toBeNull()
  })
})
