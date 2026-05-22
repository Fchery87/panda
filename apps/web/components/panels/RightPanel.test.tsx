import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { RightPanel } from './RightPanel'

describe('RightPanel', () => {
  test('renders inspector content as a support rail without work tray content', () => {
    const html = renderToStaticMarkup(
      <RightPanel
        inspectorContent={<div>proof</div>}
        inspectorTabs={[{ id: 'proof', label: 'Proof' }]}
        activeInspectorTab="proof"
      />
    )

    expect(html).toContain('Evidence Surface')
    expect(html).toContain('proof')
    expect(html).not.toContain('Work Tray')
  })

  test('renders session inspector eyebrow when provided', () => {
    const html = renderToStaticMarkup(
      <RightPanel
        inspectorContent={<div>proof</div>}
        inspectorTabs={[{ id: 'proof', label: 'Proof' }]}
        activeInspectorTab="proof"
        inspectorEyebrow="Execution Session Inspector"
        inspectorTitle="Session Proof"
        inspectorSummary="Current session proof summary."
      />
    )

    expect(html).toContain('Execution Session Inspector')
    expect(html).toContain('Session Proof')
  })
})
