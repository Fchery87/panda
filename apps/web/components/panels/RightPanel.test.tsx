import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { RightPanel } from './RightPanel'

describe('RightPanel', () => {
  test('renders inspector content as an inspector rail without work tray content', () => {
    const html = renderToStaticMarkup(
      <RightPanel
        inspectorContent={<div>run evidence</div>}
        inspectorTabs={[{ id: 'proof', label: 'Run' }]}
        activeInspectorTab="proof"
      />
    )

    expect(html).toContain('Evidence Surface')
    expect(html).toContain('run evidence')
    expect(html).not.toContain('Work Tray')
  })

  test('renders session inspector eyebrow when provided', () => {
    const html = renderToStaticMarkup(
      <RightPanel
        inspectorContent={<div>run evidence</div>}
        inspectorTabs={[{ id: 'proof', label: 'Run' }]}
        activeInspectorTab="proof"
        inspectorEyebrow="Execution Session Inspector"
        inspectorTitle="Session Run"
        inspectorSummary="Current session run summary."
      />
    )

    expect(html).toContain('Execution Session Inspector')
    expect(html).toContain('Session Run')
  })
})
