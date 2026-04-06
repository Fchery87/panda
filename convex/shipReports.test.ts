import { describe, expect, it } from 'bun:test'
import { createShipReportRecord } from './shipReports'

describe('shipReports helpers', () => {
  it('creates a ship readiness report for a completed delivery state', () => {
    const report = createShipReportRecord({
      deliveryStateId: 'delivery_state_1' as never,
      decision: 'ready',
      summary: 'The delivery state is ready to ship.',
      evidenceSummary: 'Review and QA passed.',
      now: 100,
    })

    expect(report.decision).toBe('ready')
    expect(report.summary).toContain('ready to ship')
    expect(report.evidenceSummary).toContain('Review and QA passed')
  })
})
