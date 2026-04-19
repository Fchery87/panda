import type { ToolCallGrammar, DetectHit } from './types'

const PATTERNS = [
  /<\w[\w-]*:\w[\w-]*_call\b/,
  /<tool_call\b/,
  /<function_call\b/,
  /\u{FFF0}tool_calls/u,
  /<\|python_tag\|>/,
]

export const unknownSuspiciousGrammar: ToolCallGrammar = {
  id: 'unknown-suspicious',

  detect(text: string): DetectHit | null {
    for (const re of PATTERNS) {
      const match = re.exec(text)
      if (match) return { start: match.index, end: text.length, confidence: 'low' }
    }
    return null
  },

  parse(_text: string) {
    return []
  },

  strip(text: string): string {
    return text
  },

  examples: {
    good: [],
    malformed: [],
  },
}
