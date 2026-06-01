import { describe, expect, test } from 'bun:test'
import {
  appendApprovedMemoryProposal,
  buildMemoryDistillationPrompt,
  proposeMemoryBullets,
  redactLearningSource,
} from './continual-learning'

describe('continual learning memory distiller', () => {
  test('redacts secrets and personal identifiers from learning sources', () => {
    const source = 'Use Convex. apiKey=sk_test_123456789012345 and email admin@example.com'

    const redacted = redactLearningSource(source)

    expect(redacted).toContain('Use Convex')
    expect(redacted).not.toContain('sk_test')
    expect(redacted).not.toContain('admin@example.com')
  })

  test('proposes bounded durable memory bullets from high-signal summaries', () => {
    const proposals = proposeMemoryBullets({
      sessionSummary:
        'Decision: Panda should keep Convex as the realtime state brain while using WebContainer-first execution with server fallback. Avoid hot live queries over large event payloads.',
      maxProposals: 3,
    })

    expect(proposals.length).toBeGreaterThan(0)
    expect(proposals.length).toBeLessThanOrEqual(3)
    expect(proposals[0].text).toContain('Convex')
  })

  test('does not propose bullets that already exist in the memory bank', () => {
    const proposals = proposeMemoryBullets({
      sessionSummary: 'Decision: Always use WebContainer-first execution with server fallback.',
      existingMemoryBank:
        '- Decision: Always use WebContainer-first execution with server fallback.',
    })

    expect(proposals).toHaveLength(0)
  })

  test('builds a summarizer-backed prompt with anti-fabrication guidance', () => {
    const prompt = buildMemoryDistillationPrompt({ sessionSummary: 'Prefer TypeScript.' })

    expect(prompt).toContain('Distill only durable project memory bullets')
    expect(prompt).toContain('Do not fabricate facts')
    expect(prompt).toContain('Prefer TypeScript')
  })

  test('appends approved proposals without accepting redacted secrets', () => {
    const memory = appendApprovedMemoryProposal(
      '# Project Memory',
      'Use Convex for realtime state.'
    )
    const secretMemory = appendApprovedMemoryProposal(memory, 'token=sk_test_123456789012345')

    expect(memory).toContain('- Use Convex for realtime state.')
    expect(secretMemory).toBe(memory)
  })
})
