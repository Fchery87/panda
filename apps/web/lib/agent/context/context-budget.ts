/**
 * Context Budget Allocator
 *
 * Intelligent token budget management for LLM context windows.
 * Allocates tokens across system prompt, project context, files, and chat history.
 */

import { estimatePromptTokens } from '../../llm/token-usage'
import type { ProviderType } from '../../llm/types'

export interface ContextBudget {
  /** System prompt (~10% of window) */
  systemPrompt: number
  /** Project context including overview + memory bank (~15%) */
  projectContext: number
  /** File contents - the main working set (~40%) */
  fileContents: number
  /** Previous chat messages (~25%) */
  chatHistory: number
  /** Headroom for response (~10%) */
  reserve: number
}

export interface BudgetedContent {
  /** Full system prompt */
  systemPrompt: string
  /** Project overview + memory bank (truncated if needed) */
  projectContext: string
  /** Files with content (prioritized) + signatures + paths */
  fileContents: string
  /** Recent chat messages (truncated to budget) */
  chatHistory: string
  /** Metadata about budget usage */
  budgetUsage: {
    systemTokens: number
    projectTokens: number
    fileTokens: number
    chatTokens: number
    totalTokens: number
    filesIncluded: number
    filesWithFullContent: number
    filesWithSignatures: number
    filesWithPathsOnly: number
  }
}

export interface FileBudgetInfo {
  path: string
  content?: string
  score: number
}

export interface BudgetAllocationOptions {
  contextWindowSize: number
  systemPrompt: string
  projectOverview?: string
  memoryBank?: string
  files: FileBudgetInfo[]
  chatHistory: Array<{ role: string; content: string }>
  providerType?: ProviderType
  model?: string
}

const DEFAULT_BUDGET_RATIOS = {
  systemPrompt: 0.1,
  projectContext: 0.15,
  fileContents: 0.4,
  chatHistory: 0.25,
  reserve: 0.1,
}

/**
 * Allocate token budget across context categories
 */
export function allocateBudget(contextWindowSize: number): ContextBudget {
  return {
    systemPrompt: Math.floor(contextWindowSize * DEFAULT_BUDGET_RATIOS.systemPrompt),
    projectContext: Math.floor(contextWindowSize * DEFAULT_BUDGET_RATIOS.projectContext),
    fileContents: Math.floor(contextWindowSize * DEFAULT_BUDGET_RATIOS.fileContents),
    chatHistory: Math.floor(contextWindowSize * DEFAULT_BUDGET_RATIOS.chatHistory),
    reserve: Math.floor(contextWindowSize * DEFAULT_BUDGET_RATIOS.reserve),
  }
}

/**
 * Assemble context within budget constraints
 */
