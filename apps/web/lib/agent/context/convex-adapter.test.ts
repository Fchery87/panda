import { describe, expect, test } from 'bun:test'
import { buildContextPackAudit, convexChunksToLocalContextChunks } from './convex-adapter'

describe('context convex adapter', () => {
  test('maps Convex chunks into local context chunks', () => {
    const [chunk] = convexChunksToLocalContextChunks([
      {
        _id: 'ctx_1',
        sourceType: 'file',
        sourceId: 'file_1',
        chunkIndex: 0,
        content: 'hello context',
        contentHash: 'abc123',
        path: 'src/app.ts',
      },
    ])

    expect(chunk.chunkId).toBe('ctx_1')
    expect(chunk.path).toBe('src/app.ts')
    expect(chunk.tokenCount).toBeGreaterThan(0)
  })

  test('builds a compact run audit from a context pack', () => {
    const audit = buildContextPackAudit({
      query: 'context',
      mode: 'build',
      budget: { maxTokens: 100, usedTokens: 25, reserveTokens: 10 },
      sections: [],
      omitted: [],
      audit: {
        retrievedChunkCount: 3,
        includedChunkCount: 2,
        omittedChunkCount: 1,
        sourceTypes: ['file'],
      },
    })

    expect(audit).toEqual({
      retrievedChunkCount: 3,
      includedChunkCount: 2,
      omittedChunkCount: 1,
      sourceTypes: ['file'],
      usedTokens: 25,
      maxTokens: 100,
    })
  })
})
