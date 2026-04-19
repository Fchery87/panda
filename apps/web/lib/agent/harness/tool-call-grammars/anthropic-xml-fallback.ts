import type { ToolCallGrammar, DetectHit, ParsedToolCall } from './types'

const OPEN_RE = /<function_calls>/
const BLOCK_RE = /<function_calls>([\s\S]*?)<\/function_calls>/g
const INVOKE_RE = /<invoke>([\s\S]*?)<\/invoke>/g
const NAME_RE = /<tool_name>([\s\S]*?)<\/tool_name>/
const PARAMS_RE = /<parameters>([\s\S]*?)<\/parameters>/

export const anthropicXmlFallbackGrammar: ToolCallGrammar = {
  id: 'anthropic-xml-fallback',

  detect(text: string): DetectHit | null {
    const match = OPEN_RE.exec(text)
    if (!match) return null
    return { start: match.index, end: text.length, confidence: 'high' }
  },

  parse(text: string): ParsedToolCall[] {
    const results: ParsedToolCall[] = []
    BLOCK_RE.lastIndex = 0
    let blockMatch: RegExpExecArray | null
    while ((blockMatch = BLOCK_RE.exec(text)) !== null) {
      INVOKE_RE.lastIndex = 0
      let invokeMatch: RegExpExecArray | null
      while ((invokeMatch = INVOKE_RE.exec(blockMatch[1])) !== null) {
        const inner = invokeMatch[1]
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
    }
    return results
  },

  strip(text: string): string {
    BLOCK_RE.lastIndex = 0
    return text.replace(BLOCK_RE, '').trim()
  },

  examples: {
    good: [
      `<function_calls>\n<invoke>\n<tool_name>write_files</tool_name>\n<parameters>{"path":"x.ts","content":"hi"}</parameters>\n</invoke>\n</function_calls>`,
    ],
    malformed: [`<function_calls>`, `<function_calls><invoke></invoke></function_calls>`],
  },
}
