import type { ToolCallGrammar, DetectHit, ParsedToolCall } from './types'

const OPEN_RE = /<minimax:tool_call\b/
const FULL_RE = /<minimax:tool_call\b[^>]*>([\s\S]*?)<\/minimax:tool_call>/g
const NAME_RE = /<tool_name>([\s\S]*?)<\/tool_name>/
const PARAMS_RE = /<parameters>([\s\S]*?)<\/parameters>/

export const minimaxXmlGrammar: ToolCallGrammar = {
  id: 'minimax-xml',

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
      const inner = match[1]
      const nameMatch = NAME_RE.exec(inner)
      if (!nameMatch) continue
      const name = nameMatch[1].trim()
      let args: Record<string, unknown> = {}
      const paramsMatch = PARAMS_RE.exec(inner)
      if (paramsMatch) {
        try {
          args = JSON.parse(paramsMatch[1].trim())
        } catch {
          continue
        }
      }
      results.push({ name, arguments: args })
    }
    return results
  },

  strip(text: string): string {
    FULL_RE.lastIndex = 0
    return text.replace(FULL_RE, '').trim()
  },

  examples: {
    good: [
      `<minimax:tool_call>\n<tool_name>write_files</tool_name>\n<parameters>{"path":"x.ts","content":"hi"}</parameters>\n</minimax:tool_call>`,
      `<minimax:tool_call>\n<tool_name>run_command</tool_name>\n<parameters>{"command":"npm test"}</parameters>\n</minimax:tool_call>`,
    ],
    malformed: [
      `<minimax:tool_call>`,
      `<minimax:tool_call>\n<tool_name>write_files</tool_name>`,
      `<minimax:tool_call>\n<tool_name></tool_name>\n<parameters>not-json</parameters>\n</minimax:tool_call>`,
    ],
  },
}
