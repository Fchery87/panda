import { describe, expect, test } from 'bun:test'
import type { Id } from '@convex/_generated/dataModel'
import { buildSuccessfulRunClosurePlan } from './orchestrator'

describe('delivery orchestrator plan builder', () => {
  test('produces a centralized closure plan for review, QA, and ship using executive-derived decisions', () => {
    const plan = buildSuccessfulRunClosurePlan({
      taskId: 'task_1' as Id<'deliveryTasks'>,
      deliveryStateId: 'delivery_state_1' as Id<'deliveryStates'>,
      taskTitle: 'Implement delivery orchestrator',
      runId: 'run_1' as Id<'agentRuns'>,
      projectPath: '/projects/example',
    })

    expect(plan.createReviewReport.type).toBe('implementation')
    expect(plan.createQaReport.decision).toBe('pass')
    expect(plan.createReviewReport.decision).toBe('pass')
    expect(plan.createQaReport.evidence.urlsTested).toEqual(['/projects/example'])
    expect(plan.shipReport.decision).toBe('ready')
  })
})
