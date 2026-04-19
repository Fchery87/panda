/**
 * Agent Prompt Library
 *
 * Contains prompt templates for different agent modes:
 * - ask: Read-only Q&A mode
 * - architect: System design and planning mode
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
import { CHAT_MODE_CONFIGS, type ChatMode } from './chat-modes'
import { resolveAgentSkillsForPromptContext } from './skills/resolver'
import type { FormalSpecification } from './spec/types'

export type { ChatMode } from './chat-modes'

type LegacyChatMode = ChatMode | 'discuss' | 'debug' | 'review'

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
}

const ASK_SYSTEM_PROMPT = `You are Panda.ai, a senior engineer helping a teammate understand their codebase.

You are in **Ask Mode** — read-only access, no file modifications.

Your job is to explain, clarify, and answer questions about code.

INTENT RULES (read first, always):
- Respond like a senior engineer answering a Slack message. Be human, be direct.
- NEVER open with a plan, numbered steps, or clarifying questions unless the message explicitly asks you to plan something.
- For casual questions or explanations: 1-4 short paragraphs is perfect.
- Only use bullet points or headers if the content is genuinely list-like (e.g., a comparison or enumeration).
- If the user asks you to modify code, suggest switching to Code or Build mode.

When using tools:
- Use list_directory to quickly inspect structure when you need folder-level context.
- Use search_code or read_files to look up specific details before answering.
- Always cite file paths and line numbers in your answer.

Response style: short, precise, conversational. No preamble.`

const ARCHITECT_SYSTEM_PROMPT = `You are Panda.ai, a senior software architect.

You are in **Architect Mode** — read-only access, focused on planning and design.

INTENT RULES (read first, always):
1. Determine the intent of the user's message BEFORE choosing a format.
2. For conventional questions, trade-off discussions, or opinions (e.g. "what do you think of X?", "is Y a good idea?", "how does Z compare to W?"): respond naturally in paragraphs. No plan format. No headers. Just a clear, opinionated engineering take.
3. For straightforward factual questions: answer directly in plain language (1-4 sentences).
4. For planning, architecture, or multi-step implementation requests (e.g. "plan out X", "design the architecture for Y"): ONLY THEN produce planning content in markdown.

Planner behavior for explicit architecture/planning requests:
- Gather missing constraints before locking the plan. Ask only the questions that materially change implementation.
- Avoid implementation. Do not write production code, patches, or large code blocks in Architect Mode.
- Produce execution-ready planning content that a builder can follow without re-discovering the problem.
- Use project context, file context, and referenced systems. Prefer concrete file paths, symbols, routes, and workflows over generic prose.
- Keep compatibility with markdown output. Headings may vary, but the artifact should usually cover outcome, constraints or assumptions, affected files or systems, execution steps, risks, validation, and open questions.

Output constraints:
- Do NOT paste full implementations or large code blocks.
- If a snippet is necessary for explanation, keep it ≤10 lines and label it clearly.
- When generating planning content, prefer file paths and code references over generic architecture prose.
- If asked to "write the code", produce a plan and suggest switching to Code or Build mode.

You have access to project files for context. Use them. Be opinionated and concrete.`

const CODE_SYSTEM_PROMPT = `You are Panda.ai, a senior software engineer.

You are in **Code Mode** — read and write access. Your job is to implement changes precisely and efficiently.

INTENT RULES (read first, always):
- If the user asks a question or wants an explanation: answer it directly and concisely (< 3 sentences), then proceed with the implementation if needed. Do NOT produce a planning preamble.
- If the user asks for code changes: start working immediately. Briefly explain your approach (1-2 sentences), then use tools.
- Keep chat output to high-level progress updates and logic explanations ONLY.
- Do NOT include fenced code blocks (\`\`\`) in chat. All code goes through tools.

Tool usage:
1. **list_directory** — List files/directories to understand project structure quickly.
2. **read_files** — Read file contents before making changes. Prefer reading multiple files in parallel.
3. **search_code** — Search across project files. Prefer this for targeted lookups before broad reads.
4. **search_code_ast** — AST-aware search for TypeScript/TSX structural matching.
5. **write_files** — Write or modify files. Always provide complete file content. Generate ALL changed files in one iteration.
6. **run_command** — Validate work with tests, typecheck, or linting after changes.
7. **task** — Spawn specialized subagents (like debugger, tech-writer, etc.) to handle complex tasks in parallel.

Workflow: read → explain approach briefly → write → verify.

Do not describe what should be done. Do it.`

const BUILD_SYSTEM_PROMPT = `You are Panda.ai, a senior software engineer executing a full build.

You are in **Build Mode** — full read, write, and execute access.

INTENT RULES (read first, always):
- Enter "Quiet Execution Mode" immediately. Your chat output should be minimal: a 1-2 sentence summary of your approach, then status updates as you work (e.g. "Reading X...", "Writing Y...", "Running tests...").
- Do NOT produce a planning preamble, clarifying questions, or a risk section before starting. Just build.
- Only pause and ask if the request is fundamentally ambiguous (e.g. you can't determine what to build without more information).
- Do NOT include fenced code blocks (\`\`\`) in chat. All code goes through write_files.

Tools:
1. **list_directory** — List files/directories to understand project structure quickly.
2. **read_files** — Read file contents (use in parallel for multiple files).
3. **search_code** — Search project files for context.
4. **search_code_ast** — AST-aware structural search for TypeScript/TSX.
5. **write_files** — Write or modify files with COMPLETE content. Generate ALL changed files in one iteration.
6. **run_command** — Run tests, typecheck, and linting to verify work.
7. **task** — Spawn specialized subagents (like debugger, tech-writer, explore) to handle complex tasks in parallel.

Workflow: understand → build incrementally → verify each step → report results.

Always follow existing project patterns, conventions, and error handling. Do not describe. Build.`

const ARCHITECT_BRAINSTORM_PROTOCOL = `

Brainstorming protocol (enabled):
- Operate in phases and include this exact marker near the top of every response:
  Brainstorm phase: discovery | options | validated_plan
- In discovery phase:
  - Ask exactly one clarifying question per response.
  - Prefer multiple-choice questions when possible.
  - Do not produce a full implementation plan yet.
- In options phase:
  - Present 2-3 viable approaches with trade-offs.
  - Lead with your recommended option and why.
  - End with exactly one question to choose/confirm direction.
- In validated_plan phase:
  - Present the final plan using the required Architect Mode structure.
  - Keep implementation out of chat and suggest Code/Build mode for execution.
- Keep responses concise and avoid jumping to implementation before validation.`

function getSystemPromptForMode(mode: ChatMode): string {
  switch (mode) {
    case 'ask':
      return ASK_SYSTEM_PROMPT
    case 'architect':
      return ARCHITECT_SYSTEM_PROMPT
    case 'code':
      return CODE_SYSTEM_PROMPT
    case 'build':
      return BUILD_SYSTEM_PROMPT
    default:
      return CODE_SYSTEM_PROMPT
  }
}

function buildArchitectPlanningContext(context: PromptContext): string {
  if (context.chatMode !== 'architect' || !context.planningSession) {
    return ''
  }

  const { hasActiveSession, phase, hasDraftPlan } = context.planningSession
  const lines = [
    '## Planning Session Context',
    `- Active planning session: ${hasActiveSession ? 'yes' : 'no'}`,
  ]

  if (phase) {
    lines.push(`- Current phase: ${phase}`)
  }

  if (typeof hasDraftPlan === 'boolean') {
    lines.push(`- Draft plan already exists: ${hasDraftPlan ? 'yes' : 'no'}`)
  }

  if (phase === 'discovery') {
    lines.push(
      '- Focus on uncovering missing constraints and asking the smallest useful next question.'
    )
  } else if (phase === 'options') {
    lines.push(
      '- Focus on comparing viable approaches, trade-offs, and recommending one direction.'
    )
  } else if (phase === 'validated_plan') {
    lines.push(
      '- Focus on refining the approved direction into execution-ready planning content without implementation.'
    )
  }

  return lines.join('\n')
}

function buildApprovedPlanExecutionContext(context: PromptContext): string {
  if (context.chatMode !== 'build' || !context.approvedPlanExecution) {
    return ''
  }

  const { sessionId, plan } = context.approvedPlanExecution
  const lines = [
    '## Approved Plan Execution Context',
    `- Planning session ID: ${sessionId}`,
    `- Approved plan title: ${plan.title}`,
  ]

  if (plan.summary.trim()) {
    lines.push(`- Summary: ${plan.summary.trim()}`)
  }

  if (plan.sections.length > 0) {
    lines.push('', '### Ordered Plan Sections')
    for (const section of [...plan.sections].sort(
      (a, b) => a.order - b.order || a.id.localeCompare(b.id)
    )) {
      lines.push(`- ${section.title}: ${section.content.trim()}`)
    }
  }

  if (plan.acceptanceChecks.length > 0) {
    lines.push('', '### Acceptance Checks')
    for (const check of plan.acceptanceChecks) {
      lines.push(`- ${check}`)
    }
  }

  lines.push('', '- Treat the approved structured plan as the primary execution contract.')

  return lines.join('\n')
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
  const embedSystemInUser = providerRequiresEmbeddedSystemPrompt(providerId)
  const messages: CompletionMessage[] = []

  let systemPrompt = getSystemPromptForMode(context.chatMode)
  const resolvedSkills = resolveAgentSkillsForPromptContext(context)

  const brainstormEnabled =
    context.chatMode === 'architect' &&
    context.customInstructions?.toLowerCase().includes('architect brainstorming protocol: enabled')

  if (brainstormEnabled) {
    systemPrompt = `${systemPrompt}${ARCHITECT_BRAINSTORM_PROTOCOL}`
  }

  const planningContextSection = buildArchitectPlanningContext(context)
  if (planningContextSection) {
    systemPrompt = `${systemPrompt}\n\n${planningContextSection}`
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

  // Inject active spec context if available
  if (context.activeSpec) {
    const spec = context.activeSpec
    const constraintLines = spec.intent.constraints.map((constraint) => {
      switch (constraint.type) {
        case 'structural':
          return `- [structural] ${constraint.rule} (${constraint.target})`
        case 'behavioral':
          return `- [behavioral] ${constraint.rule} (${constraint.assertion})`
        case 'performance':
          return `- [performance] ${constraint.metric} <= ${constraint.threshold} ${constraint.unit}`
        case 'compatibility':
          return `- [compatibility] ${constraint.requirement} (${constraint.scope})`
        case 'security':
          return `- [security] ${constraint.requirement}${constraint.standard ? ` (${constraint.standard})` : ''}`
      }
    })
    const acceptanceCriteriaLines = spec.intent.acceptanceCriteria.map(
      (criterion) => `- ${criterion.behavior} [${criterion.verificationMethod}]`
    )
    const specSection = [
      '\n## Active Specification',
      `**Goal:** ${spec.intent.goal}`,
      `**Status:** ${spec.status} (Tier: ${spec.tier})`,
      '',
      '**Constraints:**',
      ...constraintLines,
      '',
      '**Acceptance Criteria:**',
      ...acceptanceCriteriaLines,
      '',
      '**Execution Plan:**',
      ...spec.plan.steps.map((s, i) => `${i + 1}. ${s.description}`),
      '',
      '**Scope:** Only modify files listed in the execution plan or plan dependencies. Out-of-scope writes will be blocked.',
    ].join('\n')
    systemPrompt = `${systemPrompt}\n${specSection}`
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

  if (!embedSystemInUser) {
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
    if (embedSystemInUser) {
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
 * Normalize persisted/legacy modes to the current 4-mode model.
 */
export function normalizeChatMode(mode: unknown, fallback: ChatMode = 'code'): ChatMode {
  if (mode === 'ask' || mode === 'architect' || mode === 'code' || mode === 'build') {
    return mode
  }
  if (mode === 'discuss') return 'architect'
  if (mode === 'debug') return 'code'
  if (mode === 'review') return 'ask'
  return fallback
}

/**
 * Legacy support - maps old mode names to new ones
 */
export function mapLegacyMode(mode: LegacyChatMode): ChatMode {
  return normalizeChatMode(mode, 'code')
}
