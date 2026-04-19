export interface DetectHit {
  start: number
  end: number
  confidence: 'high' | 'low'
}

export interface ParsedToolCall {
  name: string
  arguments: Record<string, unknown>
  id?: string
}

export type GrammarId =
  | 'anthropic-native'
  | 'anthropic-xml-fallback'
  | 'openai-native'
  | 'openai-text-json'
  | 'minimax-xml'
  | 'hermes-tool-call'
  | 'qwen-xml'
  | 'deepseek-fim'
  | 'llama-python-tag'
  | 'unknown-suspicious'
  | (string & {})

export interface ToolCallGrammar {
  id: GrammarId
  detect(text: string): DetectHit | null
  parse(text: string): ParsedToolCall[]
  strip(text: string): string
  examples: {
    good: string[]
    malformed: string[]
  }
}
