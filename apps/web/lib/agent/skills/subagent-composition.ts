import type { ChatMode } from '../chat-modes'
import type { AgentConfig } from '../harness/types'
import { resolveAgentSkills } from './resolver'
import type { CustomSkillForMatching, CustomSkillPolicy } from './types'

interface BuildSubagentPromptOptions {
  agent: AgentConfig
  delegatedPrompt: string
  chatMode: ChatMode
  customSkills?: CustomSkillForMatching[]
  customSkillPolicy?: CustomSkillPolicy
}

function buildAttachedSkillInstructions(args: {
  agent: AgentConfig
  customSkills: CustomSkillForMatching[]
  customSkillPolicy?: CustomSkillPolicy
}): string[] {
  const defaultSkillIds = new Set(args.agent.defaultSkillIds ?? [])
  if (defaultSkillIds.size === 0) return []
  if (args.customSkillPolicy?.allowUserSkills === false) return []

  const disabledIds = new Set(args.customSkillPolicy?.disabledSkillIds ?? [])

  return args.customSkills
    .filter((skill) => defaultSkillIds.has(skill.id))
    .filter((skill) => !disabledIds.has(skill.id))
    .filter(
      (skill) =>
        skill.profile !== 'strict_workflow' ||
        args.customSkillPolicy?.allowStrictUserSkills !== false
    )
    .map((skill) => {
      const sections = [
        `Attached custom workflow skill: ${skill.name}`,
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
      return sections.join('\n')
    })
}

export function buildSubagentSystemPrompt(options: BuildSubagentPromptOptions): string {
  const customSkills = options.customSkills ?? []
  const sections: string[] = []

  sections.push(
    '## Parent Inherited Constraints',
    'This delegated Subagent inherits the parent Run safety, permission, validation, and scope constraints. Do not weaken or ignore parent constraints.'
  )

  const attachedInstructions = buildAttachedSkillInstructions({
    agent: options.agent,
    customSkills,
    customSkillPolicy: options.customSkillPolicy,
  })

  const shouldAutoMatch = options.agent.skillAutoMatchingEnabled !== false
  const autoMatched = shouldAutoMatch
    ? resolveAgentSkills({
        chatMode: options.chatMode,
        userMessage: options.delegatedPrompt,
        customSkills,
        customSkillPolicy: options.customSkillPolicy,
      }).matches.filter(
        (match) =>
          !match.customSkillId ||
          !(options.agent.defaultSkillIds ?? []).includes(match.customSkillId)
      )
    : []

  if (attachedInstructions.length > 0 || autoMatched.length > 0) {
    sections.push(
      '',
      '## Panda Workflow Skills',
      [
        ...attachedInstructions,
        ...autoMatched.map((match) => match.skill.buildInstruction({} as never)),
      ].join('\n\n')
    )
  }

  if (options.agent.prompt) {
    sections.push('', '## Subagent Prompt', options.agent.prompt)
  }

  return sections.join('\n')
}
