import type { ToolCallGrammar, GrammarId } from './types'

const registry = new Map<GrammarId, ToolCallGrammar>()

export function registerGrammar(grammar: ToolCallGrammar): void {
  registry.set(grammar.id, grammar)
}

export function getGrammar(id: GrammarId): ToolCallGrammar | undefined {
  return registry.get(id)
}

export function getAllGrammars(): ToolCallGrammar[] {
  return [...registry.values()]
}

export function detectGrammar(
  text: string
): { grammar: ToolCallGrammar; hit: import('./types').DetectHit } | null {
  for (const grammar of registry.values()) {
    if (grammar.id === 'unknown-suspicious') continue
    const hit = grammar.detect(text)
    if (hit) return { grammar, hit }
  }
  const safety = registry.get('unknown-suspicious')
  if (safety) {
    const hit = safety.detect(text)
    if (hit) return { grammar: safety, hit }
  }
  return null
}

export type { ToolCallGrammar, GrammarId, DetectHit, ParsedToolCall } from './types'

import { minimaxXmlGrammar } from './minimax-xml'
import { anthropicXmlFallbackGrammar } from './anthropic-xml-fallback'
import { openaiTextJsonGrammar } from './openai-text-json'
import { unknownSuspiciousGrammar } from './unknown-suspicious'
import { hermesToolCallGrammar } from './hermes-tool-call'
import { deepseekFimGrammar } from './deepseek-fim'

registerGrammar(minimaxXmlGrammar)
registerGrammar(anthropicXmlFallbackGrammar)
registerGrammar(openaiTextJsonGrammar)
registerGrammar(hermesToolCallGrammar)
registerGrammar(deepseekFimGrammar)
registerGrammar(unknownSuspiciousGrammar)
