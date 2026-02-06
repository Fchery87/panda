import { describe, expect, test } from 'bun:test'

import { parseSseChunk } from './useStreamingChat'

describe('parseSseChunk', () => {
  test('parses canonical text/reasoning/finish events and ignores DONE', () => {
    const chunk =
      'data: {"type":"text","content":"hello"}\n' +
      'data: {"type":"reasoning","reasoningContent":"thinking"}\n' +
      'data: {"type":"finish"}\n' +
      'data: [DONE]\n'

    const result = parseSseChunk(chunk)

    expect(result.buffer).toBe('')
    expect(result.events).toEqual([
      { type: 'text', content: 'hello' },
      { type: 'reasoning', reasoningContent: 'thinking' },
      { type: 'finish' },
    ])
  })

  test('supports backward-compatible payloads with direct content field', () => {
    const chunk = 'data: {"content":"legacy"}\n'
    const result = parseSseChunk(chunk)

    expect(result.events).toEqual([{ type: 'text', content: 'legacy' }])
  })

  test('handles SSE payload split across chunks', () => {
    const first = parseSseChunk('data: {"type":"text","content":"hel')
    expect(first.events).toEqual([])
    expect(first.buffer.length).toBeGreaterThan(0)

    const second = parseSseChunk('lo"}\n', first.buffer)
    expect(second.buffer).toBe('')
    expect(second.events).toEqual([{ type: 'text', content: 'hello' }])
  })
})
