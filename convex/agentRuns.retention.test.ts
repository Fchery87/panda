import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const source = readFileSync(join(import.meta.dir, 'agentRuns.ts'), 'utf8')

describe('agentRuns retention and durability caps', () => {
  test('defines bounded constants for run tree, event append, and retention cleanup', () => {
    expect(source).toContain('const MAX_RUN_TREE_CHILD_LIMIT = 500')
    expect(source).toContain('const MAX_RUN_EVENT_APPEND_BATCH = 100')
    expect(source).toContain('const MAX_RETENTION_DELETE_BATCH = 500')
    expect(source).toContain('const DEFAULT_CHILD_RUN_EVENT_RETENTION = 200')
    expect(source).toContain('const DEFAULT_CHECKPOINT_RETENTION = 20')
  })

  test('caps appendEvents and run tree query limits defensively', () => {
    expect(source).toContain('args.events.length > MAX_RUN_EVENT_APPEND_BATCH')
    expect(source).toContain('Cannot append more than')
    expect(source).toContain('Math.min(args.childLimit ?? 100, MAX_RUN_TREE_CHILD_LIMIT)')
  })

  test('adds pruneRunRetention mutation for bounded event and checkpoint cleanup', () => {
    expect(source).toContain('export const pruneRunRetention = mutation')
    expect(source).toContain('keepEvents')
    expect(source).toContain('keepCheckpoints')
    expect(source).toContain('deleteBatchSize')
    expect(source).toContain("withIndex('by_run_sequence'")
    expect(source).toContain("withIndex('by_run_saved'")
    expect(source).toContain('deletedEvents')
    expect(source).toContain('deletedCheckpoints')
    expect(source).toContain('hasMore')
  })
})
