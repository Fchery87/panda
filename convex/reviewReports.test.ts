import { describe, expect, it } from 'bun:test'
import { createReviewReportRecord, type ReviewDecision, type ReviewType } from './reviewReports'

describe('reviewReports helpers', () => {
  it('creates an implementation review report with executive ownership', () => {
    const type: ReviewType = 'implementation'
    const decision: ReviewDecision = 'pass'
    const report = createReviewReportRecord({
      deliveryStateId: 'delivery_state_1' as never,
      taskId: 'task_1' as never,
      type,
      decision,
      summary: 'Implementation is ready for QA.',
      findings: [],
      now: 100,
    })

    expect(report.type).toBe('implementation')
    expect(report.decision).toBe('pass')
    expect(report.reviewerRole).toBe('executive')
    expect(report.summary).toContain('ready for QA')
  })
})
