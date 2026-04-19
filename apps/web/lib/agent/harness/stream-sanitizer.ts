import { detectGrammar } from './tool-call-grammars/index'
import type { ParsedToolCall, GrammarId } from './tool-call-grammars/types'
import type { ModelCompatibilityError } from './errors'

export interface SanitizeOptions {
  providerId: string
  modelId: string
  declaredGrammars: GrammarId[]
}

export type SanitizeResult =
  | { kind: 'clean'; text: string }
  | { kind: 'extracted'; cleanText: string; toolCalls: ParsedToolCall[] }
  | { kind: 'error'; error: ModelCompatibilityError }

export function sanitizeText(text: string, opts: SanitizeOptions): SanitizeResult {
  const detected = detectGrammar(text)
  if (!detected) {
    return { kind: 'clean', text }
  }

  const { grammar, hit } = detected
  const snippet = text.slice(hit.start, Math.min(hit.start + 200, text.length))

  if (grammar.id === 'unknown-suspicious') {
    return {
      kind: 'error',
      error: { kind: 'LEAKED_UNKNOWN_GRAMMAR', snippet, modelId: opts.modelId },
    }
  }

  if (!opts.declaredGrammars.includes(grammar.id)) {
    return {
      kind: 'error',
      error: {
        kind: 'LEAKED_UNDECLARED_GRAMMAR',
        grammarId: grammar.id,
        snippet,
        modelId: opts.modelId,
      },
    }
  }

  try {
    const toolCalls = grammar.parse(text)
    const cleanText = grammar.strip(text)
    return { kind: 'extracted', cleanText, toolCalls }
  } catch (err) {
    return {
      kind: 'error',
      error: {
        kind: 'PARSER_FAILED',
        grammarId: grammar.id,
        snippet,
        cause: err instanceof Error ? err.message : String(err),
      },
    }
  }
}
