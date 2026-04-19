import type { ToolCallGrammar, DetectHit, ParsedToolCall } from './types'

const OPEN_RE = /<tool_call/
const FULL_RE = /<tool_call(?:\s[^>]*)?>([\s\S]*?)<\/tool_call>/g

export const hermesToolCallGrammar: ToolCallGrammar = {
  id: 'hermes-tool-call',

  detect(text: string): DetectHit | null {
    const match = OPEN_RE.exec(text)
    if (!match) return null
    return { start: match.index, end: text.length, confidence: 'high' }
  },

  parse(text: string): ParsedToolCall[] {
    const results: ParsedToolCall[] = []
    FULL_RE.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = FULL_RE.exec(text)) !== null) {
      try {
        const obj = JSON.parse(match[1].trim())
        if (typeof obj.name === 'string' && typeof obj.arguments === 'object') {
          results.push({ name: obj.name, arguments: obj.arguments ?? {} })
        }
      } catch {
        /* skip */
      }
    }
    return results
  },

  strip(text: string): string {
    FULL_RE.lastIndex = 0
    return text.replace(FULL_RE, '').trim()
  },

  examples: {
    good: [
      `<tool_call">\n{"name":"write_files","arguments":{"path":"x.ts","content":"hi"}}\n</tool_call_>`,
    ],
    malformed: [
      `<tool_call">\nnot json\n</tool_call_>`,
      `<tool_call">\n{"name":"x"}\n</tool_call_>`,
    ],
  },
}
