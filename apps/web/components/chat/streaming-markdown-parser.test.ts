import { describe, expect, test } from 'bun:test'

import { parseStreamingMarkdown, repairInlineMarkdownForDisplay } from './streaming-markdown-parser'

describe('streaming-markdown-parser', () => {
  test('parses markdown into settled and live blocks', () => {
    const blocks = parseStreamingMarkdown('## Title\n\nParagraph\n\n- one\n- two')

    expect(blocks).toHaveLength(3)
    expect(blocks[0]).toEqual({ type: 'markdown', content: '## Title', isSettled: true })
    expect(blocks[1]).toEqual({ type: 'markdown', content: 'Paragraph', isSettled: true })
    expect(blocks[2]).toEqual({
      type: 'list',
      ordered: false,
      items: ['one', 'two'],
      isSettled: false,
    })
  })

  test('keeps unclosed code fences as live code blocks', () => {
    const blocks = parseStreamingMarkdown('Before\n\n```ts\nconst value = 1;')

    expect(blocks[0]).toEqual({ type: 'markdown', content: 'Before', isSettled: true })
    expect(blocks[1]).toEqual({
      type: 'code',
      language: 'ts',
      code: 'const value = 1;',
      isSettled: false,
    })
  })

  test('repairs incomplete inline links conservatively', () => {
    expect(repairInlineMarkdownForDisplay('See [docs](https://example.com')).toBe(
      'See [docs](https://example.com)'
    )
  })
})
