import type { PromptContext } from '../prompt-library'
import type { AgentSkillMatch, SkillMatchInput } from './types'
import { getBuiltInAgentSkills } from './registry'

export function matchAgentSkills(input: SkillMatchInput): AgentSkillMatch[] {
  return getBuiltInAgentSkills().flatMap((skill) =>
    skill.appliesTo(input) ? [{ skill, reason: `Matched by request intent for ${skill.name}` }] : []
  )
}

export function matchAgentSkillsForPromptContext(context: PromptContext): AgentSkillMatch[] {
  return matchAgentSkills({
    chatMode: context.chatMode,
    userMessage: context.userMessage,
    customInstructions: context.customInstructions,
  })
}
