import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { RightPanel } from './RightPanel'

describe('RightPanel', () => {
  test('renders chat content without preview tabs', () => {
    const html = renderToStaticMarkup(<RightPanel chatContent={<div>chat</div>} />)

    expect(html).toContain('chat')
    expect(html).not.toContain('Preview')
  })

  test('renders the operational rail header when inspector content is open', () => {
    const html = renderToStaticMarkup(
      <RightPanel
        chatContent={<div>chat</div>}
        inspectorContent={<div>inspector</div>}
        inspectorTabs={[{ id: 'run', label: 'Run' }]}
        activeInspectorTab="run"
        isInspectorOpen={true}
      />
    )

    expect(html).toContain('Review Surface')
    expect(html).toContain('Operational Rail')
    expect(html).toContain('Review plan state, run history, evidence, and notes in one place.')
  })
})
