import { describe, expect, test } from 'bun:test'
import { buildExecutionSessionTimelineRows } from './execution-session-timeline'
import type { ExecutionSessionViewModel } from './execution-session-view-model'

const baseSession: ExecutionSessionViewModel = {
  phase: 'executing',
  title: 'Add billing settings',
  statusLabel: 'Executing',
  tone: 'progress',
  summary: 'Editing workspace shell',
  nextStep: 'Monitor progress and inspect proof.',
  primaryAction: { id: 'open_run', label: 'Open Run' },
  changedWork: { count: 2, label: '2 changed files ready for review.', needsReview: true },
  proof: { label: 'Run active', detail: 'Editing workspace shell', hasActiveRun: true },
  preview: {
    label: 'Browser runtime ready',
    available: true,
    detail: 'Preview can use the browser runtime for this session.',
  },
  branches: {
    running: 1,
    blocked: 0,
    complete: 1,
    label: '1 running, 0 blocked, 1 complete.',
    outcomes: [
      { label: 'UI branch', status: 'running', outcome: 'Branch still running.' },
      { label: 'Docs branch', status: 'complete', outcome: 'Branch completed.' },
    ],
  },
  resume: {
    goal: 'Add billing settings',
    lastState: 'Executing',
    changedWork: '2 changed files ready for review.',
    proof: 'Editing workspace shell',
    branches: '1 running, 0 blocked, 1 complete.',
    nextAction: 'Monitor progress and inspect proof.',
  },
}

describe('buildExecutionSessionTimelineRows', () => {
  test('builds a compressed session narrative with expandable detail references', () => {
    const rows = buildExecutionSessionTimelineRows(baseSession)

    expect(rows.map((row) => row.kind)).toEqual([
      'intent',
      'activity_group',
      'changed_work',
      'proof',
      'preview',
      'branches',
      'next_action',
    ])
    expect(rows[0]).toEqual(
      expect.objectContaining({
        id: 'intent',
        title: 'Add billing settings',
        summary: 'Executing',
      })
    )
    expect(rows[1]).toEqual(
      expect.objectContaining({
        title: 'Ran',
        summary: 'Editing workspace shell',
        detailRef: { kind: 'run' },
      })
    )
    expect(rows.at(-1)).toEqual(
      expect.objectContaining({
        title: 'Next Action',
        summary: 'Monitor progress and inspect proof.',
      })
    )
    expect(rows.find((row) => row.kind === 'branches')?.items).toEqual([
      { label: 'UI branch', status: 'running', summary: 'Branch still running.' },
      { label: 'Docs branch', status: 'complete', summary: 'Branch completed.' },
    ])
  })

  test('attaches changed work review to the session timeline', () => {
    const rows = buildExecutionSessionTimelineRows({
      ...baseSession,
      changedWork: {
        count: 3,
        label: '3 changed files ready for review.',
        needsReview: true,
        groups: { created: 1, modified: 2, deleted: 0 },
      },
    })

    expect(rows.find((row) => row.kind === 'changed_work')).toEqual(
      expect.objectContaining({
        title: 'Changed',
        summary: '3 changed files ready for review. Created 1, modified 2, deleted 0.',
        detailRef: { kind: 'changes' },
      })
    )
  })

  test('represents empty and planning sessions without raw event noise', () => {
    expect(buildExecutionSessionTimelineRows(null)).toEqual([
      expect.objectContaining({
        kind: 'intent',
        title: 'Start an execution session',
      }),
    ])

    const planningRows = buildExecutionSessionTimelineRows({
      ...baseSession,
      phase: 'planning',
      statusLabel: 'Planning intake',
      tone: 'attention',
      summary: 'Which billing provider should Panda integrate?',
      proof: {
        label: 'No run proof yet',
        detail: 'Proof appears after execution.',
        hasActiveRun: false,
      },
      changedWork: { count: 0, label: 'No changed files in this session yet.', needsReview: false },
      branches: {
        running: 0,
        blocked: 0,
        complete: 0,
        label: 'No parallel branches active.',
        outcomes: [],
      },
    })

    expect(planningRows.map((row) => row.kind)).toEqual([
      'intent',
      'planning',
      'proof',
      'preview',
      'next_action',
    ])
    expect(planningRows[1]).toEqual(
      expect.objectContaining({ title: 'Planning', detailRef: { kind: 'plan' } })
    )
  })
})
