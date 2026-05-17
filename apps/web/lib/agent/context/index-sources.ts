import type { ContextChunkSourceType, ContextSourceInput, LocalContextChunk } from './chunker'
import { chunkContextSource } from './chunker'

export interface ContextIndexableSource {
  sourceType: ContextChunkSourceType
  sourceId: string
  content: string | null | undefined
  path?: string | null
  title?: string | null
  updatedAt?: number
}

export function buildContextChunksFromSources(
  sources: ContextIndexableSource[],
  options?: { maxChars?: number; overlapChars?: number }
): LocalContextChunk[] {
  return sources.flatMap((source) => {
    if (!source.content?.trim()) return []
    const input: ContextSourceInput = {
      sourceType: source.sourceType,
      sourceId: source.sourceId,
      content: source.content,
      path: source.path,
      title: source.title,
      updatedAt: source.updatedAt,
      maxChars: options?.maxChars,
      overlapChars: options?.overlapChars,
    }
    return chunkContextSource(input)
  })
}

export function buildFileContextSources(
  files: Array<{
    _id?: string
    id?: string
    path: string
    content?: string | null
    updatedAt?: number
  }>
): ContextIndexableSource[] {
  return files.map((file) => ({
    sourceType: 'file',
    sourceId: file._id ?? file.id ?? file.path,
    path: file.path,
    title: file.path.split('/').pop() ?? file.path,
    content: file.content,
    updatedAt: file.updatedAt,
  }))
}

export function buildSummaryContextSources(
  summaries: Array<{ _id?: string; id?: string; summary: string; createdAt?: number }>
): ContextIndexableSource[] {
  return summaries.map((summary) => ({
    sourceType: 'summary',
    sourceId: summary._id ?? summary.id ?? String(summary.createdAt ?? summary.summary.length),
    title: 'Session summary',
    content: summary.summary,
    updatedAt: summary.createdAt,
  }))
}

export function buildSpecContextSources(
  specs: Array<{
    _id?: string
    id?: string
    intent?: { goal?: string; rawMessage?: string; acceptanceCriteria?: unknown[] }
    plan?: { steps?: unknown[]; risks?: unknown[] }
    status?: string
    updatedAt?: number
  }>
): ContextIndexableSource[] {
  return specs.map((spec) => ({
    sourceType: 'spec',
    sourceId: spec._id ?? spec.id ?? spec.intent?.goal ?? 'spec',
    title: spec.intent?.goal ?? 'Specification',
    content: [
      spec.status ? `Status: ${spec.status}` : null,
      spec.intent?.goal ? `Goal: ${spec.intent.goal}` : null,
      spec.intent?.rawMessage ? `Request: ${spec.intent.rawMessage}` : null,
      spec.intent?.acceptanceCriteria?.length
        ? `Acceptance Criteria:\n${spec.intent.acceptanceCriteria.map((item) => `- ${String(item)}`).join('\n')}`
        : null,
      spec.plan?.steps?.length
        ? `Plan Steps:\n${spec.plan.steps.map((item) => `- ${String(item)}`).join('\n')}`
        : null,
      spec.plan?.risks?.length
        ? `Risks:\n${spec.plan.risks.map((item) => `- ${String(item)}`).join('\n')}`
        : null,
    ]
      .filter(Boolean)
      .join('\n\n'),
    updatedAt: spec.updatedAt,
  }))
}
