import { describe, expect, test } from 'bun:test'
import {
  buildQAPanelViewModel,
  buildStatePanelViewModel,
  buildTaskPanelViewModel,
} from './view-models'

describe('delivery view-model helpers', () => {
  test('builds the task panel view-model from task and review data', () => {
    const task = buildTaskPanelViewModel({
      activeDeliveryTask: {
        title: 'Implement panel view models',
        description: 'Extract page panel object assembly into pure helpers.',
        rationale: 'Keep the page focused on wiring instead of ad hoc object shaping.',
        status: 'in_review',
        ownerRole: 'manager',
        acceptanceCriteria: [{ id: '1', text: 'Task panel uses helper output', status: 'pending' }],
        filesInScope: ['apps/web/app/(dashboard)/projects/[projectId]/page.tsx'],
        blockers: [],
        evidence: [{ label: 'Agent run run_1' }],
      },
      activeTaskReview: {
        type: 'implementation',
        decision: 'pass',
        summary: 'Review passed.',
      },
    })

    expect(task?.title).toBe('Implement panel view models')
    expect(task?.latestReview?.decision).toBe('pass')
  })

  test('builds the QA panel view-model directly from the latest QA report', () => {
    const report = buildQAPanelViewModel({
      activeTaskQaReport: {
        decision: 'concerns',
        summary: 'Browser issues detected.',
        assertions: [{ label: 'Task panel rendered', status: 'passed' }],
        evidence: {
          urlsTested: ['/projects/example'],
          flowNames: ['task-panel-review-loop'],
          consoleErrors: ['ReferenceError'],
          networkFailures: [],
        },
        defects: [{ severity: 'medium', title: 'Console', detail: 'ReferenceError' }],
      },
    })

    expect(report?.decision).toBe('concerns')
    expect(report?.evidence.urlsTested).toEqual(['/projects/example'])
  })

  test('builds the state panel view-model from delivery state, tasks, and ship report', () => {
    const state = buildStatePanelViewModel({
      activeDeliveryState: {
        currentPhase: 'qa',
        openRiskCount: 2,
        reviewGateStatus: 'passed',
        qaGateStatus: 'pending',
      },
      deliveryTasks: [{ status: 'in_progress' }, { status: 'done' }, { status: 'rejected' }],
      latestShipReport: {
        summary: 'Ship after QA follow-up.',
      },
    })

    expect(state).toEqual({
      currentPhase: 'qa',
      openTaskCount: 1,
      unresolvedRiskCount: 2,
      reviewGateStatus: 'passed',
      qaGateStatus: 'pending',
      shipSummary: 'Ship after QA follow-up.',
    })
  })
})
