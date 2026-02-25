import { describe, expect, test } from 'bun:test'
import {
  buildEvalScorecard,
  containsTextScorer,
  exactMatchScorer,
  normalizedTextExactScorer,
  regexTextScorer,
  runEvalSuite,
  type EvalScenario,
} from './evals'

describe('harness evals', () => {
  test('runs eval scenarios and builds an aggregate scorecard', async () => {
    const scenarios: EvalScenario<string, string>[] = [
      {
        id: 'case-1',
        name: 'exact match',
        input: 'hello',
        expected: 'HELLO',
        tags: ['smoke', 'transform'],
      },
      {
        id: 'case-2',
        name: 'mismatch',
        input: 'world',
        expected: 'WORLD!',
        tags: ['smoke'],
      },
    ]

    const report = await runEvalSuite({
      suiteId: 'suite-smoke',
      scenarios,
      runner: async (scenario) => ({ output: scenario.input.toUpperCase() }),
      scorer: exactMatchScorer(),
    })

    expect(report.suiteId).toBe('suite-smoke')
    expect(report.results).toHaveLength(2)
    expect(report.results[0]?.status).toBe('passed')
    expect(report.results[0]?.score).toBe(1)
    expect(report.results[1]?.status).toBe('failed')
    expect(report.results[1]?.score).toBe(0)

    const scorecard = buildEvalScorecard(report)
    expect(scorecard.total).toBe(2)
    expect(scorecard.passed).toBe(1)
    expect(scorecard.failed).toBe(1)
    expect(scorecard.errored).toBe(0)
    expect(scorecard.passRate).toBe(0.5)
    expect(scorecard.averageScore).toBe(0.5)
    expect(scorecard.byTag.smoke?.total).toBe(2)
    expect(scorecard.byTag.transform?.passed).toBe(1)
  })

  test('marks runner exceptions and timeouts as errored results', async () => {
    const scenarios: EvalScenario<string, string>[] = [
      {
        id: 'timeout',
        name: 'times out',
        input: 'slow',
        expected: 'SLOW',
        timeoutMs: 1,
      },
      {
        id: 'throws',
        name: 'throws',
        input: 'boom',
        expected: 'BOOM',
      },
    ]

    const report = await runEvalSuite({
      suiteId: 'suite-errors',
      scenarios,
      runner: async (scenario) => {
        if (scenario.id === 'timeout') {
          await new Promise((resolve) => setTimeout(resolve, 10))
          return { output: 'SLOW' }
        }
        throw new Error('runner failed')
      },
      scorer: exactMatchScorer(),
    })

    expect(report.results.map((r) => r.status)).toEqual(['error', 'error'])
    expect(report.results[0]?.error?.toLowerCase()).toContain('timeout')
    expect(report.results[1]?.error).toContain('runner failed')

    const scorecard = buildEvalScorecard(report)
    expect(scorecard.errored).toBe(2)
    expect(scorecard.averageScore).toBe(0)
  })

  test('supports contains, regex, and normalized text scorers', async () => {
    const scenario: EvalScenario<string, string> = {
      id: 's1',
      name: 'contains',
      input: 'x',
      expected: 'panda',
    }
    const contains = containsTextScorer()(scenario, { output: 'hello panda workspace' })
    expect(contains.passed).toBe(true)

    const regex = regexTextScorer()(
      { ...scenario, expected: 'panda\\s+workspace' },
      { output: 'hello PANDA   workspace' }
    )
    expect(regex.passed).toBe(true)

    const normalized = normalizedTextExactScorer()(
      { ...scenario, expected: 'Hello   Panda' },
      { output: ' hello panda ' }
    )
    expect(normalized.passed).toBe(true)
  })
})
