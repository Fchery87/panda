import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { StatePanel } from './StatePanel'

describe('StatePanel', () => {
  test('renders current phase, task counts, risks, gates, and ship readiness', () => {
    const html = renderToStaticMarkup(
      <StatePanel
        state={{
          currentPhase: 'ship',
          openTaskCount: 2,
          unresolvedRiskCount: 1,
          reviewGateStatus: 'passed',
          qaGateStatus: 'passed',
          shipSummary: 'Ready to ship.',
        }}
      />
    )

    expect(html).toContain('Phase ship')
    expect(html).toContain('Open tasks 2')
    expect(html).toContain('Risks 1')
    expect(html).toContain('Review passed')
    expect(html).toContain('QA passed')
    expect(html).toContain('Ready to ship.')
  })

  test('renders empty state when no delivery state exists', () => {
    const html = renderToStaticMarkup(<StatePanel state={null} />)

    expect(html).toContain('No delivery state')
    expect(html).toContain('Tracked project state will appear here')
  })
})