export function assembleContext(options: BudgetAllocationOptions): BudgetedContent {
  const budget = allocateBudget(options.contextWindowSize)
  const providerType = options.providerType ?? 'openai'
  const model = options.model ?? 'gpt-4o'

  // 1. System prompt (always full, but check if it exceeds budget)
  const systemTokens = estimatePromptTokens({
    providerType,
    model,
    messages: [{ role: 'system', content: options.systemPrompt }],
  })

  const systemPrompt =
    systemTokens > budget.systemPrompt
      ? truncateToTokens(options.systemPrompt, budget.systemPrompt, providerType, model)
      : options.systemPrompt

  // 2. Project context (overview + memory bank, truncated to budget)
  const projectContextParts: string[] = []
  if (options.projectOverview) {
    projectContextParts.push(`## Project Overview\n${options.projectOverview}`)
  }
  if (options.memoryBank) {
    projectContextParts.push(`## Project Memory Bank\n${options.memoryBank}`)
  }
  let projectContext = projectContextParts.join('\n\n')
  const projectTokens = estimatePromptTokens({
    providerType,
    model,
    messages: [{ role: 'system', content: projectContext }],
  })

  if (projectTokens > budget.projectContext) {
    // Prioritize overview, truncate memory bank
    if (options.projectOverview) {
      const overviewTokens = estimatePromptTokens({
        providerType,
        model,
        messages: [{ role: 'system', content: options.projectOverview }],
      })
      if (overviewTokens < budget.projectContext) {
        const remainingBudget = budget.projectContext - overviewTokens
        const truncatedMemory = options.memoryBank
          ? truncateToTokens(options.memoryBank, remainingBudget, providerType, model)
          : ''
        projectContext = `## Project Overview\n${options.projectOverview}${truncatedMemory ? `\n\n## Project Memory Bank\n${truncatedMemory}` : ''}`
      } else {
        // Overview itself is too large, truncate it
        projectContext = truncateToTokens(
          projectContext,
          budget.projectContext,
          providerType,
          model
        )
      }
    } else {
      projectContext = truncateToTokens(projectContext, budget.projectContext, providerType, model)
    }
  }

  // 3. Files (prioritized by score, with tiered content levels)
  const sortedFiles = [...options.files].sort((a, b) => b.score - a.score)
  const fileBudget = budget.fileContents
  const fileResult = assembleFilesWithinBudget(sortedFiles, fileBudget, providerType, model)

  // 4. Chat history (most recent first, truncated to budget)
  const chatBudget = budget.chatHistory
  const chatResult = assembleChatHistoryWithinBudget(
    options.chatHistory,
    chatBudget,
    providerType,
    model
  )

  const totalTokens =
    estimatePromptTokens({
      providerType,
      model,
      messages: [{ role: 'system', content: systemPrompt }],
    }) +
    estimatePromptTokens({
      providerType,
      model,
      messages: [{ role: 'system', content: projectContext }],
    }) +
    estimatePromptTokens({
      providerType,
      model,
      messages: [{ role: 'system', content: fileResult.content }],
    }) +
    estimatePromptTokens({ providerType, model, messages: chatResult.messages })

  return {
    systemPrompt,
    projectContext,
    fileContents: fileResult.content,
    chatHistory: chatResult.messages.map((m) => `${m.role}: ${m.content}`).join('\n\n'),
    budgetUsage: {
      systemTokens: estimatePromptTokens({
        providerType,
        model,
        messages: [{ role: 'system', content: systemPrompt }],
      }),
      projectTokens: estimatePromptTokens({
        providerType,
        model,
        messages: [{ role: 'system', content: projectContext }],
      }),
      fileTokens: fileResult.tokens,
      chatTokens: chatResult.tokens,
      totalTokens,
      filesIncluded: fileResult.filesIncluded,
      filesWithFullContent: fileResult.filesWithFullContent,
      filesWithSignatures: fileResult.filesWithSignatures,
      filesWithPathsOnly: fileResult.filesWithPathsOnly,
    },
  }
}

interface AssembledFilesResult {
  content: string
  tokens: number
  filesIncluded: number
  filesWithFullContent: number
  filesWithSignatures: number
  filesWithPathsOnly: number
}

