import { describe, expect, test } from 'bun:test'
import { buildAdvisorReview, inferAdvisorReviewStatus, isValidAdvisorReview } from './advisor-review-builder'

describe('advisor review builder', () => {
  test('approves when no risks are present', () => {
    const review = buildAdvisorReview({ gates: ['dependency_change'] })
    expect(review.status).toBe('approved')
    expect(isValidAdvisorReview(review)).toBe(true)
  })

  test('infers needs_changes and blocked from risk severity', () => {
    expect(
      inferAdvisorReviewStatus([
        { severity: 'medium', finding: 'No rollback note.', recommendation: 'Add rollback plan.' },
      ])
    ).toBe('needs_changes')
    expect(
      inferAdvisorReviewStatus([
        { severity: 'high', finding: 'Deletes data.', recommendation: 'Require manual approval.' },
      ])
    ).toBe('blocked')
  })

  test('rejects malformed reviews', () => {
    expect(isValidAdvisorReview({ status: 'approved', summary: '', risks: [] })).toBe(false)
    expect(isValidAdvisorReview({ status: 'ok', summary: 'x', risks: [] })).toBe(false)
  })
})
