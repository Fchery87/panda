import { describe, expect, test } from 'bun:test'
import {
  canTransitionDeliveryPhase,
  canTransitionTask,
  DELIVERY_PHASE_TRANSITIONS,
  DELIVERY_TASK_TRANSITIONS,
} from './status-machine'

describe('delivery status machine', () => {
  test('allows documented task transitions', () => {
    expect(canTransitionTask('draft', 'planned')).toBe(true)
    expect(canTransitionTask('planned', 'ready')).toBe(true)
    expect(canTransitionTask('ready', 'in_progress')).toBe(true)
    expect(canTransitionTask('in_progress', 'blocked')).toBe(true)
    expect(canTransitionTask('in_progress', 'in_review')).toBe(true)
    expect(canTransitionTask('in_review', 'qa_pending')).toBe(true)
    expect(canTransitionTask('qa_pending', 'done')).toBe(true)
    expect(canTransitionTask('rejected', 'ready')).toBe(true)
  })

  test('rejects undocumented task transitions', () => {
    expect(canTransitionTask('ready', 'done')).toBe(false)
    expect(canTransitionTask('draft', 'qa_pending')).toBe(false)
    expect(canTransitionTask('done', 'in_progress')).toBe(false)
    expect(canTransitionTask('blocked', 'done')).toBe(false)
  })

  test('allows documented delivery phase transitions', () => {
    expect(canTransitionDeliveryPhase('intake', 'plan')).toBe(true)
    expect(canTransitionDeliveryPhase('plan', 'execute')).toBe(true)
    expect(canTransitionDeliveryPhase('execute', 'review')).toBe(true)
    expect(canTransitionDeliveryPhase('review', 'qa')).toBe(true)
    expect(canTransitionDeliveryPhase('qa', 'ship')).toBe(true)
    expect(canTransitionDeliveryPhase('ship', 'execute')).toBe(true)
  })

  test('rejects undocumented delivery phase transitions', () => {
    expect(canTransitionDeliveryPhase('intake', 'execute')).toBe(false)
    expect(canTransitionDeliveryPhase('plan', 'qa')).toBe(false)
    expect(canTransitionDeliveryPhase('ship', 'plan')).toBe(false)
  })

  test('exports explicit transition maps for server-side enforcement', () => {
    expect(DELIVERY_TASK_TRANSITIONS.in_review).toContain('qa_pending')
    expect(DELIVERY_PHASE_TRANSITIONS.ship).toContain('execute')
  })
})
