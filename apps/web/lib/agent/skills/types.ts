import type { ChatMode, PromptContext } from '../prompt-library'

export type AgentSkillProfile = 'off' | 'soft_guidance' | 'strict_workflow'

export interface SkillMatchInput {
  chatMode: ChatMode
  userMessage?: string
  customInstructions?: string
  skillProfile?: AgentSkillProfile
  customSkills?: CustomSkillForMatching[]
  customSkillPolicy?: CustomSkillPolicy
}

export interface CustomSkillPolicy {
  allowUserSkills?: boolean
  allowSkillAutoActivation?: boolean
  allowStrictUserSkills?: boolean
  disabledSkillIds?: string[]
}

export interface CustomSkillForMatching {
  id: string
  name: string
  description: string
  triggerPhrases: string[]
  applicableModes: ChatMode[]
  profile: Exclude<AgentSkillProfile, 'off'>
  instructions: string
  checklist?: string[]
  requiredValidation?: string[]
  suggestedSubagents?: string[]
  autoActivationEnabled: boolean
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
  source?: 'built_in' | 'custom'
  profile?: Exclude<AgentSkillProfile, 'off'>
  customSkillId?: string
}

export interface ResolvedAgentSkills {
  profile: AgentSkillProfile
  matches: AgentSkillMatch[]
}
