export interface EvalScenario<TInput = unknown, TExpected = unknown> {
  id: string
  name: string
  input: TInput
  expected?: TExpected
  tags?: string[]
  timeoutMs?: number
  metadata?: Record<string, unknown>
}

export interface EvalRunnerOutput<TOutput = unknown> {
  output: TOutput
  metadata?: Record<string, unknown>
}

export interface EvalScore {
  passed: boolean
  score: number
  reason?: string
}

export interface EvalResult<TInput = unknown, TOutput = unknown, TExpected = unknown> {
  scenarioId: string
  scenarioName: string
  status: 'passed' | 'failed' | 'error'
  input: TInput
  expected?: TExpected
  output?: TOutput
  score: number
  reason?: string
  error?: string
  tags: string[]
  durationMs: number
  metadata?: Record<string, unknown>
}

export interface EvalReport<TInput = unknown, TOutput = unknown, TExpected = unknown> {
  suiteId: string
  startedAt: number
  completedAt: number
  durationMs: number
  results: Array<EvalResult<TInput, TOutput, TExpected>>
}

export interface EvalTagScorecard {
  total: number
  passed: number
  failed: number
  errored: number
  averageScore: number
}

export interface EvalScorecard {
  suiteId: string
  total: number
  passed: number
  failed: number
  errored: number
  passRate: number
  averageScore: number
  averageDurationMs: number
  byTag: Record<string, EvalTagScorecard>
}

export interface RunEvalSuiteOptions<TInput = unknown, TOutput = unknown, TExpected = unknown> {
  suiteId: string
  scenarios: Array<EvalScenario<TInput, TExpected>>
  runner: (
    scenario: EvalScenario<TInput, TExpected>
  ) => Promise<EvalRunnerOutput<TOutput>> | EvalRunnerOutput<TOutput>
  scorer: (
    scenario: EvalScenario<TInput, TExpected>,
    output: EvalRunnerOutput<TOutput>
  ) => Promise<EvalScore> | EvalScore
}

export function exactMatchScorer<TInput = unknown, TExpected = unknown, TOutput = TExpected>() {
  return (
    scenario: EvalScenario<TInput, TExpected>,
    output: EvalRunnerOutput<TOutput>
  ): EvalScore => {
    const passed = Object.is(output.output, scenario.expected)
    return {
      passed,
      score: passed ? 1 : 0,
      reason: passed ? 'exact-match' : 'exact-match-failed',
    }
  }
}

export function containsTextScorer<TInput = unknown>() {
  return (scenario: EvalScenario<TInput, string>, output: EvalRunnerOutput<unknown>): EvalScore => {
    const expected = typeof scenario.expected === 'string' ? scenario.expected : ''
    const actual = typeof output.output === 'string' ? output.output : JSON.stringify(output.output)
    const passed = expected.length > 0 && actual.includes(expected)
    return {
      passed,
      score: passed ? 1 : 0,
      reason: passed ? 'contains-match' : 'contains-miss',
    }
  }
}

export function regexTextScorer<TInput = unknown>(flags = 'i') {
  return (scenario: EvalScenario<TInput, string>, output: EvalRunnerOutput<unknown>): EvalScore => {
    const pattern = typeof scenario.expected === 'string' ? scenario.expected : ''
    if (!pattern) return { passed: false, score: 0, reason: 'regex-pattern-missing' }
    try {
      const regex = new RegExp(pattern, flags)
      const actual =
        typeof output.output === 'string' ? output.output : JSON.stringify(output.output, null, 2)
      const passed = regex.test(actual)
      return {
        passed,
        score: passed ? 1 : 0,
        reason: passed ? 'regex-match' : 'regex-miss',
      }
    } catch (error) {
      return {
        passed: false,
        score: 0,
        reason: error instanceof Error ? `regex-invalid:${error.message}` : 'regex-invalid',
      }
    }
  }
}

export function normalizedTextExactScorer<TInput = unknown>() {
  return (scenario: EvalScenario<TInput, string>, output: EvalRunnerOutput<unknown>): EvalScore => {
    const normalize = (value: unknown) =>
      String(typeof value === 'string' ? value : JSON.stringify(value))
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase()

    const expected = normalize(scenario.expected ?? '')
    const actual = normalize(output.output)
    const passed = expected.length > 0 && expected === actual
    return {
      passed,
      score: passed ? 1 : 0,
      reason: passed ? 'normalized-exact-match' : 'normalized-exact-miss',
    }
  }
}

