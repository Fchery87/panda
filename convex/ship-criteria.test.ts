import { describe, expect, it, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'
import { createShipReportRecord } from './shipReports'

describe('ship criteria helpers', () => {
  it('creates ship reports with explicit criteria outcomes tied to verification evidence', () => {
    const report = createShipReportRecord({
      deliveryStateId: 'delivery_state_1' as never,
      decision: 'ready_with_risk',
      summary: 'Ready to ship with one acknowledged risk.',
      evidenceSummary: 'Review and QA artifacts confirm the release path.',
      criteriaResults: [
        {
          criterion: 'Implementation review approved with evidence',
          status: 'passed',
          evidenceRefs: ['review_report_1'],
        },
        {
          criterion: 'Targeted QA route verification completed',
          status: 'passed',
          evidenceRefs: ['qa_report_1', 'trace_1'],
        },
      ],
      now: 100,
    })

    expect(report.criteriaResults).toHaveLength(2)
    expect(report.criteriaResults[0]?.evidenceRefs).toEqual(['review_report_1'])
    expect(report.criteriaResults[1]?.evidenceRefs).toEqual(['qa_report_1', 'trace_1'])
  })

  test('forge mutation surface requires structured ship criteria results', () => {
    const forgeSource = fs.readFileSync(path.resolve(import.meta.dir, 'forge.ts'), 'utf8')

    expect(forgeSource).toContain('criteriaResults: v.array(ShipCriterionResult)')
    expect(forgeSource).toContain('criteriaResults: args.criteriaResults')
  })
})
