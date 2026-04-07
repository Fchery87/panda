import { describe, expect, test } from 'bun:test'
import { buildForgeActivityTimeline } from './activity'

describe('forge activity timeline', () => {
  test('merges and sorts decisions, reviews, QA, and ship events newest first', () => {
    const timeline = buildForgeActivityTimeline({
      decisions: [
        {
          _id: 'decision_1',
          summary: 'Adopt Convex as canonical state.',
          createdByRole: 'executive',
          createdAt: 10,
        },
      ],
      reviews: [
        {
          _id: 'review_1',
          summary: 'Implementation review passed.',
          reviewerRole: 'executive',
          createdAt: 20,
        },
      ],
      qaReports: [
        {
          _id: 'qa_1',
          summary: 'QA passed on the project route.',
          createdAt: 30,
        },
      ],
      shipReports: [
        {
          _id: 'ship_1',
          summary: 'Ready to ship.',
          createdAt: 40,
        },
      ],
    })

    expect(timeline.map((entry) => entry.kind)).toEqual(['ship', 'qa', 'review', 'decision'])
    expect(timeline[0]?.summary).toBe('Ready to ship.')
    expect(timeline[3]?.role).toBe('executive')
  })
})
