import { describe, expect, test } from 'bun:test'
import {
  buildContextChunksFromSources,
  buildFileContextSources,
  buildSpecContextSources,
  buildSummaryContextSources,
} from './index-sources'

describe('context index sources', () => {
  test('converts files, summaries, and specs into chunkable sources', () => {
    const sources = [
      ...buildFileContextSources([
        { _id: 'file_1', path: 'src/app.ts', content: 'export const app = true', updatedAt: 10 },
      ]),
      ...buildSummaryContextSources([{ _id: 'summary_1', summary: 'User approved the plan.', createdAt: 20 }]),
      ...buildSpecContextSources([
        {
          _id: 'spec_1',
          status: 'approved',
          intent: { goal: 'Build context packs', rawMessage: 'Implement retrieval context', acceptanceCriteria: ['Uses budget'] },
          plan: { steps: ['Add chunks'], risks: ['Too much context'] },
          updatedAt: 30,
        },
      ]),
    ]

    expect(sources.map((source) => source.sourceType)).toEqual(['file', 'summary', 'spec'])
    const chunks = buildContextChunksFromSources(sources, { maxChars: 500, overlapChars: 0 })
    expect(chunks).toHaveLength(3)
    expect(chunks[0].sourceId).toBe('file_1')
    expect(chunks[2].content).toContain('Build context packs')
    expect(chunks[2].content).toContain('Uses budget')
  })
})
