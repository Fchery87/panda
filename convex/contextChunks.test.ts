import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

describe('contextChunks persistence contract', () => {
  test('declares Convex-native lexical and semantic indexes', () => {
    const schemaSource = fs.readFileSync(path.resolve(import.meta.dir, 'schema.ts'), 'utf8')
    const contextChunksSource = fs.readFileSync(path.resolve(import.meta.dir, 'contextChunks.ts'), 'utf8')

    expect(schemaSource).toContain('export const ContextChunkSourceType = v.union(')
    expect(schemaSource).toContain('contextChunks: defineTable({')
    expect(schemaSource).toContain(".searchIndex('search_content'")
    expect(schemaSource).toContain("searchField: 'content'")
    expect(schemaSource).toContain("filterFields: ['projectId', 'sourceType']")
    expect(schemaSource).toContain(".vectorIndex('by_embedding'")
    expect(schemaSource).toContain('dimensions: 1536')
    expect(schemaSource).toContain(".index('by_source_chunk'")

    expect(contextChunksSource).toContain('export const upsertMany = mutation({')
    expect(contextChunksSource).toContain('export const indexProjectFiles = mutation({')
    expect(contextChunksSource).toContain('export const indexSessionSummaries = mutation({')
    expect(contextChunksSource).toContain('export const indexSpecifications = mutation({')
    expect(contextChunksSource).toContain('export const rebuildProject = mutation({')
    expect(contextChunksSource).toContain('export const stats = query({')
    expect(contextChunksSource).toContain('export const search = query({')
    expect(contextChunksSource).toContain('withSearchIndex')
    expect(contextChunksSource).toContain('export const purgeProject = mutation({')
    expect(contextChunksSource).toContain('export const semanticSearch = action({')
    expect(contextChunksSource).toContain("ctx.vectorSearch('contextChunks', 'by_embedding'")
    expect(contextChunksSource).toContain('export const getByIds = query({')
  })
})
