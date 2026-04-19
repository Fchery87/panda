import { describe, expect, test } from 'bun:test'
import { minimaxXmlGrammar } from './minimax-xml'

const GOOD = `<minimax:tool_call>
<tool_name>write_files</tool_name>
<parameters>{"path": "src/app.ts", "content": "hello"}</parameters>
</minimax:tool_call>`

const MULTI = `Some text before.
${GOOD}
Some text after.`

const MALFORMED_NO_CLOSE = `<minimax:tool_call>
<tool_name>write_files</tool_name>
<parameters>{"path": "x"}`

describe('minimax-xml grammar', () => {
  test('detect returns hit on valid input', () => {
    const hit = minimaxXmlGrammar.detect(GOOD)
    expect(hit).not.toBeNull()
    expect(hit!.confidence).toBe('high')
  })

  test('detect returns null on plain text', () => {
    expect(minimaxXmlGrammar.detect('just some text')).toBeNull()
  })

  test('parse extracts tool call name and arguments', () => {
    const calls = minimaxXmlGrammar.parse(GOOD)
    expect(calls).toHaveLength(1)
    expect(calls[0].name).toBe('write_files')
    expect(calls[0].arguments).toEqual({ path: 'src/app.ts', content: 'hello' })
  })

  test('parse handles multiple tool calls in one text', () => {
    const two =
      GOOD +
      '\n' +
      GOOD.replace('write_files', 'run_command').replace(
        '{"path": "src/app.ts", "content": "hello"}',
        '{"command": "npm test"}'
      )
    const calls = minimaxXmlGrammar.parse(two)
    expect(calls).toHaveLength(2)
  })

  test('parse returns empty array for malformed (no closing tag)', () => {
    const calls = minimaxXmlGrammar.parse(MALFORMED_NO_CLOSE)
    expect(calls).toHaveLength(0)
  })

  test('strip removes tool call blocks from text', () => {
    const stripped = minimaxXmlGrammar.strip(MULTI)
    expect(stripped).not.toContain('<minimax:tool_call>')
    expect(stripped).toContain('Some text before.')
    expect(stripped).toContain('Some text after.')
  })

  test('examples.good all parse successfully', () => {
    for (const ex of minimaxXmlGrammar.examples.good) {
      expect(() => minimaxXmlGrammar.parse(ex)).not.toThrow()
      expect(minimaxXmlGrammar.detect(ex)).not.toBeNull()
    }
  })

  test('examples.malformed all parse to empty (never silent-accept)', () => {
    for (const ex of minimaxXmlGrammar.examples.malformed) {
      const calls = minimaxXmlGrammar.parse(ex)
      expect(calls).toHaveLength(0)
    }
  })
})
