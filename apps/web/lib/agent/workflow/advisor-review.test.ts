import { describe, expect, test } from 'bun:test'
import { advisorReviewRunEvent, enforceAdvisorReview } from './advisor-review'

describe('advisor review enforcement', () => {
  test('blocks when advisor review is required but missing', () => {
    const result = enforceAdvisorReview({ required: true, gates: ['dependency_change'] })
    expect(result.canContinue).toBe(false)
    expect(result.status).toBe('blocked')
    expect(advisorReviewRunEvent(result)).toMatchObject({
      type: 'advisor_review',
      status: 'blocked',
    })
  })

  test('allows continuation when advisor approves', () => {
    const result = enforceAdvisorReview({
      required: true,
      gates: ['dependency_change'],
      review: { status: 'approved', summary: 'Looks safe.', risks: [] },
    })
    expect(result.canContinue).toBe(true)
    expect(result.status).toBe('approved')
  })

  test('blocks needs_changes and blocked reviews', () => {
    const result = enforceAdvisorReview({
      required: true,
      gates: ['large_diff'],
      review: { status: 'needs_changes', summary: 'Narrow the diff.', risks: [] },
    })
    expect(result.canContinue).toBe(false)
    expect(result.status).toBe('needs_changes')
  })
})
