import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { QAPanel } from './QAPanel'

describe('QAPanel', () => {
  test('renders routes, assertions, console state, and summary', () => {
    const html = renderToStaticMarkup(
      <QAPanel
        report={{
          decision: 'pass',
          summary: 'QA passed on the workbench route.',
          assertions: [
            { label: 'Task panel rendered', status: 'passed' },
            { label: 'Latest review summary visible', status: 'passed' },
          ],
          evidence: {
            urlsTested: ['/projects/example'],
            flowNames: ['task-panel-review-loop'],
            consoleErrors: [],
            networkFailures: [],
          },
          defects: [],
        }}
      />
    )

    expect(html).toContain('QA passed on the workbench route.')
    expect(html).toContain('/projects/example')
    expect(html).toContain('Task panel rendered')
    expect(html).toContain('Latest review summary visible')
    expect(html).toContain('Console clean')
  })

  test('renders an empty state when no QA report exists', () => {
    const html = renderToStaticMarkup(<QAPanel report={null} />)

    expect(html).toContain('No QA report')
    expect(html).toContain('QA evidence will appear here')
  })
})
