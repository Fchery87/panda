import { describe, expect, it } from 'bun:test'
import { resolveAgentSkills } from './resolver'
import { getStrictCustomSkillPreflightSummaries, summarizeAppliedSkills } from './applied-skills'

describe('applied skills metadata', () => {
  it('summarizes matched skills and flags strict custom skills for preflight', () => {
    const resolved = resolveAgentSkills({
      chatMode: 'build',
      userMessage: 'Use the TDD workflow for this bug fix and cleanup duplicate code.',
      customSkills: [
        {
          id: 'skill_tdd',
          name: 'TDD Bugfix',
          description: 'Requires a failing test first.',
          triggerPhrases: ['tdd workflow'],
          applicableModes: ['build'],
          profile: 'strict_workflow',
          instructions: 'Write a failing test before implementation.',
          autoActivationEnabled: true,
        },
      ],
    })

    const summaries = summarizeAppliedSkills(resolved.matches)

    expect(summaries).toContainEqual(
      expect.objectContaining({
        id: 'skill_tdd',
        name: 'TDD Bugfix',
        source: 'custom',
        profile: 'strict_workflow',
        requiresPreflight: true,
      })
    )
    expect(summaries).toContainEqual(
      expect.objectContaining({
        name: 'ai-slop-cleaner',
        source: 'built_in',
        requiresPreflight: false,
      })
    )
    expect(getStrictCustomSkillPreflightSummaries(summaries).map((skill) => skill.id)).toEqual([
      'skill_tdd',
    ])
  })
})
