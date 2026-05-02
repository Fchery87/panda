/**
 * Agent Prompt Library
 *
 * Contains prompt templates for different agent modes:
 * - ask: Read-only Q&A mode
 * - plan: System design and planning mode
 * - code: Default coding mode
 * - build: Full implementation mode
 */

import type { CompletionMessage } from '../llm/types'
import type { GeneratedPlanArtifact } from '../planning/types'
import {
  assembleContext,
  type BudgetAllocationOptions,
  type FileBudgetInfo,
} from './context/context-budget'
import { CHAT_MODE_CONFIGS, buildModeTransitionRitual, type ChatMode } from './chat-modes'
import {
  ARCHITECT_BRAINSTORM_PROTOCOL,
  ARCHITECT_SYSTEM_PROMPT,
  ASK_SYSTEM_PROMPT,
  BUILD_SYSTEM_PROMPT,
  CODE_SYSTEM_PROMPT,
  IMPLEMENTATION_DISCIPLINE_CONTEXT,
  buildActiveSpecContext,
  buildApprovedPlanExecutionContext,
  buildPlanningSessionContext,
} from './prompt-modules'
import { resolveAgentSkillsForPromptContext } from './skills/resolver'
import type { CustomSkillForMatching, CustomSkillPolicy } from './skills/types'
import type { FormalSpecification } from './spec/types'

export type { ChatMode } from './chat-modes'

/**
 * Mode configuration
 * Note: structural tool permissions are enforced by the capability-based
 * rule system in lib/agent/permission/mode-rulesets.ts, wired through the
 * harness runtime config (chatMode + permissionRules fields).
 */
export interface ModeConfig {
  description: string
  fileAccess: 'read-only' | 'read-write'
}

export const MODE_CONFIGS: Record<ChatMode, ModeConfig> = Object.fromEntries(
  (
    Object.entries(CHAT_MODE_CONFIGS) as Array<[ChatMode, (typeof CHAT_MODE_CONFIGS)[ChatMode]]>
  ).map(([mode, config]) => [
    mode,
    {
      description: config.description,
      fileAccess: config.fileAccess,
    },
  ])
) as Record<ChatMode, ModeConfig>

/**
 * Context for prompt generation
 */
export interface PromptContext {
  projectId: string
  chatId: string
  userId: string
  projectName?: string
  projectDescription?: string
  /** Persistent project-level memory bank content (MEMORY_BANK.md) */
  memoryBank?: string
  /** Auto-generated project overview for context injection */
  projectOverview?: string
  files?: Array<{
    path: string
    content?: string
    score?: number
  }>
  chatMode: ChatMode
  provider?: string
  previousMessages?: CompletionMessage[]
  userMessage?: string
  customInstructions?: string
  /** Session summary from previous chat context for handoff */
  sessionSummary?: string
  /** Context window size for token budget allocation (defaults to 128000) */
  contextWindowSize?: number
  /** LLM provider type for token estimation */
  providerType?:
    | 'openai'
    | 'anthropic'
    | 'openrouter'
    | 'together'
    | 'zai'
    | 'chutes'
    | 'deepseek'
    | 'groq'
    | 'fireworks'
    | 'custom'
  /** Model name for token estimation */
  model?: string
  /** Optional workflow skill profile */
  skillProfile?: 'off' | 'soft_guidance' | 'strict_workflow'
  /** User-scoped custom skills available for prompt matching */
  customSkills?: CustomSkillForMatching[]
  /** Admin and user policy for custom skill activation */
  customSkillPolicy?: CustomSkillPolicy
  /** Active specification for execution awareness */
  activeSpec?: FormalSpecification
  planningSession?: {
    hasActiveSession: boolean
    phase?: 'discovery' | 'options' | 'validated_plan'
    hasDraftPlan?: boolean
  }
  approvedPlanExecution?: {
    sessionId: string
    plan: {
      title: string
      summary: string
      acceptanceChecks: string[]
      sections: Array<{
        id: string
        title: string
        content: string
        order: number
      }>
    }
  }
  modeTransition?: {
    fromMode?: ChatMode | null
    approvedPlanId?: string | null
    activeSpecId?: string | null
  }
}

