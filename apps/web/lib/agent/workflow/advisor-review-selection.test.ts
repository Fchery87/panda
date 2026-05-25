import { describe, expect, test } from 'bun:test'
import { selectAdvisorReviewForTarget } from './advisor-review-selection'

const approved = { status: 'approved' as const, summary: 'ok', risks: [] }

describe('advisor review selection', () => {
  test('prefers exact artifact match over latest review', () => {
    const review = selectAdvisorReviewForTarget(
      [
        { ...approved, artifactId: 'artifact_old', createdAt: 30 },
        { ...approved, artifactId: 'artifact_target', createdAt: 10 },
      ],
      { artifactId: 'artifact_target' }
    )
    expect(review?.artifactId).toBe('artifact_target')
  })

  test('falls back through run and gate matching before latest', () => {
    expect(
      selectAdvisorReviewForTarget(
        [
          { ...approved, gates: ['dependency_change'], createdAt: 1 },
          { ...approved, gates: ['destructive_command'], createdAt: 2 },
        ],
        { gates: ['dependency_change'] }
      )?.gates
    ).toEqual(['dependency_change'])

    expect(
      selectAdvisorReviewForTarget(
        [
          { ...approved, runId: 'run_1', createdAt: 1 },
          { ...approved, createdAt: 2 },
        ],
        { runId: 'run_1' }
      )?.runId
    ).toBe('run_1')
  })

  test('uses latest review as final fallback', () => {
    expect(
      selectAdvisorReviewForTarget(
        [
          { ...approved, summary: 'old', createdAt: 1 },
          { ...approved, summary: 'new', createdAt: 2 },
        ],
        {}
      )?.summary
    ).toBe('new')
  })
})
