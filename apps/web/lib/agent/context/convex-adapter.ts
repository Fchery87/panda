import type { LocalContextChunk } from './chunker'
import type { AgentContextPack } from './context-pack'

export interface ConvexContextChunkLike {
  _id?: string
  sourceType: LocalContextChunk['sourceType']
  sourceId: string
  chunkIndex: number
  content: string
  contentHash: string
  tokenCount?: number
  path?: string
  title?: string
  startLine?: number
  endLine?: number
  updatedAt?: number
}

export function convexChunksToLocalContextChunks(
  chunks: ConvexContextChunkLike[]
): LocalContextChunk[] {
  return chunks.map((chunk) => ({
    chunkId: chunk._id ?? `${chunk.sourceType}:${chunk.sourceId}:${chunk.chunkIndex}:${chunk.contentHash}`,
    sourceType: chunk.sourceType,
    sourceId: chunk.sourceId,
    chunkIndex: chunk.chunkIndex,
    content: chunk.content,
    contentHash: chunk.contentHash,
    tokenCount: chunk.tokenCount ?? Math.max(1, Math.ceil(chunk.content.length / 4)),
    path: chunk.path ?? null,
    title: chunk.title ?? null,
    startLine: chunk.startLine ?? null,
    endLine: chunk.endLine ?? null,
    updatedAt: chunk.updatedAt ?? null,
  }))
}

export function buildContextPackAudit(pack: AgentContextPack): {
  retrievedChunkCount: number
  includedChunkCount: number
  omittedChunkCount: number
  sourceTypes: string[]
  usedTokens: number
  maxTokens: number
} {
  return {
    retrievedChunkCount: pack.audit.retrievedChunkCount,
    includedChunkCount: pack.audit.includedChunkCount,
    omittedChunkCount: pack.audit.omittedChunkCount,
    sourceTypes: pack.audit.sourceTypes,
    usedTokens: pack.budget.usedTokens,
    maxTokens: pack.budget.maxTokens,
  }
}
