import type { ContextChunkSourceType, LocalContextChunk } from './chunker'
import { estimateContextTokens } from './chunker'
import { retrieveContextChunks, type RetrievedContextChunk } from './retriever'

export type ContextPackSectionKind =
  | 'system'
  | 'project'
  | 'files'
  | 'history'
  | 'summary'
  | 'plan'
  | 'spec'
  | 'runtime'
  | 'skills'

export interface ContextPackItem {
  sourceType: ContextChunkSourceType
  sourceId: string
  chunkId: string
  chunkIndex: number
  title: string | null
  path: string | null
  content: string
  tokenCount: number
  score: number
  reasons: string[]
}

export interface ContextPackSection {
  kind: ContextPackSectionKind
  tokenCount: number
  items: ContextPackItem[]
}

export interface OmittedContextItem {
  sourceType: ContextChunkSourceType
  sourceId: string
  chunkId: string
  reason: 'budget' | 'low_score' | 'duplicate' | 'stale' | 'permission' | 'sensitive'
  tokenCount: number
}

export interface AgentContextPack {
  query: string
  mode: 'ask' | 'plan' | 'code' | 'build'
  budget: { maxTokens: number; usedTokens: number; reserveTokens: number }
  sections: ContextPackSection[]
  omitted: OmittedContextItem[]
  audit: {
    retrievedChunkCount: number
    includedChunkCount: number
    omittedChunkCount: number
    sourceTypes: ContextChunkSourceType[]
  }
}

export interface BuildAgentContextPackOptions {
  query: string
  mode: AgentContextPack['mode']
  chunks: LocalContextChunk[]
  maxTokens: number
  reserveTokens?: number
  activeFile?: string | null
  openTabs?: string[]
  maxChunks?: number
}

function sectionKindForSource(sourceType: ContextChunkSourceType): ContextPackSectionKind {
  switch (sourceType) {
    case 'file':
      return 'files'
    case 'message':
      return 'history'
    case 'summary':
      return 'summary'
    case 'plan':
      return 'plan'
    case 'spec':
      return 'spec'
    case 'run_event':
      return 'runtime'
    case 'skill':
    case 'subagent':
      return 'skills'
  }
}

function toItem(chunk: RetrievedContextChunk): ContextPackItem {
  return {
    sourceType: chunk.sourceType,
    sourceId: chunk.sourceId,
    chunkId: chunk.chunkId,
    chunkIndex: chunk.chunkIndex,
    title: chunk.title,
    path: chunk.path,
    content: chunk.content,
    tokenCount: chunk.tokenCount || estimateContextTokens(chunk.content),
    score: chunk.score,
    reasons: chunk.reasons,
  }
}

export function buildAgentContextPack(options: BuildAgentContextPackOptions): AgentContextPack {
  const reserveTokens = Math.max(0, options.reserveTokens ?? Math.floor(options.maxTokens * 0.12))
  const availableTokens = Math.max(0, options.maxTokens - reserveTokens)
  const retrieved = retrieveContextChunks({
    query: options.query,
    chunks: options.chunks,
    activeFile: options.activeFile,
    openTabs: options.openTabs,
    maxChunks: options.maxChunks ?? 24,
  })

  const sections = new Map<ContextPackSectionKind, ContextPackSection>()
  const omitted: OmittedContextItem[] = []
  const seen = new Set<string>()
  let usedTokens = 0

  for (const chunk of retrieved) {
    const tokenCount = chunk.tokenCount || estimateContextTokens(chunk.content)
    if (seen.has(chunk.contentHash)) {
      omitted.push({
        sourceType: chunk.sourceType,
        sourceId: chunk.sourceId,
        chunkId: chunk.chunkId,
        reason: 'duplicate',
        tokenCount,
      })
      continue
    }
    if (usedTokens + tokenCount > availableTokens) {
      omitted.push({
        sourceType: chunk.sourceType,
        sourceId: chunk.sourceId,
        chunkId: chunk.chunkId,
        reason: 'budget',
        tokenCount,
      })
      continue
    }
    seen.add(chunk.contentHash)
    usedTokens += tokenCount
    const kind = sectionKindForSource(chunk.sourceType)
    const section = sections.get(kind) ?? { kind, tokenCount: 0, items: [] }
    section.items.push(toItem(chunk))
    section.tokenCount += tokenCount
    sections.set(kind, section)
  }

  const sectionList = Array.from(sections.values())
  const sourceTypes = Array.from(
    new Set(sectionList.flatMap((section) => section.items.map((item) => item.sourceType)))
  )
  return {
    query: options.query,
    mode: options.mode,
    budget: { maxTokens: options.maxTokens, usedTokens, reserveTokens },
    sections: sectionList,
    omitted,
    audit: {
      retrievedChunkCount: retrieved.length,
      includedChunkCount: sectionList.reduce((total, section) => total + section.items.length, 0),
      omittedChunkCount: omitted.length,
      sourceTypes,
    },
  }
}

export function formatAgentContextPackForPrompt(pack: AgentContextPack): string {
  const lines: string[] = [
    '## Retrieved Context Pack',
    `Mode: ${pack.mode}`,
    `Query: ${pack.query}`,
    `Budget: ${pack.budget.usedTokens}/${pack.budget.maxTokens} tokens used (${pack.budget.reserveTokens} reserved)`,
  ]

  for (const section of pack.sections) {
    if (section.items.length === 0) continue
    lines.push('', `### ${section.kind} (${section.tokenCount} tokens)`)
    for (const item of section.items) {
      const label = item.path ?? item.title ?? `${item.sourceType}:${item.sourceId}`
      const location = item.path && item.title ? ` — ${item.title}` : ''
      const reason = item.reasons.length > 0 ? ` reasons=${item.reasons.join(',')}` : ''
      lines.push(
        `- Source: ${label}${location} [${item.sourceType}] score=${item.score.toFixed(2)}${reason}`
      )
      lines.push('```')
      lines.push(item.content)
      lines.push('```')
    }
  }

  if (pack.omitted.length > 0) {
    const omittedByReason = pack.omitted.reduce<Record<string, number>>((acc, item) => {
      acc[item.reason] = (acc[item.reason] ?? 0) + 1
      return acc
    }, {})
    lines.push('', `### Omitted Context (${pack.omitted.length})`)
    lines.push(
      Object.entries(omittedByReason)
        .map(([reason, count]) => `${reason}: ${count}`)
        .join(', ')
    )
  }

  return lines.join('\n')
}
