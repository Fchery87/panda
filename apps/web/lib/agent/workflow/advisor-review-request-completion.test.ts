import { describe, expect, test } from 'bun:test'
import {
  buildAdvisorReviewRequestCompletion,
  isBlockingAdvisorCompletion,
} from './advisor-review-request-completion'

describe('advisor review request completion', () => {
  test('builds a completion draft from reviewer output', () => {
    const draft = buildAdvisorReviewRequestCompletion({
      requestId: 'request_1',
      reviewerOutput: '{"status":"approved","summary":"Safe.","risks":[]}',
    })

    expect(draft).toEqual({
      requestId: 'request_1',
      reviewer: 'advisor-reviewer',
      review: { status: 'approved', summary: 'Safe.', risks: [] },
    })
    expect(isBlockingAdvisorCompletion(draft)).toBe(false)
  })

  test('treats malformed reviewer output as blocking', () => {
    const draft = buildAdvisorReviewRequestCompletion({
      requestId: 'request_1',
      reviewerOutput: 'not json',
    })

    expect(draft.review.status).toBe('needs_changes')
    expect(isBlockingAdvisorCompletion(draft)).toBe(true)
  })
})
