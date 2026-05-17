export type ContextChunkSourceType =
  | 'file'
  | 'message'
  | 'summary'
  | 'plan'
  | 'spec'
  | 'run_event'
  | 'skill'
  | 'subagent'

export interface ContextSourceInput {
  sourceType: ContextChunkSourceType
  sourceId: string
  content: string
  path?: string | null
  title?: string | null
  updatedAt?: number
  maxChars?: number
  overlapChars?: number
}

export interface LocalContextChunk {
  chunkId: string
  sourceType: ContextChunkSourceType
  sourceId: string
  chunkIndex: number
  content: string
  contentHash: string
  tokenCount: number
  path: string | null
  title: string | null
  startLine: number | null
  endLine: number | null
  updatedAt: number | null
}

const DEFAULT_MAX_CHARS = 2_400
const DEFAULT_OVERLAP_CHARS = 240

export function estimateContextTokens(content: string): number {
  const normalized = content.trim()
  if (!normalized) return 0
  return Math.max(1, Math.ceil(normalized.length / 4))
}

export function normalizeContextContent(content: string): string {
  return content
    .replace(/\r\n/g, '\n')
    .replace(/[\t ]+$/gm, '')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()
}

export function createContentHash(content: string): string {
  let hash = 2166136261
  for (let index = 0; index < content.length; index += 1) {
    hash ^= content.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export function chunkContextSource(input: ContextSourceInput): LocalContextChunk[] {
  const content = normalizeContextContent(input.content)
  if (!content) return []

  const maxChars = Math.max(400, input.maxChars ?? DEFAULT_MAX_CHARS)
  const overlapChars = Math.max(0, Math.min(input.overlapChars ?? DEFAULT_OVERLAP_CHARS, maxChars / 3))
  const lines = content.split('\n')
  const chunks: LocalContextChunk[] = []
  let startLine = 0
  let cursor = 0

  while (startLine < lines.length) {
    let endLine = startLine
    let charCount = 0

    while (endLine < lines.length) {
      const nextLineLength = lines[endLine].length + 1
      if (charCount > 0 && charCount + nextLineLength > maxChars) break
      charCount += nextLineLength
      endLine += 1
    }

    if (endLine === startLine) endLine += 1

    const chunkContent = lines.slice(startLine, endLine).join('\n').trim()
    if (chunkContent) {
      const contentHash = createContentHash(chunkContent)
      chunks.push({
        chunkId: `${input.sourceType}:${input.sourceId}:${cursor}:${contentHash}`,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        chunkIndex: cursor,
        content: chunkContent,
        contentHash,
        tokenCount: estimateContextTokens(chunkContent),
        path: input.path ?? null,
        title: input.title ?? null,
        startLine: startLine + 1,
        endLine,
        updatedAt: input.updatedAt ?? null,
      })
      cursor += 1
    }

    if (endLine >= lines.length) break
    if (overlapChars === 0) {
      startLine = endLine
      continue
    }

    let overlapLine = endLine
    let overlapCount = 0
    while (overlapLine > startLine && overlapCount < overlapChars) {
      overlapLine -= 1
      overlapCount += lines[overlapLine].length + 1
    }
    startLine = Math.max(overlapLine, startLine + 1)
  }

  return chunks
}