function getSystemPromptForMode(mode: ChatMode): string {
  switch (mode) {
    case 'ask':
      return ASK_SYSTEM_PROMPT
    case 'plan':
      return ARCHITECT_SYSTEM_PROMPT
    case 'code':
      return CODE_SYSTEM_PROMPT
    case 'build':
      return BUILD_SYSTEM_PROMPT
    default:
      return CODE_SYSTEM_PROMPT
  }
}

export function buildHandoffSystemMessage(args: { plan: GeneratedPlanArtifact }): string {
  const ritual = CHAT_MODE_CONFIGS.code.handoffRitual?.systemMessage ?? ''
  const planText = [...args.plan.sections]
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    .map((s) => `## ${s.title}\n${s.content}`)
    .join('\n\n')

  return [ritual, '', '---', '## Approved Plan', planText].join('\n')
}

/**
 * Check if provider requires system prompt to be embedded in user message
 * Some providers (Z.ai, some OpenRouter models, etc.) don't support separate system role
 */
function providerRequiresEmbeddedSystemPrompt(providerId: string | undefined): boolean {
  if (!providerId) return false
  const lower = providerId.toLowerCase()
  return (
    lower === 'zai' ||
    lower === 'z.ai' ||
    lower.includes('zai') ||
    lower.includes('arcee') ||
    lower.includes('deepinfra') ||
    lower.includes('fireworks')
  )
}

/**
 * Get prompt for a specific mode
 */
