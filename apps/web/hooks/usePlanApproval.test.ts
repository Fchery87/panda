import { describe, expect, test } from 'bun:test'

import { derivePlanApprovalState } from './usePlanApproval'

describe('derivePlanApprovalState', () => {
  test('idle when no plan and no spec', () => {
    const result = derivePlanApprovalState({
      planningSession: null,
      pendingSpec: null,
    })

    expect(result.status).toBe('idle')
  })

  test('awaiting_review when planningSession has a generated plan', () => {
    const result = derivePlanApprovalState({
      planningSession: {
        sessionId: 'a',
        status: 'ready_for_review',
        generatedPlan: { status: 'ready_for_review' } as never,
      } as never,
      pendingSpec: null,
    })

    expect(result.status).toBe('awaiting_review')
    expect(result.canApprove).toBe(true)
  })

  test('approved -> can build', () => {
    const result = derivePlanApprovalState({
      planningSession: {
        sessionId: 'a',
        status: 'accepted',
        generatedPlan: { status: 'accepted' } as never,
      } as never,
      pendingSpec: null,
    })

    expect(result.status).toBe('approved')
    expect(result.canBuild).toBe(true)
  })

  test('legacy pendingSpec is treated as awaiting_review', () => {
    const result = derivePlanApprovalState({
      planningSession: null,
      pendingSpec: { status: 'draft' } as never,
    })

    expect(result.status).toBe('awaiting_review')
  })
})
