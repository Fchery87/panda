import { describe, expect, test } from 'bun:test'
import fs from 'fs'
import path from 'path'

describe('advisor review requests convex contract', () => {
  test('defines request table and create mutation', () => {
    const schema = fs.readFileSync(path.resolve(import.meta.dir, 'schema.ts'), 'utf8')
    const source = fs.readFileSync(
      path.resolve(import.meta.dir, 'advisorReviewRequests.ts'),
      'utf8'
    )

    expect(schema).toContain('advisorReviewRequests: defineTable')
    expect(schema).toContain(
      "status: v.union(v.literal('pending'), v.literal('completed'), v.literal('cancelled'))"
    )
    expect(source).toContain('export const create = mutation')
    expect(schema).toContain('reviewerRunId')
    expect(source).toContain('export const startReviewerRun = mutation')
    expect(source).toContain("ctx.db.insert('agentRuns'")
    expect(source).toContain("subagentName: 'advisor-reviewer'")
    expect(source).toContain("type: 'advisor_review_started'")
    expect(source).toContain('export const completeWithReview = mutation')
    expect(source).toContain("ctx.db.insert('advisorReviews'")
    expect(source).toContain("type: 'advisor_review_completed'")
    expect(source).toContain("status: 'pending'")
    expect(source).toContain("status: 'completed'")
  })
})
