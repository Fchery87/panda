import { aiSlopCleanerSkill } from './catalog'
import type { AgentSkillDefinition } from './types'

const BUILT_IN_AGENT_SKILLS: AgentSkillDefinition[] = [aiSlopCleanerSkill]

export function getBuiltInAgentSkills(): AgentSkillDefinition[] {
  return BUILT_IN_AGENT_SKILLS
}
