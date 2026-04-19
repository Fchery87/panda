import type { ToolCallGrammar, DetectHit, ParsedToolCall } from './types'

const OPEN_RE = /<｜tool▁calls▁begin｜>/
const FULL_RE = /<｜tool▁calls▁begin｜>([\s\S]*?)<｜tool▁calls▁end｜>/g
const CALL_RE = /<｜tool▁call▁begin｜>([\s\S]*?)<｜tool▁call▁end｜>/g

export const deepseekFimGrammar: ToolCallGrammar = {
  id: 'deepseek-fim',

  detect(text: string): DetectHit | null {
    const match = OPEN_RE.exec(text)
    if (!match) return null
    return { start: match.index, end: text.length, confidence: 'high' }
  },

  parse(text: string): ParsedToolCall[] {
    const results: ParsedToolCall[] = []
    FULL_RE.lastIndex = 0
    let blockMatch: RegExpExecArray | null
    while ((blockMatch = FULL_RE.exec(text)) !== null) {
      CALL_RE.lastIndex = 0
      let callMatch: RegExpExecArray | null
      while ((callMatch = CALL_RE.exec(blockMatch[1])) !== null) {
        try {
          const jsonStr = callMatch[1].trim()
          const obj = JSON.parse(jsonStr)
          if (typeof obj.name === 'string' || typeof obj.function?.name === 'string') {
            const name = obj.name ?? obj.function.name
            const args = obj.arguments ?? obj.function?.arguments ?? {}
            results.push({ name, arguments: typeof args === 'string' ? JSON.parse(args) : args })
          }
        } catch {
          /* skip */
        }
      }
    }
    return results
  },

  strip(text: string): string {
    FULL_RE.lastIndex = 0
    return text.replace(FULL_RE, '').trim()
  },

  examples: {
    good: [],
    malformed: [],
  },
}
