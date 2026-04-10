import { describe, expect, it, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'
import { createReviewReportRecord } from './reviewReports'

describe('review artifact helpers', () => {
  it('creates review reports with structured checklist artifacts and verification evidence', () => {
    const report = createReviewReportRecord({
      deliveryStateId: 'delivery_state_1' as never,
      taskId: 'task_1' as never,
      type: 'implementation',
      decision: 'concerns',
      summary: 'Implementation evidence is incomplete.',
      checklistResults: [
        {
          item: 'Regression coverage executed',
          status: 'failed',
          detail: 'No targeted test run recorded for the touched route.',
        },
      ],
      requiredActionItems: ['Run targeted route verification and attach artifacts'],
      verificationEvidence: [
        {
          kind: 'qa_report',
          label: 'Playwright verification run',
          ref: 'qa_report_1',
        },
      ],
      findings: [
        {
          severity: 'medium',
          title: 'Missing verification evidence',
          detail: 'The review references concerns but does not yet cite passing verification.',
        },
      ],
      now: 100,
    })

    expect(report.checklistResults).toHaveLength(1)
    expect(report.checklistResults[0]?.item).toBe('Regression coverage executed')
    expect(report.requiredActionItems).toEqual([
      'Run targeted route verification and attach artifacts',
    ])
    expect(report.verificationEvidence).toEqual([
      {
        kind: 'qa_report',
        label: 'Playwright verification run',
        ref: 'qa_report_1',
      },
    ])
  })

  test('forge mutation surface accepts structured review artifacts', () => {
    const forgeSource = fs.readFileSync(path.resolve(import.meta.dir, 'forge.ts'), 'utf8')

    expect(forgeSource).toContain('checklistResults: v.optional(v.array(ReviewChecklistResult))')
    expect(forgeSource).toContain('requiredActionItems: v.optional(v.array(v.string()))')
    expect(forgeSource).toContain(
      'verificationEvidence: v.optional(v.array(VerificationEvidenceRef))'
    )
    expect(forgeSource).toContain('checklistResults: args.checklistResults')
    expect(forgeSource).toContain('requiredActionItems: args.requiredActionItems')
    expect(forgeSource).toContain('verificationEvidence: args.verificationEvidence')
  })
})
