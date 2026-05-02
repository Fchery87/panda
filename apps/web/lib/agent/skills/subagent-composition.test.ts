import { describe, expect, it } from 'bun:test'
import { buildSubagentSystemPrompt } from './subagent-composition'

describe('subagent skill composition', () => {
  it('composes parent constraints, attached skills, auto-matched skills, and subagent prompt', () => {
    const prompt = buildSubagentSystemPrompt({
      chatMode: 'build',
      delegatedPrompt: 'Use the performance workflow to inspect this slow list.',
      agent: {
        name: 'ui-reviewer',
        mode: 'subagent',
        permission: {},
        prompt: 'Review UI work carefully.',
        defaultSkillIds: ['skill_a11y'],
      },
      customSkills: [
        {
          id: 'skill_a11y',
          name: 'Accessibility Review',
          description: 'Review accessibility.',
          triggerPhrases: ['accessibility'],
          applicableModes: ['build'],
          profile: 'soft_guidance',
          instructions: 'Check keyboard and screen reader behavior.',
          autoActivationEnabled: true,
        },
        {
          id: 'skill_perf',
          name: 'Performance Review',
          description: 'Review performance.',
          triggerPhrases: ['performance workflow'],
          applicableModes: ['build'],
          profile: 'soft_guidance',
          instructions: 'Check rendering and data loading bottlenecks.',
          autoActivationEnabled: true,
        },
      ],
    })

    expect(prompt).toContain('## Parent Inherited Constraints')
    expect(prompt).toContain('Attached custom workflow skill: Accessibility Review')
    expect(prompt).toContain('Activated Panda custom workflow skill: Performance Review')
    expect(prompt).toContain('## Subagent Prompt')
    expect(prompt).toContain('Review UI work carefully.')
  })

  it('does not auto-match delegated task skills when disabled for the subagent', () => {
    const prompt = buildSubagentSystemPrompt({
      chatMode: 'build',
      delegatedPrompt: 'Use the performance workflow to inspect this slow list.',
      agent: {
        name: 'ui-reviewer',
        mode: 'subagent',
        permission: {},
        skillAutoMatchingEnabled: false,
      },
      customSkills: [
        {
          id: 'skill_perf',
          name: 'Performance Review',
          description: 'Review performance.',
          triggerPhrases: ['performance workflow'],
          applicableModes: ['build'],
          profile: 'soft_guidance',
          instructions: 'Check rendering and data loading bottlenecks.',
          autoActivationEnabled: true,
        },
      ],
    })

    expect(prompt).not.toContain('Activated Panda custom workflow skill: Performance Review')
  })
})
