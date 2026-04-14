import { describe, expect, it } from 'bun:test'
import { resolveRulesForPhase } from './mode-rulesets'

describe('resolveRulesForPhase', () => {
  it('denies edit when forge phase is review', () => {
    const rules = resolveRulesForPhase('build', { forgePhase: 'review' })
    const editRule = rules.find((r) => r.capability === 'edit' && r.decision === 'deny')
    expect(editRule).toBeDefined()
    expect(editRule?.source).toBe('forge-phase:review')
  })

  it('denies exec destructive patterns during qa phase', () => {
    const rules = resolveRulesForPhase('build', { forgePhase: 'qa' })
    const execDeny = rules.find(
      (r) => r.capability === 'exec' && r.decision === 'deny' && r.pattern?.includes('rm')
    )
    expect(execDeny).toBeDefined()
  })

  it('does not deny edit during execute phase', () => {
    const rules = resolveRulesForPhase('build', { forgePhase: 'execute' })
    const forgeDeny = rules.find(
      (r) => r.capability === 'edit' && r.decision === 'deny' && r.source.startsWith('forge-phase')
    )
    expect(forgeDeny).toBeUndefined()
  })

  it('returns base rules when no forge phase provided', () => {
    const rules = resolveRulesForPhase('build', {})
    const forgeDeny = rules.find((r) => r.source.startsWith('forge-phase'))
    expect(forgeDeny).toBeUndefined()
  })
})