export function getPromptForMode(context: PromptContext): CompletionMessage[] {
  const providerId = context.provider?.toLowerCase()
  const shouldEmbedSystemPrompt = providerRequiresEmbeddedSystemPrompt(providerId)
  const messages: CompletionMessage[] = []

  let systemPrompt = getSystemPromptForMode(context.chatMode)
  if (context.chatMode === 'code' || context.chatMode === 'build') {
    systemPrompt = `${systemPrompt}\n\n${IMPLEMENTATION_DISCIPLINE_CONTEXT}`
  }
  if (context.chatMode === 'code' || context.chatMode === 'build') {
    const ritual = buildModeTransitionRitual({
      fromMode: context.modeTransition?.fromMode ?? null,
      toMode: context.chatMode,
      approvedPlanId:
        context.modeTransition?.approvedPlanId ?? context.approvedPlanExecution?.sessionId ?? null,
      activeSpecId: context.modeTransition?.activeSpecId ?? context.activeSpec?.id ?? null,
    })
    systemPrompt = `${systemPrompt}\n\n## Mode Transition Ritual\n${ritual.systemMessage}`
  }

  const resolvedSkills = resolveAgentSkillsForPromptContext(context)

  const brainstormEnabled =
    context.chatMode === 'plan' &&
    context.customInstructions?.toLowerCase().includes('architect brainstorming protocol: enabled')

  if (brainstormEnabled) {
    systemPrompt = `${systemPrompt}${ARCHITECT_BRAINSTORM_PROTOCOL}`
  }

  const planningContextSection = buildPlanningSessionContext(context)
  if (planningContextSection) {
    systemPrompt = `${systemPrompt}\n\n${planningContextSection}`
  }

  const activeSpecSection = buildActiveSpecContext(context)
  if (activeSpecSection) {
    systemPrompt = `${systemPrompt}\n\n${activeSpecSection}`
  }

  const approvedPlanExecutionSection = buildApprovedPlanExecutionContext(context)
  if (approvedPlanExecutionSection) {
    systemPrompt = `${systemPrompt}\n\n${approvedPlanExecutionSection}`
  }

  if (resolvedSkills.matches.length > 0) {
    const skillSection = resolvedSkills.matches
      .map((match) => match.skill.buildInstruction(context))
      .join('\n\n')
    systemPrompt = `${systemPrompt}\n\n## Panda Workflow Skills\n${skillSection}`
  }

  let contextContent = ''

  // Use context budget allocation when window size is provided
  if (context.contextWindowSize && context.contextWindowSize > 0) {
    const fileBudgetInfo: FileBudgetInfo[] =
      context.files?.map((f) => ({
        path: f.path,
        content: f.content,
        score: f.score ?? 0.5,
      })) ?? []

    const chatHistory =
      context.previousMessages?.map((m) => ({
        role: m.role,
        content: m.content,
      })) ?? []

    const budgetOptions: BudgetAllocationOptions = {
      contextWindowSize: context.contextWindowSize,
      systemPrompt,
      projectOverview: context.projectOverview,
      memoryBank: context.memoryBank,
      files: fileBudgetInfo,
      chatHistory,
      providerType: context.providerType ?? 'openai',
      model: context.model ?? 'gpt-4o',
    }

    const budgetedContent = assembleContext(budgetOptions)

    // Build context content from budgeted results
    const parts: string[] = []
    if (context.projectName) {
      parts.push(`Project: ${context.projectName}`)
    }
    if (context.projectDescription) {
      parts.push(`Description: ${context.projectDescription}`)
    }
    if (budgetedContent.projectContext) {
      parts.push(budgetedContent.projectContext)
    }
    if (context.sessionSummary) {
      parts.push(`\n## Previous Session Context\n${context.sessionSummary}`)
    }
    if (budgetedContent.fileContents) {
      const isReadOnly = MODE_CONFIGS[context.chatMode].fileAccess === 'read-only'
      if (isReadOnly) {
        parts.push('\nRelevant files:\n' + budgetedContent.fileContents)
      } else {
        parts.push('\nCurrent files in project:\n' + budgetedContent.fileContents)
      }
    }

    contextContent = parts.join('\n')
  } else {
    // Legacy context assembly without budget
    if (context.projectName) {
      contextContent += `Project: ${context.projectName}\n`
    }
    if (context.projectDescription) {
      contextContent += `Description: ${context.projectDescription}\n`
    }
    if (context.projectOverview) {
      contextContent += `\n## Project Overview\n${context.projectOverview}\n`
    }
    if (context.memoryBank) {
      contextContent += `\n## Project Memory Bank\n${context.memoryBank}\n`
    }
    if (context.sessionSummary) {
      contextContent += `\n## Previous Session Context\n${context.sessionSummary}\n`
    }
    if (context.files && context.files.length > 0) {
      const isReadOnly = MODE_CONFIGS[context.chatMode].fileAccess === 'read-only'
      if (isReadOnly) {
        contextContent += '\nRelevant files:\n'
        contextContent += context.files
          .map((f) => `- ${f.path}${f.content ? `\n\`\`\`\n${f.content}\n\`\`\`` : ''}`)
          .join('\n\n')
      } else {
        contextContent += '\nCurrent files in project:\n'
        context.files.forEach((f) => {
          contextContent += `\n--- ${f.path} ---\n`
          if (f.content) {
            contextContent += f.content
          } else {
            contextContent += '[File content not loaded]'
          }
        })
      }
    }
  }

  if (!shouldEmbedSystemPrompt) {
    messages.push({
      role: 'system',
      content: systemPrompt,
    })
    if (contextContent) {
      messages.push({
        role: 'system',
        content: contextContent,
      })
    }
  }

  if (context.previousMessages && context.previousMessages.length > 0) {
    messages.push(...context.previousMessages)
  }

  if (context.userMessage) {
    if (shouldEmbedSystemPrompt) {
      const systemBlock = contextContent ? `${systemPrompt}\n\n${contextContent}` : systemPrompt
      const userBlock = `System:\n${systemBlock}\n\nUser:\n${context.userMessage}`
      messages.push({
        role: 'user',
        content: userBlock,
      })
    } else {
      messages.push({
        role: 'user',
        content: context.userMessage,
      })
    }
  }

  return messages
}

/**
 * Get system prompt only (for initial setup)
 */
export function getSystemPrompt(mode: ChatMode): string {
  return getSystemPromptForMode(mode)
}

/**
 * Normalize runtime chat modes.
 */
export function normalizeChatMode(mode: unknown, fallback: ChatMode = 'code'): ChatMode {
  if (mode === 'ask' || mode === 'plan' || mode === 'code' || mode === 'build') {
    return mode
  }
  return fallback
}
