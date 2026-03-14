import { describe, expect, it } from 'bun:test'
import { executeOracleSearch } from './oracle'
import type { ToolContext } from '../tools'

type SearchArgs =
  NonNullable<ToolContext['searchCode']> extends (args: infer A) => Promise<any> ? A : never

function makeContext(calls: SearchArgs[]): ToolContext {
  return {
    projectId: 'p1',
    chatId: 'c1',
    userId: 'u1',
    readFiles: async () => [],
    applyPatch: async () => ({ success: true, appliedHunks: 1, fuzzyMatches: 0 }),
    writeFiles: async () => [],
    runCommand: async () => ({ stdout: '', stderr: '', exitCode: 0, durationMs: 1 }),
    updateMemoryBank: async () => ({ success: true }),
    searchCode: async (args) => {
      calls.push(args)
      return {
        engine: 'test',
        query: args.query,
        mode: args.mode ?? 'literal',
        truncated: false,
        stats: {
          durationMs: 1,
          filesMatched: 0,
          matchesReturned: 0,
        },
        warnings: [],
        matches: [],
      }
    },
  }
}

describe('executeOracleSearch', () => {
  it('escapes regex metacharacters and does not rely on inline case flags', async () => {
    const calls: SearchArgs[] = []
    await executeOracleSearch('foo.bar(baz)?', makeContext(calls))

    expect(calls).toHaveLength(2)
    expect(calls[0]?.mode).toBe('literal')
    expect(calls[0]?.query).toBe('foo.bar(baz)?')
    expect(calls[1]?.mode).toBe('regex')
    expect(calls[1]?.caseSensitive).toBe(false)
    expect(calls[1]?.query).not.toContain('(?i)')
    expect(calls[1]?.query).toContain('foo\\.bar\\(baz\\)\\?')
  })

  it('skips obvious stopwords when choosing the regex symbol token', async () => {
    const calls: SearchArgs[] = []
    await executeOracleSearch('find where to show Timeline component', makeContext(calls))

    expect(calls[1]?.query).toContain('Timeline')
    expect(calls[1]?.query).not.toContain('find')
    expect(calls[1]?.query).not.toContain('where')
    expect(calls[1]?.query).not.toContain('show')
  })

  it('trims wrapping quotes and short-circuits empty queries', async () => {
    const quotedCalls: SearchArgs[] = []
    await executeOracleSearch('  "Timeline"  ', makeContext(quotedCalls))

    expect(quotedCalls[0]?.query).toBe('Timeline')

    const emptyCalls: SearchArgs[] = []
    const result = await executeOracleSearch('   ""   ', makeContext(emptyCalls))

    expect(emptyCalls).toHaveLength(0)
    expect(result.query).toBe('')
    expect(result.matches).toEqual([])
    expect(result.stats.totalFound).toBe(0)
  })
})
