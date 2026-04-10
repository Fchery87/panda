import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { RightPanel } from './RightPanel'

describe('RightPanel', () => {
  test('renders chat content without preview tabs', () => {
    const html = renderToStaticMarkup(<RightPanel chatContent={<div>chat</div>} />)

    expect(html).toContain('chat')
    expect(html).not.toContain('Preview')
  })
})
