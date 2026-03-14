import { describe, expect, test } from 'bun:test'
import type { Id } from '@convex/_generated/dataModel'

import { groupBufferedRunEvents } from './useRunEventBuffer'

describe('useRunEventBuffer helpers', () => {
  test('groups buffered events by run and preserves sequence order within each run', () => {
    const runA = 'run-a' as Id<'agentRuns'>
    const runB = 'run-b' as Id<'agentRuns'>
    const grouped = groupBufferedRunEvents([
      {
        runId: runB,
        event: { sequence: 4, type: 'text', content: 'b-4' },
      },
      {
        runId: runA,
        event: { sequence: 2, type: 'text', content: 'a-2' },
      },
      {
        runId: runA,
        event: { sequence: 1, type: 'text', content: 'a-1' },
      },
      {
        runId: runB,
        event: { sequence: 3, type: 'text', content: 'b-3' },
      },
    ])

    expect(Array.from(grouped.keys())).toEqual([runB, runA])
    expect(grouped.get(runA)?.map((event) => event.sequence)).toEqual([1, 2])
    expect(grouped.get(runB)?.map((event) => event.sequence)).toEqual([3, 4])
  })
})
