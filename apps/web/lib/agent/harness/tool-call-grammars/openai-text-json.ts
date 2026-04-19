import type { ToolCallGrammar, DetectHit, ParsedToolCall } from './types'

const DETECT_RE = /\{"name"\s*:\s*"[^"]+"\s*,\s*"arguments"\s*:/
const EXTRACT_RE = /\{"name"\s*:\s*"([^"]+)"\s*,\s*"arguments"\s*:\s*(\{[\s\S]*?\})\}/g

export const openaiTextJsonGrammar: ToolCallGrammar = {
  id: 'openai-text-json',

  detect(text: string): DetectHit | null {
    const match = DETECT_RE.exec(text)
    if (!match) return null
    return { start: match.index, end: text.length, confidence: 'high' }
  },

  parse(text: string): ParsedToolCall[] {
    const results: ParsedToolCall[] = []
    EXTRACT_RE.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = EXTRACT_RE.exec(text)) !== null) {
      const name = match[1]
      try {
        const args = JSON.parse(match[2])
        results.push({ name, arguments: args })
      } catch {
        /* skip malformed */
      }
    }
    return results
  },

  strip(text: string): string {
    EXTRACT_RE.lastIndex = 0
    return text.replace(EXTRACT_RE, '').trim()
  },

  examples: {
    good: [
      `{"name":"write_files","arguments":{"path":"x.ts","content":"hi"}}`,
      `{"name": "run_command", "arguments": {"command": "npm test"}}`,
    ],
    malformed: [`{"name":"write_files"}`, `{"foo":"bar"}`],
  },
}
