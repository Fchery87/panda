import type { ContextChunkSourceType, LocalContextChunk } from './chunker'

export interface ContextRetrievalInput {
  query: string
  chunks: LocalContextChunk[]
  activeFile?: string | null
  openTabs?: string[]
  maxChunks?: number
  sourceTypeBoosts?: Partial<Record<ContextChunkSourceType, number>>
  minScore?: number
  sourceTypeCaps?: Partial<Record<ContextChunkSourceType, number>>
}

export interface RetrievedContextChunk extends LocalContextChunk {
  score: number
  reasons: string[]
}

const DEFAULT_SOURCE_BOOSTS: Record<ContextChunkSourceType, number> = {
  file: 1,
  message: 0.72,
  summary: 0.92,
  plan: 0.95,
  spec: 1,
  run_event: 0.84,
  skill: 0.76,
  subagent: 0.72,
}

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'how',
  'i',
  'in',
  'is',
  'it',
  'of',
  'on',
  'or',
  'that',
  'the',
  'this',
  'to',
  'with',
])

export function tokenizeContextQuery(query: string): string[] {
  return Array.from(
    new Set(
      query
        .toLowerCase()
        .split(/[^a-z0-9_./-]+/)
        .map((term) => term.trim())
        .filter((term) => term.length > 1 && !STOP_WORDS.has(term))
    )
  ).slice(0, 16)
}

function basename(path: string | null): string | null {
  if (!path) return null
  return path.split('/').pop() || path
}

export function retrieveContextChunks(input: ContextRetrievalInput): RetrievedContextChunk[] {
  const terms = tokenizeContextQuery(input.query)
  const openTabs = new Set((input.openTabs ?? []).map((tab) => tab.toLowerCase()))
  const activeFile = input.activeFile?.toLowerCase() ?? null
  const sourceBoosts = { ...DEFAULT_SOURCE_BOOSTS, ...input.sourceTypeBoosts }

  const sourceCounts = new Map<ContextChunkSourceType, number>()
  const minScore = input.minScore ?? 0

  return input.chunks
    .map((chunk): RetrievedContextChunk => {
      const content = chunk.content.toLowerCase()
      const path = chunk.path?.toLowerCase() ?? null
      const title = chunk.title?.toLowerCase() ?? null
      const fileName = basename(path)
      const reasons: string[] = []
      let score = 0

      for (const term of terms) {
        const occurrences = content.split(term).length - 1
        if (occurrences > 0) {
          score += Math.min(occurrences, 6) * 1.4
          reasons.push(`content:${term}`)
        }
        if (path?.includes(term)) {
          score += 4
          reasons.push(`path:${term}`)
        }
        if (title?.includes(term)) {
          score += 3
          reasons.push(`title:${term}`)
        }
        if (fileName && term === fileName) {
          score += 5
          reasons.push(`filename:${term}`)
        }
      }

      if (activeFile && path === activeFile) {
        score += 7
        reasons.push('active_file')
      }
      if (path && openTabs.has(path)) {
        score += 4
        reasons.push('open_tab')
      }
      if (
        chunk.sourceType === 'summary' ||
        chunk.sourceType === 'plan' ||
        chunk.sourceType === 'spec'
      ) {
        score += 1
        reasons.push(`source:${chunk.sourceType}`)
      }

      score *= sourceBoosts[chunk.sourceType]
      return { ...chunk, score, reasons: Array.from(new Set(reasons)) }
    })
    .filter((chunk) => chunk.score > minScore)
    .sort((a, b) => b.score - a.score || b.tokenCount - a.tokenCount)
    .filter((chunk) => {
      const cap = input.sourceTypeCaps?.[chunk.sourceType]
      if (cap === undefined) return true
      const current = sourceCounts.get(chunk.sourceType) ?? 0
      if (current >= cap) return false
      sourceCounts.set(chunk.sourceType, current + 1)
      return true
    })
    .slice(0, input.maxChunks ?? 12)
}
