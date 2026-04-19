import { describe, expect, test } from 'bun:test'
import { openaiTextJsonGrammar } from './openai-text-json'

const GOOD = `{"name":"write_files","arguments":{"path":"x.ts","content":"hi"}}`

describe('openai-text-json grammar', () => {
  test('detects inline JSON tool call', () => {
    expect(openaiTextJsonGrammar.detect(GOOD)).not.toBeNull()
  })

  test('does not detect plain JSON without name+arguments', () => {
    expect(openaiTextJsonGrammar.detect('{"foo":"bar"}')).toBeNull()
  })

  test('parses name and arguments', () => {
    const calls = openaiTextJsonGrammar.parse(GOOD)
    expect(calls).toHaveLength(1)
    expect(calls[0].name).toBe('write_files')
    expect(calls[0].arguments.path).toBe('x.ts')
  })

  test('strips the JSON blob from text', () => {
    const stripped = openaiTextJsonGrammar.strip('before ' + GOOD + ' after')
    expect(stripped).not.toContain('"name":"write_files"')
    expect(stripped).toContain('before')
    expect(stripped).toContain('after')
  })
})
