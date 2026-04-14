import { describe, expect, it } from 'bun:test'
import type { FormalSpecification } from '../types'
import { reconcileSpecAndForge } from '../forge-reconciler'

/**
 * INVARIANT: For every run eligible to emit 'complete':
 *   spec.status ∈ {verified, archived}
 *   AND (no forge context present OR forge gate for current phase is passed/waived/not_required)
 *
 * This test enumerates representative (spec status × phase × gate) combinations
 * and asserts the reconciler's decision matches the invariant.
 */
describe('spec ↔ forge invariant', () => {
  const makeSpec = (status: FormalSpecification['status']): FormalSpecification => ({
    id: 's',
    version: 1,
    tier: 'explicit',
    status,
    intent: { goal: 'g', rawMessage: 'r', constraints: [], acceptanceCriteria: [] },
    plan: { steps: [], dependencies: [], risks: [], estimatedTools: [] },
    validation: { preConditions: [], postConditions: [], invariants: [] },
    provenance: { model: 'm', promptHash: 'h', timestamp: 0, chatId: 'c' },
    createdAt: 0,
    updatedAt: 0,
  })

  const statuses = ['draft', 'validated', 'approved', 'executing', 'verified', 'drifted', 'failed', 'archived'] as const
  const phases = ['intake', 'plan', 'execute', 'review', 'qa', 'ship'] as const
  const gateStates = ['not_required', 'pending', 'passed', 'failed', 'waived'] as const

  for (const status of statuses) {
    for (const phase of phases) {
      for (const gate of gateStates) {
        it(`status=${status} phase=${phase} gate=${gate}`, () => {
          const result = reconcileSpecAndForge({
            spec: makeSpec(status),
            forge: {
              phase,
              gates: {
                architecture_review: 'not_required',
                implementation_review: phase === 'review' ? gate : 'not_required',
                qa_review: phase === 'qa' ? gate : 'not_required',
                ship_review: phase === 'ship' ? gate : 'not_required',
              },
            },
          })

          const specOk = status === 'verified' || status === 'archived'
          const gateOk = gate === 'passed' || gate === 'waived' || gate === 'not_required'
          const phaseNeedsGate = phase === 'review' || phase === 'qa' || phase === 'ship'
          const expectedAligned = specOk && (!phaseNeedsGate || gateOk)

          expect(result.aligned).toBe(expectedAligned)
        })
      }
    }
  }
})
