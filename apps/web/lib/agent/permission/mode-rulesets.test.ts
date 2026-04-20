import { describe, expect, it } from 'bun:test'
import { resolveRulesForPhase, DEFAULT_RULES } from './mode-rulesets'

describe('resolveRulesForPhase', () => {
  it('returns default rules for build mode', () => {
    const rules = resolveRulesForPhase('build')
    expect(rules).toEqual(DEFAULT_RULES.build)
  })

  it('returns default rules for code mode', () => {
    const rules = resolveRulesForPhase('code')
    expect(rules).toEqual(DEFAULT_RULES.code)
  })

  it('returns default rules for ask mode', () => {
    const rules = resolveRulesForPhase('ask')
    expect(rules).toEqual(DEFAULT_RULES.ask)
  })

  it('returns default rules for plan mode', () => {
    const rules = resolveRulesForPhase('plan')
    expect(rules).toEqual(DEFAULT_RULES.plan)
  })

  it('ask mode denies all by default then allows read and search', () => {
    const rules = resolveRulesForPhase('ask')
    const denyAll = rules.find((r) => r.capability === '*' && r.decision === 'deny')
    const allowRead = rules.find((r) => r.capability === 'read' && r.decision === 'allow')
    const allowSearch = rules.find((r) => r.capability === 'search' && r.decision === 'allow')
    expect(denyAll).toBeDefined()
    expect(allowRead).toBeDefined()
    expect(allowSearch).toBeDefined()
  })

  it('build mode allows all by default but asks for rm and git push', () => {
    const rules = resolveRulesForPhase('build')
    const allowAll = rules.find((r) => r.capability === '*' && r.decision === 'allow')
    const rmAsk = rules.find(
      (r) => r.capability === 'exec' && r.decision === 'ask' && r.pattern === 'rm *'
    )
    expect(allowAll).toBeDefined()
    expect(rmAsk).toBeDefined()
  })

  it('code mode asks for edit and exec', () => {
    const rules = resolveRulesForPhase('code')
    const editAsk = rules.find((r) => r.capability === 'edit' && r.decision === 'ask')
    const execAsk = rules.find((r) => r.capability === 'exec' && r.decision === 'ask')
    expect(editAsk).toBeDefined()
    expect(execAsk).toBeDefined()
  })
})
