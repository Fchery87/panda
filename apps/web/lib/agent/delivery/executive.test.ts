import { describe, expect, test } from 'bun:test'
import {
  buildExecutiveSummary,
  deriveImplementationReviewDecision,
  deriveShipDecision,
} from './executive'

describe('delivery executive helpers', () => {
  test('derives a passing implementation review decision from successful execution', () => {
    expect(deriveImplementationReviewDecision({ outcome: 'completed' })).toBe('pass')
    expect(deriveImplementationReviewDecision({ outcome: 'failed' })).toBe('concerns')
  })

  test('derives ship readiness from QA decisions', () => {
    expect(deriveShipDecision({ qaDecision: 'pass' })).toBe('ready')
    expect(deriveShipDecision({ qaDecision: 'concerns' })).toBe('ready_with_risk')
    expect(deriveShipDecision({ qaDecision: 'fail' })).toBe('not_ready')
  })

  test('builds concise executive summaries', () => {
    expect(
      buildExecutiveSummary({
        taskTitle: 'Implement delivery closure',
        qaDecision: 'pass',
      })
    ).toContain('ready to ship')
  })
})
