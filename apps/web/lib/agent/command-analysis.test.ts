import { describe, expect, it } from 'bun:test'
import {
  analyzeCommand,
  classifyCommandFamily,
  createCommandAuditTarget,
  isCommandPipelineSafe,
  splitCommandByPipe,
} from './command-analysis'

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
    expect(analysis.reason).toContain('overwrite files')
  })

  it('flags chained commands as medium risk', () => {
    const analysis = analyzeCommand('bun test && bun run lint')

    expect(analysis.kind).toBe('chain')
    expect(analysis.riskTier).toBe('medium')
    expect(analysis.requiresApproval).toBe(true)
    expect(analysis.reason).toContain('multiple operations')
  })

  it('classifies command families for governance policy', () => {
    expect(classifyCommandFamily('bun test').family).toBe('package-manager')
    expect(classifyCommandFamily('npm install').family).toBe('package-manager')
    expect(classifyCommandFamily('curl https://example.com').family).toBe('network')
    expect(classifyCommandFamily('git status').family).toBe('git')
    expect(classifyCommandFamily('rm -rf dist').family).toBe('destructive')
    expect(classifyCommandFamily('ssh deploy@example.com').family).toBe('remote-exec')
    expect(classifyCommandFamily('mkdir output').family).toBe('filesystem-write')
    expect(classifyCommandFamily('unknown-tool --flag').family).toBe('unknown')
  })

  it('skips common command wrappers when classifying command families', () => {
    expect(classifyCommandFamily('sudo rm -rf dist')).toMatchObject({
      family: 'destructive',
      executable: 'rm',
    })
    expect(classifyCommandFamily('NODE_ENV=test bun test')).toMatchObject({
      family: 'package-manager',
      executable: 'bun',
    })
  })

  it('creates safe command audit targets without raw command text', () => {
    const command = 'curl https://example.com?token=secret'
    const target = createCommandAuditTarget(command)

    expect(target.kind).toBe('command_hash')
    expect(target.value).toContain('network:curl:')
    expect(target.value).not.toContain(command)
    expect(target.value).not.toContain('secret')
  })
})
