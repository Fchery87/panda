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

  it('matches enabled custom skills by trigger phrase and mode', () => {
    const resolved = resolveAgentSkills({
      chatMode: 'build',
      userMessage: 'Please use the TDD workflow for this bug fix.',
      customSkills: [
        {
          id: 'skill_tdd',
          name: 'TDD Bugfix',
          description: 'Requires a failing test first.',
          triggerPhrases: ['tdd workflow', 'test first'],
          applicableModes: ['code', 'build'],
          profile: 'strict_workflow',
          instructions: 'Write a failing test before implementation.',
          autoActivationEnabled: true,
        },
      ],
    })

    expect(resolved.matches).toContainEqual(
      expect.objectContaining({
        customSkillId: 'skill_tdd',
        profile: 'strict_workflow',
        source: 'custom',
      })
    )
  })

  it('filters custom skills by admin policy and user disablement', () => {
    const resolved = resolveAgentSkills({
      chatMode: 'build',
      userMessage: 'Please use the strict release workflow.',
      customSkillPolicy: {
        allowUserSkills: true,
        allowSkillAutoActivation: true,
        allowStrictUserSkills: false,
        disabledSkillIds: ['skill_disabled'],
      },
      customSkills: [
        {
          id: 'skill_strict',
          name: 'Strict Release',
          description: 'Strict release workflow.',
          triggerPhrases: ['strict release workflow'],
          applicableModes: ['build'],
          profile: 'strict_workflow',
          instructions: 'Require release checks.',
          autoActivationEnabled: true,
        },
        {
          id: 'skill_disabled',
          name: 'Disabled Soft Skill',
          description: 'Disabled workflow.',
          triggerPhrases: ['strict release workflow'],
          applicableModes: ['build'],
          profile: 'soft_guidance',
          instructions: 'This should not apply.',
          autoActivationEnabled: true,
        },
      ],
    })

    expect(resolved.matches.map((match) => match.customSkillId)).not.toContain('skill_strict')
    expect(resolved.matches.map((match) => match.customSkillId)).not.toContain('skill_disabled')
  })
})
