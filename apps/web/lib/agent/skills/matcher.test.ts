import { describe, expect, it } from 'bun:test'
import { matchAgentSkills } from './matcher'

describe('agent skill matcher', () => {
  it('matches ai-slop-cleaner for cleanup requests in build mode', () => {
    const matches = matchAgentSkills({
      chatMode: 'build',
      userMessage: 'Please deslop this AI-generated output and clean up the duplicate logic.',
    })

    expect(matches.map((match) => match.skill.name)).toContain('ai-slop-cleaner')
  })

  it('does not match ai-slop-cleaner for ask mode explanations', () => {
    const matches = matchAgentSkills({
      chatMode: 'ask',
      userMessage: 'Explain why this file feels repetitive.',
    })

    expect(matches.map((match) => match.skill.name)).not.toContain('ai-slop-cleaner')
  })

  it('does not match ai-slop-cleaner for ordinary implementation prompts', () => {
    const matches = matchAgentSkills({
      chatMode: 'code',
      userMessage: 'Add a new dashboard page for project analytics.',
    })

    expect(matches.map((match) => match.skill.name)).not.toContain('ai-slop-cleaner')
  })
})
