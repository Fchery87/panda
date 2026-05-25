import { describe, expect, test } from 'bun:test'
import { executeAdvisorReviewRequest } from './advisor-review-execution'

describe('advisor review execution bridge', () => {
  test('starts reviewer run, runs advisor reviewer, parses output, and completes request', async () => {
    const completions: unknown[] = []
    const started: string[] = []
    const result = await executeAdvisorReviewRequest({
      request: { _id: 'request_1', prompt: 'Review risky action' },
      startReviewerRun: async (requestId) => {
        started.push(requestId)
      },
      runAdvisorReviewer: async (prompt) => {
        expect(prompt).toBe('Review risky action')
        return '{"status":"approved","summary":"Safe.","risks":[]}'
      },
      completeWithReview: async (input) => {
        completions.push(input)
      },
    })

    expect(result.review.status).toBe('approved')
    expect(started).toEqual(['request_1'])
    expect(completions).toEqual([
      {
        requestId: 'request_1',
        status: 'approved',
        summary: 'Safe.',
        risks: [],
        reviewer: 'advisor-reviewer',
      },
    ])
  })

  test('completes with conservative needs_changes when reviewer output is malformed', async () => {
    const completions: Array<{ status: string }> = []
    await executeAdvisorReviewRequest({
      request: { _id: 'request_1', prompt: 'Review risky action' },
      runAdvisorReviewer: async () => 'malformed',
      completeWithReview: async (input) => {
        completions.push({ status: input.status })
      },
    })

    expect(completions).toEqual([{ status: 'needs_changes' }])
  })
})
