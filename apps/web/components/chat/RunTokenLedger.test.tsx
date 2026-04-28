import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { RunTokenLedger, aggregateTokenUsage } from './RunTokenLedger'
import type { PersistedRunEventSummaryInfo } from './types'

function makeEvent(usage?: Record<string, number>): PersistedRunEventSummaryInfo {
  return {
    type: 'tool',
    usage: usage
      ? {
          promptTokens: usage.promptTokens ?? 0,
          completionTokens: usage.completionTokens ?? 0,
          totalTokens: usage.totalTokens ?? 0,
          reasoningTokens: usage.reasoningTokens,
          cacheRead: usage.cacheRead,
          cacheWrite: usage.cacheWrite,
        }
      : undefined,
  }
}

describe('aggregateTokenUsage', () => {
  test('returns null for empty events', () => {
    expect(aggregateTokenUsage([])).toBeNull()
  })

  test('returns null for undefined events', () => {
    expect(aggregateTokenUsage(undefined)).toBeNull()
  })

  test('returns null when no events have usage', () => {
    expect(aggregateTokenUsage([makeEvent()])).toBeNull()
  })

  test('aggregates single event with usage', () => {
    const result = aggregateTokenUsage([
      makeEvent({ promptTokens: 100, completionTokens: 50, totalTokens: 150 }),
    ])
    expect(result).not.toBeNull()
    expect(result!.promptTokens).toBe(100)
    expect(result!.completionTokens).toBe(50)
    expect(result!.totalTokens).toBe(150)
  })

  test('sums across multiple events', () => {
    const result = aggregateTokenUsage([
      makeEvent({ promptTokens: 100, completionTokens: 50, totalTokens: 150 }),
      makeEvent({ promptTokens: 200, completionTokens: 80, totalTokens: 280, cacheRead: 50 }),
    ])
    expect(result!.promptTokens).toBe(300)
    expect(result!.completionTokens).toBe(130)
    expect(result!.totalTokens).toBe(430)
    expect(result!.cacheRead).toBe(50)
  })

  test('computes totalTokens when missing', () => {
    const result = aggregateTokenUsage([makeEvent({ promptTokens: 100, completionTokens: 50 })])
    expect(result!.totalTokens).toBe(150)
  })
})

describe('RunTokenLedger', () => {
  test('renders nothing when no usage data', () => {
    const html = renderToStaticMarkup(<RunTokenLedger runEvents={[makeEvent()]} />)
    expect(html).toBe('')
  })

  test('renders collapsed ledger with token counts', () => {
    const html = renderToStaticMarkup(
      <RunTokenLedger
        runEvents={[makeEvent({ promptTokens: 1500, completionTokens: 800, totalTokens: 2300 })]}
      />
    )
    expect(html).toContain('Tokens')
    expect(html).toContain('1.5k in')
    expect(html).toContain('800 out')
  })

  test('renders cache count when present', () => {
    const html = renderToStaticMarkup(
      <RunTokenLedger
        runEvents={[
          makeEvent({ promptTokens: 100, completionTokens: 50, totalTokens: 150, cacheRead: 200 }),
        ]}
      />
    )
    expect(html).toContain('200 cached')
  })

  test('does not render cache when zero', () => {
    const html = renderToStaticMarkup(
      <RunTokenLedger
        runEvents={[makeEvent({ promptTokens: 100, completionTokens: 50, totalTokens: 150 })]}
      />
    )
    expect(html).not.toContain('cached')
  })

  test('renders streaming indicator when live', () => {
    const html = renderToStaticMarkup(
      <RunTokenLedger
        runEvents={[makeEvent({ promptTokens: 100, completionTokens: 50, totalTokens: 150 })]}
        isStreaming={true}
      />
    )
    expect(html).toContain('•')
  })

  test('formats large token counts', () => {
    const html = renderToStaticMarkup(
      <RunTokenLedger
        runEvents={[
          makeEvent({
            promptTokens: 2_500_000,
            completionTokens: 1_200_000,
            totalTokens: 3_700_000,
          }),
        ]}
      />
    )
    expect(html).toContain('2.5M in')
    expect(html).toContain('1.2M out')
  })
})
