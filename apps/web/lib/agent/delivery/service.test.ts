import { describe, expect, test } from 'bun:test'
import type { Id } from '@convex/_generated/dataModel'
import { buildDeliveryClosureServicePlan } from './service'

describe('delivery closure service', () => {
  test('builds the closure operations for evidence, review, QA, lifecycle updates, and ship', () => {
    const plan = buildDeliveryClosureServicePlan({
      taskId: 'task_1' as Id<'deliveryTasks'>,
      deliveryStateId: 'delivery_state_1' as Id<'deliveryStates'>,
      taskTitle: 'Implement delivery service',
      runId: 'run_1' as Id<'agentRuns'>,
      projectId: 'project_1',
      chatId: 'chat_1',
      projectPath: '/projects/project_1',
      latestQaFingerprint: null,
    })

    expect(plan.createReviewReport.type).toBe('implementation')
    expect(plan.createQaReport.decision).toBe('pass')
    expect(plan.createQaReport.evidence.flowNames).toEqual(['task-panel-review-loop'])
    expect(plan.shouldRunBrowserQa).toBe(true)
    expect(plan.shipReport.summary).toContain('ready to ship')
  })

  test('skips fresh browser QA when the fingerprint matches the latest QA artifacts', () => {
    const plan = buildDeliveryClosureServicePlan({
      taskId: 'task_1' as Id<'deliveryTasks'>,
      deliveryStateId: 'delivery_state_1' as Id<'deliveryStates'>,
      taskTitle: 'Implement delivery service',
      runId: 'run_1' as Id<'agentRuns'>,
      projectId: 'project_1',
      chatId: 'chat_1',
      projectPath: '/projects/project_1',
      latestQaFingerprint: 'task_1::run_1::task-panel-review-loop::/projects/project_1',
    })

    expect(plan.shouldRunBrowserQa).toBe(false)
  })
})
