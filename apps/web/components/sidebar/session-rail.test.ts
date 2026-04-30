import { describe, expect, test } from 'bun:test'
import {
  buildSessionRailGroups,
  buildSessionRailSummary,
  type RecentRunSummary,
} from './session-rail'

const now = 1_000_000

function run(overrides: Partial<RecentRunSummary> = {}): RecentRunSummary {
  return {
    _id: 'run-1',
    chatId: 'chat-1',
    status: 'completed',
    userMessage: 'Build the session rail',
    summary: undefined,
    error: undefined,
    changedFiles: 0,
    approvalCount: 0,
    resultStatus: 'complete',
    startedAt: now - 120_000,
    completedAt: now - 60_000,
    ...overrides,
  }
}

describe('buildSessionRailSummary', () => {
  test('promotes the active chat to running while preserving existing run rows', () => {
    const summary = buildSessionRailSummary({
      runs: [run()],
      activeChatId: 'chat-1',
      activeChatTitle: 'Active task',
      isStreaming: true,
      pendingChangedFilesCount: 2,
      now,
    })

    expect(summary.state).toBe('running')
    expect(summary.label).toBe('Running')
    expect(summary.tasks[0]).toEqual(
      expect.objectContaining({
        chatId: 'chat-1',
        title: 'Active task',
        status: 'running',
        changedFiles: 2,
      })
    )
  })

  test('surfaces blocked work before review-ready work', () => {
    const summary = buildSessionRailSummary({
      runs: [
        run({ _id: 'review-run', chatId: 'chat-review', changedFiles: 3 }),
        run({ _id: 'blocked-run', chatId: 'chat-blocked', resultStatus: 'approval_timeout' }),
      ],
      now,
    })

    expect(summary.state).toBe('blocked')
    expect(summary.label).toBe('Needs attention')
    expect(summary.count).toBe(1)
    expect(summary.tasks.map((task) => task.status)).toEqual(['review', 'waiting'])
  })

  test('creates a synthetic active run when persistence has not returned yet', () => {
    const summary = buildSessionRailSummary({
      runs: [],
      activeChatId: 'chat-live',
      activeChatTitle: 'Live task',
      isStreaming: true,
      now,
    })

    expect(summary.state).toBe('running')
    expect(summary.tasks).toEqual([
      expect.objectContaining({ id: 'active-run', chatId: 'chat-live', status: 'running' }),
    ])
  })

  test('groups sessions by active, needs-review, recent, and idle states', () => {
    const summary = buildSessionRailSummary({
      runs: [
        run({ _id: 'complete-run', chatId: 'chat-complete' }),
        run({ _id: 'review-run', chatId: 'chat-review', changedFiles: 3 }),
        run({ _id: 'blocked-run', chatId: 'chat-blocked', resultStatus: 'approval_timeout' }),
      ],
      activeChatId: 'chat-live',
      activeChatTitle: 'Live session',
      isStreaming: true,
      now,
    })

    const groups = buildSessionRailGroups(summary.tasks)

    expect(groups.map((group) => [group.id, group.label, group.sessions.length])).toEqual([
      ['active', 'Active session', 1],
      ['needs_review', 'Needs review', 2],
      ['recent', 'Recent sessions', 1],
      ['idle', 'Idle sessions', 0],
    ])
  })
})
