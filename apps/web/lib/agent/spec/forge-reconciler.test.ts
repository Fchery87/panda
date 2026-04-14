import { describe, expect, it } from 'bun:test'
import type { FormalSpecification, SpecStatus } from './types'
import type { ForgeGateStatus, ForgeGateType, ForgePhase } from '../../forge/types'
import { reconcileSpecAndForge } from './forge-reconciler'

const baseSpec: FormalSpecification = {
  id: 'spec_x',
  version: 1,
  tier: 'explicit',
  status: 'verified',
  intent: { goal: 'g', rawMessage: 'r', constraints: [], acceptanceCriteria: [] },
  plan: { steps: [], dependencies: [], risks: [], estimatedTools: [] },
  validation: { preConditions: [], postConditions: [], invariants: [] },
  provenance: { model: 'm', promptHash: 'h', timestamp: 0, chatId: 'c' },
  createdAt: 0,
  updatedAt: 0,
}
const gates = (over?: Partial<Record<ForgeGateType, ForgeGateStatus>>) =>
  ({
    architecture_review: 'not_required',
    implementation_review: 'not_required',
    qa_review: 'not_required',
    ship_review: 'not_required',
    ...(over ?? {}),
  }) as Record<ForgeGateType, ForgeGateStatus>

describe('reconcileSpecAndForge', () => {
  it('aligned when no forge context is present', () => {
    expect(reconcileSpecAndForge({ spec: baseSpec })).toEqual({
      aligned: true,
      reason: 'no-forge-context',
    })
  })

  it('aligned when spec verified and all required gates passed', () => {
    const result = reconcileSpecAndForge({
      spec: baseSpec,
      forge: { phase: 'ship', gates: gates({ qa_review: 'passed', ship_review: 'passed' }) },
    })
    expect(result.aligned).toBe(true)
  })

  it('misaligned when spec verified but qa_review still pending', () => {
    const result = reconcileSpecAndForge({
      spec: baseSpec,
      forge: { phase: 'qa', gates: gates({ qa_review: 'pending' }) },
    })
    expect(result.aligned).toBe(false)
    expect(result.reason).toBe('gate-not-passed')
    expect(result.gate).toBe('qa_review')
  })

  it('misaligned when spec failed but gates are passed', () => {
    const failed: FormalSpecification = { ...baseSpec, status: 'failed' as SpecStatus }
    const result = reconcileSpecAndForge({
      spec: failed,
      forge: { phase: 'ship', gates: gates({ ship_review: 'passed' }) },
    })
    expect(result.aligned).toBe(false)
    expect(result.reason).toBe('spec-not-verified')
  })

  it('misaligned when shipping but spec drifted', () => {
    const drifted: FormalSpecification = { ...baseSpec, status: 'drifted' }
    const result = reconcileSpecAndForge({
      spec: drifted,
      forge: { phase: 'ship', gates: gates({ ship_review: 'passed' }) },
    })
    expect(result.aligned).toBe(false)
    expect(result.reason).toBe('spec-not-verified')
  })
})
