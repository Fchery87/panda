import { describe, test, expect } from 'bun:test'
import { estimateTokens, needsCompaction, estimateMessageTokens } from './compaction'

describe('estimateTokens', () => {
  test('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0)
  })

  test('returns accurate count for simple English text', () => {
    const text = 'Hello, world! This is a test sentence.'
    const tokens = estimateTokens(text)
    // Real tokenizer should give ~9-11 tokens
    expect(tokens).toBeGreaterThan(5)
    expect(tokens).toBeLessThan(15)
  })

  test('handles JSON tool output', () => {
    const json = JSON.stringify({
      files: [{ path: '/src/index.ts', content: 'export const x = 1;' }],
      metadata: { tool: 'write_files', status: 'completed' },
    })
    const tokens = estimateTokens(json)
    expect(tokens).toBeGreaterThan(20)
  })

  test('handles large repetitive text', () => {
    const text = 'x '.repeat(1000)
    const tokens = estimateTokens(text)
    // Heuristic in test env: ceil(2000/4) = 500; tiktoken would give ~1000
    expect(tokens).toBeGreaterThanOrEqual(500)
    expect(tokens).toBeLessThan(2000)
  })
})

describe('estimateMessageTokens', () => {
  test('counts tokens for a message with text content', () => {
    const message = {
      id: 'msg_1',
      sessionID: 'sess_1',
      role: 'user' as const,
      time: { created: Date.now() },
      parts: [
        {
          id: 'part_1',
          messageID: 'msg_1',
          sessionID: 'sess_1',
          type: 'text' as const,
          text: 'Hello, how are you?',
        },
      ],
      agent: 'user',
    }
    const tokens = estimateMessageTokens(message)
    // Base 50 + part overhead 20 + text tokens
    expect(tokens).toBeGreaterThan(70)
  })
})

describe('needsCompaction', () => {
  test('returns false for empty messages', () => {
    expect(needsCompaction([], 100000)).toBe(false)
  })

  test('returns false when under threshold', () => {
    const messages = [
      {
        id: 'msg_1',
        sessionID: 'sess_1',
        role: 'user' as const,
        time: { created: Date.now() },
        parts: [
          {
            id: 'part_1',
            messageID: 'msg_1',
            sessionID: 'sess_1',
            type: 'text' as const,
            text: 'Short message',
          },
        ],
        agent: 'user',
      },
    ]
    // Context limit of 100000 with threshold 0.9 = 90000 tokens needed
    expect(needsCompaction(messages, 100000)).toBe(false)
  })
})
