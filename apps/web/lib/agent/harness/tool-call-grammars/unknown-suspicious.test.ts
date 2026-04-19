import { describe, expect, test } from 'bun:test'
import { unknownSuspiciousGrammar } from './unknown-suspicious'

describe('unknown-suspicious grammar', () => {
  test('detects novel namespaced tool call tag', () => {
    expect(unknownSuspiciousGrammar.detect('<somemodel:tool_call>')).not.toBeNull()
  })

  test('detects deepseek FIM delimiter', () => {
    expect(unknownSuspiciousGrammar.detect('\u{FFF0}tool_calls_begin\u{FFF0}')).not.toBeNull()
  })

  test('detects <tool_call generic tag', () => {
    expect(unknownSuspiciousGrammar.detect('<tool_call')).not.toBeNull()
  })

  test('returns low confidence', () => {
    const hit = unknownSuspiciousGrammar.detect('<somemodel:tool_call>')
    expect(hit?.confidence).toBe('low')
  })

  test('does not detect normal prose', () => {
    expect(unknownSuspiciousGrammar.detect('Hello, this is a normal message.')).toBeNull()
    expect(
      unknownSuspiciousGrammar.detect('Use <b>bold</b> and <em>italic</em> in HTML.')
    ).toBeNull()
  })

  test('parse always returns empty (safety-net cannot parse unknown grammar)', () => {
    expect(
      unknownSuspiciousGrammar.parse('<somemodel:tool_call>x</somemodel:tool_call>')
    ).toHaveLength(0)
  })
})
