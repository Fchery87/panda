import { describe, expect, it } from 'bun:test'
import { createQaReportRecord } from './qaReports'

describe('qaReports helpers', () => {
  it('creates a QA report with route evidence and assertion results', () => {
    const report = createQaReportRecord({
      deliveryStateId: 'delivery_state_1' as never,
      taskId: 'task_1' as never,
      decision: 'pass',
      summary: 'QA passed on the affected workbench route.',
      assertions: [
        { label: 'Task panel rendered', status: 'passed' },
        { label: 'Latest review summary visible', status: 'passed' },
      ],
      evidence: {
        urlsTested: ['/projects/example'],
        flowNames: ['task-panel-review-loop'],
        consoleErrors: [],
        networkFailures: [],
      },
      now: 100,
    })

    expect(report.decision).toBe('pass')
    expect(report.summary).toContain('QA passed')
    expect(report.evidence.urlsTested).toContain('/projects/example')
    expect(report.assertions).toHaveLength(2)
  })
})
