import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const source = readFileSync(join(import.meta.dir, 'ProjectChatInspector.tsx'), 'utf8')

describe('ProjectChatInspector persisted run-tree plumbing', () => {
  test('queries latest run tree and passes persisted child runs to SubagentPanel', () => {
    expect(source).toContain('api.agentRuns.listRunTree')
    expect(source).toContain('latestRunReceipt?.runId')
    expect(source).toContain("childLimit: 40")
    expect(source).toContain('const persistedSubagents: PersistedSubagentRunRow[]')
    expect(source).toContain('runTree?.children')
    expect(source).toContain('name: child.subagentName')
    expect(source).toContain('summary: child.delegatedTaskSummary')
    expect(source).toContain('formatRelativeRunTime')
    expect(source).toContain('persistedSubagents.length > 0')
    expect(source).toContain('persistedSubagents={persistedSubagents}')
  })
})
