import { describe, expect, test } from 'bun:test'
import type {
  DeliveryPhase,
  DeliveryRole,
  DeliveryTaskStatus,
  GateStatus,
  ReviewDecision,
  ReviewType,
} from './types'

describe('delivery types', () => {
  test('exports canonical delivery unions', () => {
    const phase: DeliveryPhase = 'ship'
    const role: DeliveryRole = 'manager'
    const taskStatus: DeliveryTaskStatus = 'qa_pending'
    const gate: GateStatus = 'passed'
    const reviewType: ReviewType = 'implementation'
    const reviewDecision: ReviewDecision = 'pass'

    expect(phase).toBe('ship')
    expect(role).toBe('manager')
    expect(taskStatus).toBe('qa_pending')
    expect(gate).toBe('passed')
    expect(reviewType).toBe('implementation')
    expect(reviewDecision).toBe('pass')
  })
})
