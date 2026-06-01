import { SUMMARIZATION_PROMPT } from './harness/compaction'

export const MAX_LEARNING_SOURCE_CHARS = 6000
export const MAX_MEMORY_PROPOSALS = 5
export const MAX_MEMORY_BULLET_CHARS = 220
export const MAX_MEMORY_BANK_CHARS = 20000

export interface MemoryProposal {
  id: string
  text: string
  source: 'session-summary' | 'run-receipt'
  confidence: 'low' | 'medium' | 'high'
}

export interface MemoryDistillationInput {
  sessionSummary?: string | null
  receiptSummary?: string | null
  existingMemoryBank?: string | null
  maxProposals?: number
}

const SECRET_PATTERNS = [
  /\b[A-Za-z0-9_]*(?:api[_-]?key|token|secret|password|credential)[A-Za-z0-9_]*\b\s*[:=]\s*[^\s,;]+/giu,
  /\b(?:sk|pk|ghp|gho|github_pat)_[A-Za-z0-9_-]{12,}\b/gu,
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/gu,
]

const HIGH_SIGNAL_PATTERNS = [
  /\b(?:decided|decision|prefer|convention|always|never|use|avoid|fixed|resolved|root cause|architecture|migration|project rule|remember)\b/iu,
  /\b(?:Next\.js|Convex|WebContainer|Panda|R2|TypeScript|Tailwind|subagent|inspector|memory bank)\b/u,
]

export function redactLearningSource(source: string): string {
  const withoutControlChars = Array.from(source, (char) => {
    const codePoint = char.codePointAt(0) ?? 0
    return codePoint <= 31 || codePoint === 127 ? ' ' : char
  }).join('')

  return SECRET_PATTERNS.reduce(
    (next, pattern) => next.replace(pattern, '[redacted]'),
    withoutControlChars
  )
}

export function buildMemoryDistillationPrompt(input: MemoryDistillationInput): string {
  const source = redactLearningSource(
    [input.sessionSummary, input.receiptSummary]
      .filter(Boolean)
      .join('\n\n')
      .slice(0, MAX_LEARNING_SOURCE_CHARS)
  )
  return [
    SUMMARIZATION_PROMPT,
    'Distill only durable project memory bullets. Do not fabricate facts. Exclude secrets, credentials, personal data, raw reasoning, and one-off status updates.',
    'Return at most five short bullets that would help future Panda runs.',
    source,
  ]
    .filter(Boolean)
    .join('\n\n')
}

export function proposeMemoryBullets(input: MemoryDistillationInput): MemoryProposal[] {
  const maxProposals = Math.min(input.maxProposals ?? MAX_MEMORY_PROPOSALS, MAX_MEMORY_PROPOSALS)
  const existing = new Set(
    (input.existingMemoryBank ?? '')
      .split('\n')
      .map((line) => normalizeBullet(line))
      .filter(Boolean)
  )
  const source = redactLearningSource(
    [input.sessionSummary, input.receiptSummary]
      .filter(Boolean)
      .join('\n\n')
      .slice(0, MAX_LEARNING_SOURCE_CHARS)
  )

  const candidates = source
    .split(/\n|(?<=[.!?])\s+/u)
    .map((line) => line.replace(/^[-*]\s*/u, '').trim())
    .filter((line) => line.length >= 24 && line.length <= 500)
    .filter((line) => HIGH_SIGNAL_PATTERNS.some((pattern) => pattern.test(line)))
    .map((line) => line.replace(/\s+/gu, ' ').slice(0, MAX_MEMORY_BULLET_CHARS).trim())
    .filter((line) => !line.includes('[redacted]'))

  const proposals: MemoryProposal[] = []
  const seen = new Set<string>()
  for (const candidate of candidates) {
    const normalized = normalizeBullet(candidate)
    if (!normalized || seen.has(normalized) || existing.has(normalized)) continue
    seen.add(normalized)
    proposals.push({
      id: `memory-proposal-${hashString(normalized)}`,
      text: candidate.endsWith('.') ? candidate : `${candidate}.`,
      source: input.sessionSummary ? 'session-summary' : 'run-receipt',
      confidence: HIGH_SIGNAL_PATTERNS.every((pattern) => pattern.test(candidate))
        ? 'high'
        : 'medium',
    })
    if (proposals.length >= maxProposals) break
  }

  return proposals
}

export function appendApprovedMemoryProposal(
  memoryBank: string | null | undefined,
  proposal: string
): string {
  const cleanProposal = redactLearningSource(proposal)
    .replace(/^[-*]\s*/u, '')
    .trim()
  if (!cleanProposal || cleanProposal.includes('[redacted]')) return memoryBank ?? ''

  const current = (memoryBank ?? '').trim()
  const bullet = `- ${cleanProposal}`
  const next = current ? `${current}\n${bullet}` : `# Project Memory\n${bullet}`
  return next.slice(0, MAX_MEMORY_BANK_CHARS)
}

function normalizeBullet(value: string): string {
  return value
    .replace(/^[-*#\s]+/u, '')
    .replace(/[.]+$/u, '')
    .trim()
    .toLowerCase()
}

function hashString(value: string): string {
  let hash = 5381
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index)
  }
  return (hash >>> 0).toString(36)
}
