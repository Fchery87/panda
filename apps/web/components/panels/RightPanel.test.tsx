import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { RightPanel } from './RightPanel'

describe('RightPanel', () => {
  test('renders chat content without preview tabs', () => {
    const html = renderToStaticMarkup(<RightPanel chatContent={<div>chat</div>} />)

    expect(html).toContain('chat')
    expect(html).not.toContain('Preview')
  })

  test('renders the evidence surface header when inspector content is open', () => {
    const html = renderToStaticMarkup(
      <RightPanel
        chatContent={<div>chat</div>}
        inspectorContent={<div>inspector</div>}
        inspectorTabs={[{ id: 'run', label: 'Run' }]}
        activeInspectorTab="run"
        isInspectorOpen={true}
      />
    )

    expect(html).toContain('Evidence Surface')
    expect(html).toContain('Run proof, receipts, snapshots, subagents, specs, and validation.')
  })
})
