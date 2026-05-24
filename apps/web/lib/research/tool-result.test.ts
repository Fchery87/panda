import { describe, expect, it } from 'bun:test'
import { toResearchToolResult } from './extractors'

// Verifies research tool results remain bounded before entering chat/proof surfaces.
describe('research tool result formatting', () => {
  it('returns source metadata with bounded preview', () => {
    const result = toResearchToolResult({
      sourceId: 'src_abc',
      kind: 'web_search',
      title: 'Web search: Panda',
      url: 'search:Panda',
      markdown: 'x'.repeat(7000),
      summary: 'summary',
    })

    expect(result.sourceId).toBe('src_abc')
    expect(result.kind).toBe('web_search')
    expect(result.truncated).toBe(true)
    expect(result.contentPreview.length).toBeLessThanOrEqual(6001)
  })
})
