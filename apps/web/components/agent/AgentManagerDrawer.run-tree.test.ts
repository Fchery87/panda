import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const sourcePath = join(import.meta.dir, 'AgentManagerDrawer.tsx')
const source = readFileSync(sourcePath, 'utf8')

describe('AgentManagerDrawer run tree UI', () => {
  test('queries and renders first-class subagent child runs', () => {
    expect(source).toContain('api.agentRuns.listRunTree')
    expect(source).toContain('activeRun ? { runId: activeRun._id, childLimit: 20 } : \'skip\'')
    expect(source).toContain('activeChildRuns')
    expect(source).toContain('Subagent run tree')
    expect(source).toContain('@{child.subagentName || \'subagent\'}')
    expect(source).toContain('child.delegatedTaskSummary')
    expect(source).toContain('child.lastActivityAt || child.startedAt')
  })
})
