import { describe, expect, it } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

const schemaSource = () => fs.readFileSync(path.resolve(import.meta.dir, 'schema.ts'), 'utf8')
const agentRunsSource = () => fs.readFileSync(path.resolve(import.meta.dir, 'agentRuns.ts'), 'utf8')

describe('agentRuns first-class child run foundation', () => {
  it('extends agentRuns schema with optional run tree fields and indexes', () => {
    const source = schemaSource()

    expect(source).toContain('export const AgentRunKind')
    expect(source).toContain('export const SubagentContextMode')
    expect(source).toContain('export const SubagentIsolationMode')
    expect(source).toContain('runKind: v.optional(AgentRunKind)')
    expect(source).toContain("parentRunId: v.optional(v.id('agentRuns'))")
    expect(source).toContain('parentSubagentId: v.optional(v.string())')
    expect(source).toContain("rootRunId: v.optional(v.id('agentRuns'))")
    expect(source).toContain('subagentName: v.optional(v.string())')
    expect(source).toContain('lastActivityAt: v.optional(v.number())')
    expect(source).toContain(".index('by_parent_started', ['parentRunId', 'startedAt'])")
    expect(source).toContain(".index('by_root_started', ['rootRunId', 'startedAt'])")
    expect(source).toContain(
      ".index('by_project_kind_started', ['projectId', 'runKind', 'startedAt'])"
    )
  })

  it('adds child run creation, activity touch, and tree query APIs', () => {
    const source = agentRunsSource()

    expect(source).toContain('export const createChild = mutation')
    expect(source).toContain("parentRunId: v.id('agentRuns')")
    expect(source).toContain("runKind: 'subagent'")
    expect(source).toContain('rootRunId: parentRun.rootRunId ?? parentRun._id')
    expect(source).toContain('export const touchActivity = mutation')
    expect(source).toContain('lastActivityAt: Date.now()')
    expect(source).toContain('export const listRunTree = query')
    expect(source).toContain("withIndex('by_root_started'")
    expect(source).toContain('children: children.map(toProjectRunSummary)')
    expect(source).toContain('delegatedTaskSummary: previewText(run.delegatedTaskSummary)')
    expect(source).toContain('lastActivityAt: run.lastActivityAt')
  })

  it('marks primary runs and updates lastActivityAt on terminal transitions', () => {
    const source = agentRunsSource()

    expect(source).toContain("runKind: 'primary'")
    expect(source).toContain('lastActivityAt: completedAt')
  })
})
