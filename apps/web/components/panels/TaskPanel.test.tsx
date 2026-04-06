import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { TaskPanel } from './TaskPanel'

describe('TaskPanel', () => {
  test('renders task summary, criteria, blockers, scope, and evidence links', () => {
    const html = renderToStaticMarkup(
      <TaskPanel
        task={{
          title: 'Introduce canonical delivery state',
          description: 'Track meaningful implementation work with explicit lifecycle state.',
          rationale: 'Needed for review, QA, and ship gates.',
          status: 'in_review',
          ownerRole: 'manager',
          acceptanceCriteria: [
            { id: 'ac-1', text: 'Delivery state exists', status: 'passed' },
            { id: 'ac-2', text: 'Task transitions are enforced', status: 'pending' },
          ],
          filesInScope: ['convex/schema.ts', 'convex/deliveryStates.ts'],
          blockers: ['Need UI integration for active task display'],
          evidence: [{ label: 'Initial delivery state run', href: '/runs/1' }],
          latestReview: {
            type: 'implementation',
            decision: 'pass',
            summary: 'Implementation is ready for QA.',
          },
        }}
      />
    )

    expect(html).toContain('Introduce canonical delivery state')
    expect(html).toContain('Track meaningful implementation work with explicit lifecycle state.')
    expect(html).toContain('Needed for review, QA, and ship gates.')
    expect(html).toContain('Status in_review')
    expect(html).toContain('Owner manager')
    expect(html).toContain('Delivery state exists')
    expect(html).toContain('Task transitions are enforced')
    expect(html).toContain('convex/schema.ts')
    expect(html).toContain('Need UI integration for active task display')
    expect(html).toContain('Initial delivery state run')
    expect(html).toContain('Latest review')
    expect(html).toContain('Implementation is ready for QA.')
  })

  test('renders a calm empty state when no task is selected', () => {
    const html = renderToStaticMarkup(<TaskPanel task={null} />)

    expect(html).toContain('No active task')
    expect(html).toContain('Tracked work will appear here')
  })
})
