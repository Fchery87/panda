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
import {
  assembleContext,
  type BudgetAllocationOptions,
  type FileBudgetInfo,
} from './context/context-budget'

export type ChatMode = 'ask' | 'architect' | 'code' | 'build'
type LegacyChatMode = ChatMode | 'discuss' | 'debug' | 'review'

/**
 * Mode configuration
 * Note: allowedTools are defined in tools.ts:getAllowedToolsForMode()
 * to maintain a single source of truth for tool permissions.
 */
export interface ModeConfig {
  description: string
  fileAccess: 'read-only' | 'read-write'
}

export const MODE_CONFIGS: Record<ChatMode, ModeConfig> = {
  ask: {
    description: 'Read-only Q&A without modifications',
    fileAccess: 'read-only',
  },
  architect: {
    description: 'System design and planning',
    fileAccess: 'read-only',
  },
  code: {
    description: 'Default implementation mode',
    fileAccess: 'read-write',
  },
  build: {
    description: 'Full implementation',
    fileAccess: 'read-write',
  },
}

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
4. For planning, architecture, or multi-step implementation requests (e.g. "plan out X", "design the architecture for Y"): ONLY THEN produce or update the plan artifact below.

Plan artifact format (for explicit architecture/planning requests only):
## Goal
- One short statement of the desired outcome

## Clarifications
- 0-2 bullets; only questions or assumptions that materially affect implementation

## Relevant Files
- File paths, symbols, routes, or systems likely impacted

## Implementation Plan
1. Ordered steps to execute

## Risks
- Trade-offs, regressions, unknowns

## Validation
- Checks, tests, or acceptance steps

## Open Questions
- Remaining unresolved questions, or "None"

Output constraints:
- Do NOT paste full implementations or large code blocks.
- If a snippet is necessary for explanation, keep it ≤10 lines and label it clearly.
- When generating a plan artifact, prefer file paths and code references over generic architecture prose.
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

  const brainstormEnabled =
    context.chatMode === 'architect' &&
    context.customInstructions?.toLowerCase().includes('architect brainstorming protocol: enabled')

  if (brainstormEnabled) {
    systemPrompt = `${systemPrompt}${ARCHITECT_BRAINSTORM_PROTOCOL}`
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
