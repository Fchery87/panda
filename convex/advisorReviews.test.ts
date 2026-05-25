import { describe, expect, test } from 'bun:test'
import { buildAdvisorReview } from '../apps/web/lib/agent/workflow/advisor-review-builder'

describe('advisor review convex contract', () => {
  test('builder output matches persisted review shape', () => {
    const review = buildAdvisorReview({
      gates: ['destructive_command'],
      risks: [{ severity: 'high', finding: 'Deletes workspace files.', recommendation: 'Use a scoped path.' }],
    })

    expect(review).toMatchObject({
      status: 'blocked',
      risks: [{ severity: 'high' }],
    })
  })
})
