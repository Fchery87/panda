import { describe, expect, test } from 'bun:test'
import { byteLength, classifyOutput, guardCommandOutput, safeTruncate } from './context-guard'

const thresholds = {
  smallBytes: 8,
  mediumBytes: 32,
  largeBytes: 64,
  mediumPreviewChars: 12,
  largePreviewChars: 8,
  hugePreviewChars: 4,
}

describe('context guard', () => {
  test('classifies output by byte thresholds', () => {
    expect(classifyOutput(8, thresholds)).toBe('small')
    expect(classifyOutput(9, thresholds)).toBe('medium')
    expect(classifyOutput(33, thresholds)).toBe('large')
    expect(classifyOutput(65, thresholds)).toBe('huge')
  })

  test('leaves small command output unchanged', () => {
    const result = guardCommandOutput({ stdout: 'ok', stderr: '', exitCode: 0, thresholds })
    expect(result.metadata.guarded).toBe(false)
    expect(result.modelFacing.stdout).toBe('ok')
    expect(result.modelFacing.contextGuard).toBeUndefined()
  })

  test('guards medium output explicitly with metadata', () => {
    const result = guardCommandOutput({
      stdout: '0123456789abcdef'.repeat(10),
      stderr: 'err',
      exitCode: 1,
      thresholds: { ...thresholds, mediumBytes: 256, largeBytes: 512 },
    })
    expect(result.metadata.guarded).toBe(true)
    expect(result.metadata.classification).toBe('medium')
    expect(result.modelFacing.contextGuard?.reason).toBe('output_size')
    expect(result.modelFacing.stdout).toContain('Context Guard')
    expect(result.metadata.bytesAvoided).toBeGreaterThan(0)
  })

  test('includes evidence handle only when guarded', () => {
    const result = guardCommandOutput({
      stdout: '0123456789abcdef'.repeat(10),
      stderr: '',
      exitCode: 0,
      thresholds: { ...thresholds, mediumBytes: 256, largeBytes: 512 },
      evidence: { sourceType: 'run_event', sourceId: 'tool:abc:command-output', chunksWritten: 2 },
    })
    expect(result.modelFacing.contextGuard?.evidence?.sourceId).toBe('tool:abc:command-output')
  })

  test('measures bytes, not just characters', () => {
    expect(byteLength('🐼')).toBeGreaterThan('🐼'.length)
  })

  test('truncates unicode without splitting grapheme clusters', () => {
    const text = 'a🐼b👨‍👩‍👧‍👦c'
    const truncated = safeTruncate(text, 4)
    expect(truncated).not.toContain('\uFFFD')
    expect([...truncated].join('')).toBe(truncated)
  })
})
