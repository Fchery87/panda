import { describe, expect, test } from 'bun:test'
import { buildExecutionSessionInspectorViewModel } from './execution-session-inspector-view-model'
import type { ExecutionSessionViewModel } from './execution-session-view-model'

const session: ExecutionSessionViewModel = {
  phase: 'review',
  title: 'Ship the transcript policy update',
  statusLabel: 'Changes ready',
  tone: 'success',
  summary: '2 changed files ready for review.',
  nextStep: 'Inspect the changed work and proof before continuing.',
  primaryAction: { id: 'review_changes', label: 'Inspect Changes' },
  changedWork: { count: 2, label: '2 changed files ready for review.', needsReview: true },
  proof: {
    label: 'Proof ready',
    detail: 'Review run evidence, receipts, and validation before continuing.',
    hasActiveRun: false,
  },
  preview: {
    label: 'Browser runtime ready',
    available: true,
    detail: 'Preview can use the browser runtime for this session.',
  },
  branches: {
    running: 0,
    blocked: 0,
    complete: 0,
    label: 'No parallel branches active.',
    outcomes: [],
  },
  scanSignals: [
    { label: 'Run', value: 'Proof ready', tone: 'success' },
    { label: 'Approval', value: 'Clear', tone: 'neutral' },
    { label: 'Changes', value: '2', tone: 'success' },
    { label: 'Branches', value: 'No parallel branches active.', tone: 'neutral' },
  ],
  resume: {
    goal: 'Ship the transcript policy update',
    lastState: 'Changes ready',
    summary: 'Changes ready: 2 changed files ready for review.',
    changedWork: '2 changed files ready for review.',
    proof: 'Review run evidence, receipts, and validation before continuing.',
    branches: 'No parallel branches active.',
    trace: 'Trace live: run events are available for review.',
    checkpoint: 'Checkpoint: no recoverable runtime checkpoint attached.',
    nextAction: 'Inspect the changed work and proof before continuing.',
  },
}

describe('buildExecutionSessionInspectorViewModel', () => {
  test('labels proof as a session inspector surface', () => {
    expect(buildExecutionSessionInspectorViewModel('run', session)).toEqual({
      eyebrow: 'Execution Session Inspector',
      title: 'Session Proof',
      summary:
        'Ship the transcript policy update: Review run evidence, receipts, and validation before continuing.',
      emptyTitle: 'No run proof yet',
      emptyDetail: 'Proof appears after Panda executes work in this session.',
    })
  })

  test('uses changed-work summary from the current session', () => {
    expect(buildExecutionSessionInspectorViewModel('changes', session).summary).toBe(
      '2 changed files ready for review.'
    )
  })
})
