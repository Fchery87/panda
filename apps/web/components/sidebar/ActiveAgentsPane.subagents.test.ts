import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const activeAgentsSource = readFileSync(join(import.meta.dir, 'ActiveAgentsPane.tsx'), 'utf8')
const sessionRailSource = readFileSync(join(import.meta.dir, 'session-rail.ts'), 'utf8')
const layoutSource = readFileSync(
  join(import.meta.dir, '../projects/ProjectWorkspaceLayout.tsx'),
  'utf8'
)

describe('ActiveAgentsPane subagent run tree integration', () => {
  test('models and renders child subagent rows under parent tasks', () => {
    expect(activeAgentsSource).toContain('export interface AgentSubagentRow')
    expect(activeAgentsSource).toContain('subagents?: AgentSubagentRow[]')
    expect(activeAgentsSource).toContain('task.subagents && task.subagents.length > 0')
    expect(activeAgentsSource).toContain('@{subagent.name}')
    expect(activeAgentsSource).toContain('data-status={subagent.status}')
    expect(activeAgentsSource).toContain('subagent.artifactCount')
  })

  test('builds session rail tasks by nesting first-class child runs', () => {
    expect(sessionRailSource).toContain('export interface SessionRailSubagent')
    expect(sessionRailSource).toContain('childRunsByParent')
    expect(sessionRailSource).toContain("run.runKind !== 'subagent'")
    expect(sessionRailSource).toContain('parentRunId')
    expect(sessionRailSource).toContain('delegatedTaskSummary')
    expect(sessionRailSource).toContain('subagents,')
    expect(layoutSource).toContain('subagents: task.subagents')
  })
})
