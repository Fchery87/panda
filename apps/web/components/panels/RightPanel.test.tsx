import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { RightPanel } from './RightPanel'

describe('RightPanel', () => {
  test('renders work tray content by default', () => {
    const html = renderToStaticMarkup(
      <RightPanel
        workContent={<div>work surface</div>}
        inspectorContent={<div>proof</div>}
        inspectorTabs={[{ id: 'run', label: 'Run' }]}
      />
    )

    expect(html).toContain('Work Tray')
    expect(html).toContain('work surface')
    expect(html).not.toContain('proof')
  })

  test('renders session inspector eyebrow when provided', () => {
    const html = renderToStaticMarkup(
      <RightPanel
        workContent={<div>work</div>}
        inspectorContent={<div>proof</div>}
        inspectorTabs={[{ id: 'run', label: 'Run' }]}
        activeInspectorTab="run"
        isInspectorOpen={true}
        inspectorEyebrow="Execution Session Inspector"
        inspectorTitle="Session Proof"
        inspectorSummary="Current session proof summary."
      />
    )

    expect(html).toContain('Execution Session Inspector')
    expect(html).toContain('Session Proof')
  })
})
