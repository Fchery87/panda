import type { PromptContext } from '../prompt-library'
import type { AgentSkillDefinition, AgentSkillMatch, CustomSkillForMatching, SkillMatchInput } from './types'
import { getBuiltInAgentSkills } from './registry'

function includesPhrase(value: string | undefined, phrase: string): boolean {
  return (value ?? '').toLowerCase().includes(phrase.toLowerCase())
}

function customSkillApplies(input: SkillMatchInput, skill: CustomSkillForMatching): boolean {
  if (!skill.autoActivationEnabled) return false
  if (!skill.applicableModes.includes(input.chatMode)) return false
  return skill.triggerPhrases.some(
    (phrase) =>
      includesPhrase(input.userMessage, phrase) || includesPhrase(input.customInstructions, phrase)
  )
}

function buildCustomSkillDefinition(skill: CustomSkillForMatching): AgentSkillDefinition {
  return {
    name: skill.name,
    description: skill.description,
    appliesTo: (input) => customSkillApplies(input, skill),
    buildInstruction: () => {
      const sections = [
        `Activated Panda custom workflow skill: ${skill.name}`,
        `Profile: ${skill.profile}`,
        '',
        skill.instructions,
      ]

      if (skill.checklist && skill.checklist.length > 0) {
        sections.push('', 'Checklist:', ...skill.checklist.map((item) => `- ${item}`))
      }
      if (skill.requiredValidation && skill.requiredValidation.length > 0) {
        sections.push(
          '',
          'Required validation:',
          ...skill.requiredValidation.map((item) => `- ${item}`)
        )
      }
      if (skill.suggestedSubagents && skill.suggestedSubagents.length > 0) {
        sections.push('', `Suggested Subagents: ${skill.suggestedSubagents.join(', ')}`)
      }

      return sections.join('\n')
    },
  }
}

function matchCustomAgentSkills(input: SkillMatchInput): AgentSkillMatch[] {
  const policy = input.customSkillPolicy
  if (policy?.allowUserSkills === false || policy?.allowSkillAutoActivation === false) {
    return []
  }

  const disabledIds = new Set(policy?.disabledSkillIds ?? [])

  return (input.customSkills ?? []).flatMap((customSkill) => {
    if (disabledIds.has(customSkill.id)) return []
    if (customSkill.profile === 'strict_workflow' && policy?.allowStrictUserSkills === false) {
      return []
    }
    if (!customSkillApplies(input, customSkill)) return []

    return [
      {
        skill: buildCustomSkillDefinition(customSkill),
        reason: `Matched custom skill trigger for ${customSkill.name}`,
        source: 'custom' as const,
        profile: customSkill.profile,
        customSkillId: customSkill.id,
      },
    ]
  })
}

export function matchAgentSkills(input: SkillMatchInput): AgentSkillMatch[] {
  const builtInMatches = getBuiltInAgentSkills().flatMap((skill) =>
    skill.appliesTo(input)
      ? [
          {
            skill,
            reason: `Matched by request intent for ${skill.name}`,
            source: 'built_in' as const,
          },
        ]
      : []
  )

  return [...builtInMatches, ...matchCustomAgentSkills(input)]
}

export function matchAgentSkillsForPromptContext(context: PromptContext): AgentSkillMatch[] {
  return matchAgentSkills({
    chatMode: context.chatMode,
    userMessage: context.userMessage,
    customInstructions: context.customInstructions,
    customSkills: context.customSkills,
    customSkillPolicy: context.customSkillPolicy,
  })
}
