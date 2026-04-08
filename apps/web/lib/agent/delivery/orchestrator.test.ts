import { describe, expect, test } from 'bun:test'

import { buildSuccessfulRunClosurePlan } from './orchestrator'

describe('buildSuccessfulRunClosurePlan', () => {
  test('does not precompute a ship decision before QA outcome is known', () => {
    const plan = buildSuccessfulRunClosurePlan({
      taskId: 'task-1' as never,
      deliveryStateId: 'delivery-state-1' as never,
      taskTitle: 'Implement QA guardrails',
      runId: 'run-1' as never,
      projectPath: '/projects/demo',
    })

    expect(plan.createReviewReport.decision).toBe('pass')
    expect(plan.createQaReport.decision).toBe('pass')
    expect('decision' in plan.shipReport).toBe(false)
    expect(plan.shipReport.summary).toContain('ready to ship')
  })
})
