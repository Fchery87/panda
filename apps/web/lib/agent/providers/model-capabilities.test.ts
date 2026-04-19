import { describe, expect, test } from 'bun:test'
import {
  findCapability,
  isVerified,
  getGrammarsForModel,
  MODEL_CAPABILITIES,
} from './model-capabilities'

describe('model-capabilities manifest', () => {
  test('findCapability returns entry for known model', () => {
    const cap = findCapability('anthropic', 'claude-sonnet-4-6')
    expect(cap).not.toBeNull()
    expect(cap!.status).toBe('verified')
  })

  test('findCapability returns null for unknown model', () => {
    expect(findCapability('anthropic', 'nonexistent-model-xyz')).toBeNull()
  })

  test('isVerified returns true for claude models', () => {
    expect(isVerified('anthropic', 'claude-sonnet-4-6')).toBe(true)
  })

  test('isVerified returns false for unmanifested model', () => {
    expect(isVerified('unknown-provider', 'mystery-model')).toBe(false)
  })

  test('getGrammarsForModel returns grammar list for minimax model', () => {
    const grammars = getGrammarsForModel('openai-compatible', 'kimi-k2.5')
    expect(grammars).toContain('minimax-xml')
  })

  test('every manifest entry has at least one grammar', () => {
    for (const entry of MODEL_CAPABILITIES) {
      expect(entry.toolCallGrammars.length).toBeGreaterThan(0)
    }
  })
})
