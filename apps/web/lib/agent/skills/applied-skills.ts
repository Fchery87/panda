import type { AgentSkillMatch } from './types'

export interface AppliedSkillSummary {
  id: string
  name: string
  source: 'built_in' | 'custom'
  profile: 'soft_guidance' | 'strict_workflow'
  reason: string
  requiresPreflight: boolean
}

export function summarizeAppliedSkills(matches: AgentSkillMatch[]): AppliedSkillSummary[] {
  return matches.map((match) => ({
    id: match.customSkillId ?? match.skill.name,
    name: match.skill.name,
    source: match.source ?? 'built_in',
    profile: match.profile ?? 'soft_guidance',
    reason: match.reason,
    requiresPreflight: match.source === 'custom' && match.profile === 'strict_workflow',
  }))
}

export function getStrictCustomSkillPreflightSummaries(
  summaries: AppliedSkillSummary[]
): AppliedSkillSummary[] {
  return summaries.filter((summary) => summary.requiresPreflight)
}
