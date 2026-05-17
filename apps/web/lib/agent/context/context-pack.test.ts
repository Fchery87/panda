import { describe, expect, test } from 'bun:test'
import { buildAgentContextPack } from './context-pack'
import { chunkContextSource } from './chunker'
import { retrieveContextChunks } from './retriever'

describe('agent context engineering', () => {
  test('chunks sources with deterministic provenance', () => {
    const chunks = chunkContextSource({
      sourceType: 'file',
      sourceId: 'file_1',
      path: 'apps/web/lib/agent/context/retriever.ts',
      content: Array.from({ length: 40 }, (_, index) => `line ${index} retrieval context`).join(
        '\n'
      ),
      maxChars: 180,
      overlapChars: 30,
    })

    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks[0].chunkId).toContain('file:file_1:0:')
    expect(chunks[0].path).toBe('apps/web/lib/agent/context/retriever.ts')
    expect(chunks[0].startLine).toBe(1)
    expect(chunks[0].tokenCount).toBeGreaterThan(0)
  })

  test('retrieves chunks using query, active file, and open-tab signals', () => {
    const chunks = [
      ...chunkContextSource({
        sourceType: 'file',
        sourceId: 'file_agent',
        path: 'apps/web/lib/agent/runtime.ts',
        content: 'Runtime creates context packs for agent runs and checkpoints.',
      }),
      ...chunkContextSource({
        sourceType: 'file',
        sourceId: 'file_theme',
        path: 'apps/web/components/theme.tsx',
        content: 'Theme switcher and visual preferences.',
      }),
      ...chunkContextSource({
        sourceType: 'summary',
        sourceId: 'summary_1',
        title: 'Previous run summary',
        content: 'The previous agent run failed because context retrieval missed the active file.',
      }),
    ]

    const results = retrieveContextChunks({
      query: 'fix agent context retrieval runtime',
      chunks,
      activeFile: 'apps/web/lib/agent/runtime.ts',
      openTabs: ['apps/web/lib/agent/runtime.ts'],
    })

    expect(results[0].path).toBe('apps/web/lib/agent/runtime.ts')
    expect(results[0].reasons).toContain('active_file')
    expect(results.some((result) => result.sourceType === 'summary')).toBe(true)
  })

  test('builds a budgeted context pack with omitted provenance', () => {
    const chunks = [
      ...chunkContextSource({
        sourceType: 'file',
        sourceId: 'file_1',
        path: 'src/large.ts',
        content: 'context retrieval '.repeat(600),
        maxChars: 1_000,
        overlapChars: 0,
      }),
      ...chunkContextSource({
        sourceType: 'spec',
        sourceId: 'spec_1',
        title: 'Context system spec',
        content: 'The agent must use Context Packs with token budgets and provenance.',
      }),
    ]

    const pack = buildAgentContextPack({
      query: 'context retrieval token budget provenance',
      mode: 'build',
      chunks,
      maxTokens: 260,
      reserveTokens: 40,
      maxChunks: 8,
    })

    expect(pack.budget.usedTokens).toBeLessThanOrEqual(220)
    expect(pack.audit.retrievedChunkCount).toBeGreaterThan(0)
    expect(pack.audit.includedChunkCount).toBeGreaterThan(0)
    expect(pack.omitted.some((item) => item.reason === 'budget')).toBe(true)
    expect(pack.sections.some((section) => section.kind === 'spec')).toBe(true)
  })
})
