import { describe, expect, it } from 'bun:test'
import { resolveAgentSkills } from './resolver'

describe('agent skill resolver', () => {
  it('defaults to soft_guidance profile', () => {
    const resolved = resolveAgentSkills({
      chatMode: 'build',
      userMessage: 'Cleanup this bloated AI-generated code path.',
    })

    expect(resolved.profile).toBe('soft_guidance')
    expect(resolved.matches.map((match) => match.skill.name)).toContain('ai-slop-cleaner')
  })

  it('disables skill activation when profile is off', () => {
    const resolved = resolveAgentSkills({
      chatMode: 'build',
      userMessage: 'Cleanup this bloated AI-generated code path.',
      skillProfile: 'off',
    })

    expect(resolved.profile).toBe('off')
    expect(resolved.matches).toHaveLength(0)
  })

  it('preserves matching under strict_workflow', () => {
    const resolved = resolveAgentSkills({
      chatMode: 'build',
      userMessage: 'Please refactor and deslop this duplicated code.',
      skillProfile: 'strict_workflow',
    })

    expect(resolved.profile).toBe('strict_workflow')
    expect(resolved.matches.map((match) => match.skill.name)).toContain('ai-slop-cleaner')
  })
})
