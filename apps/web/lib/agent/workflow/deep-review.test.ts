import { describe, expect, test } from 'bun:test'
import { getWorkflowChainTemplate } from './chains'
import { aggregateDeepReviewFindings, DEEP_REVIEW_LANES, isDeepReviewTemplate } from './deep-review'

describe('deep branch review workflow', () => {
  test('defines a parallel rubric review template on existing workflow chains', () => {
    const template = getWorkflowChainTemplate('deep-branch-review')

    expect(template).toBeDefined()
    expect(template && isDeepReviewTemplate(template)).toBe(true)
    expect(template?.steps.map((step) => step.reviewLane)).toEqual([...DEEP_REVIEW_LANES])
    expect(new Set(template?.steps.map((step) => step.parallelGroup))).toEqual(
      new Set(['deep-review'])
    )
    expect(template?.steps.every((step) => step.subagentType === 'advisor-reviewer')).toBe(true)
    expect(template?.steps.every((step) => step.isolationMode === 'snapshot')).toBe(true)
  })

  test('aggregates compact lane findings for advisor surfaces', () => {
    const aggregate = aggregateDeepReviewFindings([
      {
        lane: 'security',
        severity: 'warning',
        title: 'Token handling',
        summary: 'Provider token handling needs review.',
      },
      {
        lane: 'correctness',
        severity: 'error',
        title: 'Missing test',
        summary: 'A regression path is uncovered.',
        filePaths: ['apps/web/lib/example.ts'],
      },
    ])

    expect(aggregate.status).toBe('blocked')
    expect(aggregate.counts).toEqual({ info: 0, warning: 1, error: 1 })
    expect(aggregate.summary).toContain('Deep review blocked')
  })
})
