import { describe, expect, it } from 'bun:test'
import { analyzeCommand, isCommandPipelineSafe, splitCommandByPipe } from './command-analysis'

describe('command analysis', () => {
  it('recognizes safe read-only pipelines', () => {
    const analysis = analyzeCommand('npm test | head -20')

    expect(analysis.kind).toBe('pipeline')
    expect(analysis.riskTier).toBe('low')
    expect(analysis.requiresApproval).toBe(false)
    expect(isCommandPipelineSafe(analysis)).toBe(true)
    expect(splitCommandByPipe('npm test | head -20')).toEqual(['npm test', 'head -20'])
  })

  it('flags redirects as high risk and approval-gated', () => {
    const analysis = analyzeCommand('npm test > out.txt')

    expect(analysis.kind).toBe('redirect')
    expect(analysis.riskTier).toBe('high')
    expect(analysis.requiresApproval).toBe(true)
  })

  it('flags chained commands as medium risk', () => {
    const analysis = analyzeCommand('bun test && bun run lint')

    expect(analysis.kind).toBe('chain')
    expect(analysis.riskTier).toBe('medium')
    expect(analysis.requiresApproval).toBe(true)
  })
})
