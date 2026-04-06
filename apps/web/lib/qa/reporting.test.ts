import { describe, expect, test } from 'bun:test'
import { buildQaSummary } from './reporting'

describe('QA reporting helpers', () => {
  test('builds a concise QA summary from normalized assertions and evidence', () => {
    const summary = buildQaSummary({
      decision: 'pass',
      assertions: [
        { label: 'Task panel rendered', status: 'passed' },
        { label: 'Latest review summary visible', status: 'passed' },
      ],
      evidence: {
        urlsTested: ['/projects/example'],
        flowNames: ['task-panel-review-loop'],
      },
    })

    expect(summary).toContain('QA passed')
    expect(summary).toContain('/projects/example')
  })
})