function assembleFilesWithinBudget(
  files: FileBudgetInfo[],
  budget: number,
  providerType: ProviderType,
  model: string
): AssembledFilesResult {
  let currentTokens = 0
  const sections: string[] = []
  let filesIncluded = 0
  let filesWithFullContent = 0
  let filesWithSignatures = 0
  let filesWithPathsOnly = 0

  // Thresholds for content levels (based on file ranking position)
  const fullContentLimit = Math.max(5, Math.floor(files.length * 0.1))
  const signatureLimit = Math.max(15, Math.floor(files.length * 0.3))

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    let fileContent: string
    let contentLevel: 'full' | 'signature' | 'path'

    if (i < fullContentLimit && file.content) {
      // Top-ranked files: full content
      fileContent = `--- ${file.path} ---\n${file.content}`
      contentLevel = 'full'
    } else if (i < signatureLimit && file.content) {
      // Medium-ranked files: signatures only (exports, function names)
      const signatures = extractSignatures(file.content)
      if (signatures) {
        fileContent = `--- ${file.path} ---\n${signatures}`
        contentLevel = 'signature'
      } else {
        fileContent = `- ${file.path}`
        contentLevel = 'path'
      }
    } else {
      // Lower-ranked files: path only
      fileContent = `- ${file.path}`
      contentLevel = 'path'
    }

    const fileTokens = estimatePromptTokens({
      providerType,
      model,
      messages: [{ role: 'system', content: fileContent }],
    })

    if (currentTokens + fileTokens > budget && i > 0) {
      // Add a note about truncated files
      const remainingCount = files.length - i
      if (remainingCount > 0) {
        sections.push(`\n[... ${remainingCount} more files not shown due to token budget]`)
      }
      break
    }

    sections.push(fileContent)
    currentTokens += fileTokens
    filesIncluded++

    if (contentLevel === 'full') filesWithFullContent++
    else if (contentLevel === 'signature') filesWithSignatures++
    else filesWithPathsOnly++
  }

  return {
    content: sections.join('\n\n'),
    tokens: currentTokens,
    filesIncluded,
    filesWithFullContent,
    filesWithSignatures,
    filesWithPathsOnly,
  }
}

interface AssembledChatResult {
  messages: Array<{ role: string; content: string }>
  tokens: number
}

function assembleChatHistoryWithinBudget(
  messages: Array<{ role: string; content: string }>,
  budget: number,
  providerType: ProviderType,
  model: string
): AssembledChatResult {
  // Take most recent messages first
  const reversed = [...messages].reverse()
  let currentTokens = 0
  const included: Array<{ role: string; content: string }> = []

  for (const message of reversed) {
    const msgTokens = estimatePromptTokens({
      providerType,
      model,
      messages: [message],
    })

    if (currentTokens + msgTokens > budget && included.length > 0) {
      break
    }

    included.unshift(message) // Add back in original order
    currentTokens += msgTokens
  }

  return {
    messages: included,
    tokens: currentTokens,
  }
}

/**
 * Extract function/class signatures from code content
 */
function extractSignatures(content: string): string | null {
  const signatures: string[] = []

  // Match function declarations
  const functionMatches = content.match(/^(export\s+)?(async\s+)?function\s+\w+\s*\([^)]*\)/gm)
  if (functionMatches) {
    signatures.push(...functionMatches)
  }

  // Match arrow function exports
  const arrowMatches = content.match(
    /^(export\s+)?(const|let|var)\s+\w+\s*=\s*(async\s*)?\([^)]*\)\s*=>/gm
  )
  if (arrowMatches) {
    signatures.push(...arrowMatches)
  }

  // Match class declarations
  const classMatches = content.match(/^(export\s+)?class\s+\w+/gm)
  if (classMatches) {
    signatures.push(...classMatches)
  }

  // Match interface declarations
  const interfaceMatches = content.match(/^(export\s+)?interface\s+\w+/gm)
  if (interfaceMatches) {
    signatures.push(...interfaceMatches)
  }

  // Match type declarations
  const typeMatches = content.match(/^(export\s+)?type\s+\w+/gm)
  if (typeMatches) {
    signatures.push(...typeMatches)
  }

  return signatures.length > 0 ? signatures.slice(0, 10).join('\n') : null
}

/**
 * Truncate text to fit within token budget
 */
function truncateToTokens(
  text: string,
  maxTokens: number,
  providerType: ProviderType,
  model: string
): string {
  void providerType
  void model

  // Rough estimate: 1 token ≈ 4 chars
  const charsPerToken = 4
  const maxChars = maxTokens * charsPerToken

  if (text.length <= maxChars) return text

  return text.slice(0, maxChars - 50) + '\n\n[... truncated]'
}
