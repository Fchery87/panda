import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { RightPanel } from './RightPanel'

describe('RightPanel', () => {
  test('renders session inspector eyebrow when provided', () => {
    const html = renderToStaticMarkup(
      <RightPanel
        chatContent={<div>chat</div>}
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
    expect(html).toContain('Current session proof summary.')
  })
})
