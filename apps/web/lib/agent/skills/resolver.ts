import type { PromptContext } from '../prompt-library'
import { matchAgentSkills } from './matcher'
import type { AgentSkillProfile, ResolvedAgentSkills, SkillMatchInput } from './types'

export function resolveAgentSkillProfile(
  profile: AgentSkillProfile | undefined
): AgentSkillProfile {
  return profile ?? 'soft_guidance'
}

export function resolveAgentSkills(input: SkillMatchInput): ResolvedAgentSkills {
  const profile = resolveAgentSkillProfile(input.skillProfile)
  if (profile === 'off') {
    return {
      profile,
      matches: [],
    }
  }

  return {
    profile,
    matches: matchAgentSkills(input),
  }
}

export function resolveAgentSkillsForPromptContext(context: PromptContext): ResolvedAgentSkills {
  return resolveAgentSkills({
    chatMode: context.chatMode,
    userMessage: context.userMessage,
    customInstructions: context.customInstructions,
    skillProfile: context.skillProfile,
  })
}
