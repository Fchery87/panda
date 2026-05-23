import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const source = readFileSync(join(import.meta.dir, 'SubagentPanel.tsx'), 'utf8')

describe('SubagentPanel persisted child-run integration', () => {
  test('accepts persisted subagent rows and merges them with live tool-call entries', () => {
    expect(source).toContain('export interface PersistedSubagentRunRow')
    expect(source).toContain('persistedSubagents?: PersistedSubagentRunRow[]')
    expect(source).toContain('const persistedEntries: PanelSubagentEntry[] = persistedSubagents.map')
    expect(source).toContain('const liveIds = new Set')
    expect(source).toContain("source: 'persisted' as const")
    expect(source).toContain('persisted')
    expect(source).toContain('active {entry.lastActivity}')
    expect(source).toContain('entry.artifactCount')
  })
})
