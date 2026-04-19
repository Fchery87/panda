import { describe, expect, test } from 'bun:test'
import { anthropicXmlFallbackGrammar } from './anthropic-xml-fallback'

const GOOD = `<function_calls>
<invoke>
<tool_name>write_files</tool_name>
<parameters>{"path": "x.ts", "content": "hi"}</parameters>
</invoke>
</function_calls>`

describe('anthropic-xml-fallback grammar', () => {
  test('detects <function_calls> opening tag', () => {
    expect(anthropicXmlFallbackGrammar.detect(GOOD)).not.toBeNull()
  })

  test('detect returns null on plain text', () => {
    expect(anthropicXmlFallbackGrammar.detect('hello world')).toBeNull()
  })

  test('parses name and arguments', () => {
    const calls = anthropicXmlFallbackGrammar.parse(GOOD)
    expect(calls).toHaveLength(1)
    expect(calls[0].name).toBe('write_files')
    expect(calls[0].arguments.path).toBe('x.ts')
  })

  test('strips all function_calls blocks', () => {
    const stripped = anthropicXmlFallbackGrammar.strip('before\n' + GOOD + '\nafter')
    expect(stripped).not.toContain('<function_calls>')
    expect(stripped).toContain('before')
    expect(stripped).toContain('after')
  })

  test('examples.good all parse successfully', () => {
    for (const ex of anthropicXmlFallbackGrammar.examples.good) {
      const calls = anthropicXmlFallbackGrammar.parse(ex)
      expect(calls.length).toBeGreaterThan(0)
    }
  })
})
