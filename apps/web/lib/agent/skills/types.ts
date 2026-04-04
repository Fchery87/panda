import type { ChatMode, PromptContext } from '../prompt-library'

export type AgentSkillProfile = 'off' | 'soft_guidance' | 'strict_workflow'

export interface SkillMatchInput {
  chatMode: ChatMode
  userMessage?: string
  customInstructions?: string
  skillProfile?: AgentSkillProfile
}

export interface AgentSkillDefinition {
  name: string
  description: string
  appliesTo: (input: SkillMatchInput) => boolean
  buildInstruction: (context: PromptContext) => string
}

export interface AgentSkillMatch {
  skill: AgentSkillDefinition
  reason: string
}

export interface ResolvedAgentSkills {
  profile: AgentSkillProfile
  matches: AgentSkillMatch[]
}