export async function runEvalSuite<TInput = unknown, TOutput = unknown, TExpected = unknown>(
  options: RunEvalSuiteOptions<TInput, TOutput, TExpected>
): Promise<EvalReport<TInput, TOutput, TExpected>> {
  const startedAt = Date.now()
  const results: Array<EvalResult<TInput, TOutput, TExpected>> = []

  for (const scenario of options.scenarios) {
    const caseStartedAt = Date.now()
    try {
      const runnerPromise = Promise.resolve(options.runner(scenario))
      const runnerOutput = await raceWithTimeout(runnerPromise, scenario.timeoutMs)

      if (runnerOutput.timedOut) {
        results.push({
          scenarioId: scenario.id,
          scenarioName: scenario.name,
          status: 'error',
          input: scenario.input,
          expected: scenario.expected,
          score: 0,
          error: `Scenario timeout after ${scenario.timeoutMs}ms`,
          tags: scenario.tags ?? [],
          durationMs: Date.now() - caseStartedAt,
          metadata: scenario.metadata,
        })
        continue
      }

      const score = await options.scorer(scenario, runnerOutput.value)
      results.push({
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        status: score.passed ? 'passed' : 'failed',
        input: scenario.input,
        expected: scenario.expected,
        output: runnerOutput.value.output,
        score: clamp01(score.score),
        reason: score.reason,
        tags: scenario.tags ?? [],
        durationMs: Date.now() - caseStartedAt,
        metadata: mergeMetadata(scenario.metadata, runnerOutput.value.metadata),
      })
    } catch (error) {
      results.push({
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        status: 'error',
        input: scenario.input,
        expected: scenario.expected,
        score: 0,
        error: error instanceof Error ? error.message : 'Eval runner failed',
        tags: scenario.tags ?? [],
        durationMs: Date.now() - caseStartedAt,
        metadata: scenario.metadata,
      })
    }
  }

  const completedAt = Date.now()
  return {
    suiteId: options.suiteId,
    startedAt,
    completedAt,
    durationMs: completedAt - startedAt,
    results,
  }
}

export function buildEvalScorecard<TInput = unknown, TOutput = unknown, TExpected = unknown>(
  report: EvalReport<TInput, TOutput, TExpected>
): EvalScorecard {
  const total = report.results.length
  const passed = report.results.filter((result) => result.status === 'passed').length
  const failed = report.results.filter((result) => result.status === 'failed').length
  const errored = report.results.filter((result) => result.status === 'error').length
  const averageScore =
    total === 0 ? 0 : report.results.reduce((sum, result) => sum + result.score, 0) / total
  const averageDurationMs =
    total === 0 ? 0 : report.results.reduce((sum, result) => sum + result.durationMs, 0) / total

  const byTag: Record<string, EvalTagScorecard> = {}
  for (const result of report.results) {
    for (const tag of result.tags) {
      const entry = byTag[tag] ?? {
        total: 0,
        passed: 0,
        failed: 0,
        errored: 0,
        averageScore: 0,
      }
      entry.total += 1
      if (result.status === 'passed') entry.passed += 1
      if (result.status === 'failed') entry.failed += 1
      if (result.status === 'error') entry.errored += 1
      entry.averageScore += result.score
      byTag[tag] = entry
    }
  }

  for (const entry of Object.values(byTag)) {
    entry.averageScore = entry.total === 0 ? 0 : entry.averageScore / entry.total
  }

  return {
    suiteId: report.suiteId,
    total,
    passed,
    failed,
    errored,
    passRate: total === 0 ? 0 : passed / total,
    averageScore,
    averageDurationMs,
    byTag,
  }
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

function mergeMetadata(
  a?: Record<string, unknown>,
  b?: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (!a && !b) return undefined
  return { ...(a ?? {}), ...(b ?? {}) }
}

async function raceWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs?: number
): Promise<{ timedOut: false; value: T } | { timedOut: true }> {
  if (typeof timeoutMs !== 'number') {
    return { timedOut: false, value: await promise }
  }

  let timer: ReturnType<typeof setTimeout> | undefined
  const timeoutPromise = new Promise<{ timedOut: true }>((resolve) => {
    timer = setTimeout(() => resolve({ timedOut: true }), timeoutMs)
  })

  void promise.catch(() => undefined)

  try {
    return await Promise.race([
      promise.then((value) => ({ timedOut: false as const, value })),
      timeoutPromise,
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}
