import type { Doc } from '../_generated/dataModel'
import { describe, expect, test } from 'bun:test'
import {
  assertForgePhaseTransition,
  assertForgeQaGate,
  assertForgeReviewGate,
  assertForgeShipGate,
  assertForgeTaskTransition,
} from './forge_gatekeeper'

function buildTask(
  overrides: Partial<{
    status: Doc<'deliveryTasks'>['status']
    evidence: Doc<'deliveryTasks'>['evidence']
    latestReview: {
      type: Doc<'reviewReports'>['type']
      decision: Doc<'reviewReports'>['decision']
    } | null
    latestQa: { decision: Doc<'qaReports'>['decision'] } | null
  }> = {}
) {
  return {
    status: 'in_progress' as Doc<'deliveryTasks'>['status'],
    evidence: [] as Doc<'deliveryTasks'>['evidence'],
    latestReview: null,
    latestQa: null,
    ...overrides,
  }
}

describe('forge gatekeeper', () => {
  test('rejects invalid task transitions centrally', () => {
    expect(() => assertForgeTaskTransition({ from: 'draft', to: 'done' })).toThrow(
      /invalid forge task transition/i
    )
  })

  test('rejects invalid phase transitions centrally', () => {
    expect(() => assertForgePhaseTransition({ from: 'plan', to: 'ship' })).toThrow(
      /invalid forge phase transition/i
    )
  })

  test('blocks in_review without worker evidence and verification refs', () => {
    expect(() =>
      assertForgeReviewGate({
        task: buildTask(),
        verificationRefs: [],
      })
    ).toThrow(/worker evidence and verification refs/i)
  })

  test('blocks qa_pending without implementation review', () => {
    expect(() =>
      assertForgeQaGate({
        task: buildTask({
          status: 'in_review',
          evidence: [{ type: 'external', label: 'Worker summary' }],
        }),
        reviewType: 'architecture',
      })
    ).toThrow(/implementation review/i)
  })

  test('blocks done without qa pass or explicit waiver', () => {
    expect(() =>
      assertForgeQaGate({
        task: buildTask({
          status: 'qa_pending',
          latestReview: {
            type: 'implementation',
            decision: 'pass',
          },
          latestQa: {
            decision: 'concerns',
          },
        }),
        nextStatus: 'done',
      })
    ).toThrow(/qa pass or explicit waiver/i)
  })

  test('blocks ship decisions when gate state is not satisfied', () => {
    expect(() =>
      assertForgeShipGate({
        shipGateStatus: 'pending',
        qaGateStatus: 'pending',
        decision: 'ready',
      })
    ).toThrow(/ship gate/i)
  })
})
