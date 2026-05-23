import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { WorkspaceHome } from './WorkspaceHome'
import type { WorkspaceFocusState } from './workspace-focus'

describe('WorkspaceHome first-run guidance', () => {
  test('teaches the current project-to-proof loop without creating a separate wizard', () => {
    const html = renderToStaticMarkup(<WorkspaceHome onStartAgent={() => {}} />)

    expect(html).toContain('First Run Path')
    expect(html).toContain('1. Project')
    expect(html).toContain('2. Mode')
    expect(html).toContain('3. Plan')
    expect(html).toContain('4. Proof')
    expect(html).toContain('5. Changes')
    expect(html).toContain('6. Next Action')
    expect(html).toContain('Choose Ask / Plan / Agent')
    expect(html).toContain('Workspace Map')
    expect(html).toContain('Important Commands')
    expect(html).toContain('bun run typecheck')
    expect(html).toContain('bun run test:e2e')
    expect(html).toContain('Review Checklist')
    expect(html).toContain('Start first session')
  })
})

describe('WorkspaceHome resume guidance', () => {
  test('surfaces checkpoint and degraded trace recovery on the execution session shell', () => {
    const focusState: WorkspaceFocusState = {
      kind: 'execution-session',
      kicker: 'Execution Session',
      objective: 'Resume billing work',
      statusLabel: 'Changes ready',
      tone: 'success',
      detail: '2 changed files ready for review.',
      nextStep: 'Inspect changed work before continuing.',
      executionSession: {
        phase: 'review',
        title: 'Resume billing work',
        statusLabel: 'Changes ready',
        tone: 'success',
        summary: '2 changed files ready for review.',
        nextStep: 'Inspect changed work before continuing.',
        changedWork: { count: 2, label: '2 changed files ready for review.', needsReview: true },
        proof: {
          label: 'Proof ready',
          detail: 'Review run evidence, receipts, and validation before continuing.',
          hasActiveRun: false,
        },
        preview: { label: 'Server', available: true, detail: 'Server fallback remains available.' },
        branches: {
          running: 0,
          blocked: 0,
          complete: 1,
          label: '0 running, 0 blocked, 1 complete.',
          outcomes: [],
        },
        scanSignals: [],
        resume: {
          goal: 'Resume billing work',
          lastState: 'Changes ready',
          summary: 'Changes ready: 2 changed files ready for review.',
          changedWork: '2 changed files ready for review.',
          proof: 'Review run evidence, receipts, and validation before continuing.',
          branches: '0 running, 0 blocked, 1 complete.',
          trace:
            'Trace degraded: persisted run events may be partial; use receipt and checkpoint proof.',
          checkpoint:
            'Checkpoint ready: recover session session_123 from 2026-02-02T02:40:00.000Z.',
          nextAction: 'Inspect changed work before continuing.',
        },
      },
    }

    const html = renderToStaticMarkup(<WorkspaceHome focusState={focusState} />)

    expect(html).toContain('Resume And Recovery')
    expect(html).toContain('Checkpoint ready: recover session session_123')
    expect(html).toContain('Trace degraded')
    expect(html).toContain('Review run evidence, receipts, and validation before continuing.')
  })
})
