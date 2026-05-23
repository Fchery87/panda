import { describe, expect, test } from 'bun:test'
import { buildSessionRailSummary, type RecentRunSummary } from './session-rail'

const now = 1_700_000_000_000

function run(overrides: Partial<RecentRunSummary>): RecentRunSummary {
  return {
    _id: 'run-primary',
    chatId: 'chat-1',
    status: 'completed',
    changedFiles: 0,
    approvalCount: 0,
    startedAt: now - 120_000,
    completedAt: now - 60_000,
    ...overrides,
  }
}

describe('buildSessionRailSummary subagent grouping', () => {
  test('keeps primary runs top-level and nests child subagent runs by parentRunId', () => {
    const summary = buildSessionRailSummary({
      now,
      runs: [
        run({ _id: 'parent-1', summary: 'Parent task' }),
        run({
          _id: 'child-1',
          runKind: 'subagent',
          parentRunId: 'parent-1',
          subagentName: 'researcher',
          delegatedTaskSummary: 'Inspect docs',
          status: 'running',
          startedAt: now - 30_000,
          lastActivityAt: now - 10_000,
          artifactCount: 2,
        }),
      ],
    })

    expect(summary.tasks).toHaveLength(1)
    expect(summary.tasks[0]?.id).toBe('parent-1')
    expect(summary.tasks[0]?.subagents).toEqual([
      {
        id: 'child-1',
        name: 'researcher',
        status: 'running',
        summary: 'Inspect docs',
        lastActivity: 'now',
        artifactCount: 2,
      },
    ])
  })

  test('maps stopped child runs to stopped nested state without making them top-level tasks', () => {
    const summary = buildSessionRailSummary({
      now,
      runs: [
        run({ _id: 'parent-2', summary: 'Parent task' }),
        run({
          _id: 'child-stopped',
          runKind: 'subagent',
          parentRunId: 'parent-2',
          subagentName: 'worker',
          delegatedTaskSummary: 'Try implementation',
          status: 'stopped',
          completedAt: now - 3_600_000,
          lastActivityAt: now - 3_600_000,
        }),
      ],
    })

    expect(summary.tasks.map((task) => task.id)).toEqual(['parent-2'])
    expect(summary.tasks[0]?.subagents?.[0]).toMatchObject({
      id: 'child-stopped',
      name: 'worker',
      status: 'stopped',
      summary: 'Try implementation',
      lastActivity: '1h',
    })
  })
})
