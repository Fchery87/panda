import { describe, expect, test } from 'bun:test'
import { sanitizeText } from './stream-sanitizer'

const MINIMAX_CALL = `<minimax:tool_call>
<tool_name>write_files</tool_name>
<parameters>{"path":"x.ts","content":"hi"}</parameters>
</minimax:tool_call>`

describe('sanitizeText', () => {
  test('clean text passes through unchanged', () => {
    const result = sanitizeText('hello world', {
      providerId: 'anthropic',
      modelId: 'claude-sonnet-4-6',
      declaredGrammars: ['anthropic-native'],
    })
    expect(result.kind).toBe('clean')
    if (result.kind === 'clean') expect(result.text).toBe('hello world')
  })

  test('detects minimax-xml in text when grammar is declared', () => {
    const result = sanitizeText(MINIMAX_CALL, {
      providerId: 'openai-compatible',
      modelId: 'kimi-k2.5',
      declaredGrammars: ['minimax-xml'],
    })
    expect(result.kind).toBe('extracted')
    if (result.kind === 'extracted') {
      expect(result.toolCalls).toHaveLength(1)
      expect(result.toolCalls[0].name).toBe('write_files')
      expect(result.cleanText).not.toContain('<minimax:tool_call>')
    }
  })

  test('reports LEAKED_UNDECLARED_GRAMMAR when minimax-xml found but not declared', () => {
    const result = sanitizeText(MINIMAX_CALL, {
      providerId: 'anthropic',
      modelId: 'claude-sonnet-4-6',
      declaredGrammars: ['anthropic-native'],
    })
    expect(result.kind).toBe('error')
    if (result.kind === 'error') {
      expect(result.error.kind).toBe('LEAKED_UNDECLARED_GRAMMAR')
    }
  })

  test('reports LEAKED_UNKNOWN_GRAMMAR for novel tool-call-shaped tag', () => {
    const result = sanitizeText('<novelvendor:tool_call>x</novelvendor:tool_call>', {
      providerId: 'anthropic',
      modelId: 'claude-sonnet-4-6',
      declaredGrammars: ['anthropic-native'],
    })
    expect(result.kind).toBe('error')
    if (result.kind === 'error') {
      expect(result.error.kind).toBe('LEAKED_UNKNOWN_GRAMMAR')
    }
  })

  test('property: no tool-call-shaped text in clean output under any condition', () => {
    const suspiciousInputs = [
      MINIMAX_CALL,
      '<function_calls><invoke><tool_name>x</tool_name></invoke></function_calls>',
      '<tool_call">{"name":"x","arguments":{}}</tool_call_>',
      '<novelvendor:tool_call>stuff</novelvendor:tool_call>',
    ]
    for (const input of suspiciousInputs) {
      const result = sanitizeText(input, {
        providerId: 'anthropic',
        modelId: 'claude-sonnet-4-6',
        declaredGrammars: ['anthropic-native'],
      })
      if (result.kind === 'clean') {
        expect(result.text).not.toMatch(/<\w[\w-]*:\w[\w-]*_call|<function_calls>|<tool_call/)
      }
    }
  })
})
