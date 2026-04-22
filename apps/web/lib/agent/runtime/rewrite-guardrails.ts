import type { ToolCall } from '@/lib/llm/types'
import type { PromptContext } from '../prompt-library'

const SUPPORTED_INLINE_TOOL_NAMES = new Set([
  'read_files',
  'list_directory',
  'write_files',
  'apply_patch',
  'run_command',
  'search_codebase',
  'search_code',
  'search_code_ast',
  'update_memory_bank',
  'task',
])

export function shouldRewriteDiscussResponse(content: string): boolean {
  return content.includes('```')
}

export function shouldRewriteBuildResponse(content: string): boolean {
  return content.includes('```')
}

export function shouldRetryBuildForToolUse(args: {
  promptContext: Pick<PromptContext, 'chatMode' | 'userMessage'>
  content: string
  pendingToolCalls: ToolCall[]
}): boolean {
  if (args.promptContext.chatMode !== 'build') return false
  if (args.pendingToolCalls.length > 0) return false

  const user = (args.promptContext.userMessage ?? '').toLowerCase()
  const userWantsExecution =
    /(build|implement|create|start|proceed|go ahead|let'?s do|do it|make it)/.test(user)
  if (!userWantsExecution) return false

  const looksLikePlanningOutput =
    args.content.includes('### Proposed Plan') ||
    args.content.includes('### Next Step') ||
    args.content.includes('Clarifying Questions') ||
    args.content.includes('### Risks') ||
    /I will begin by/i.test(args.content)

  return looksLikePlanningOutput
}

export function buildInlineToolCallSummary(content: string): ToolCall[] {
  const calls: ToolCall[] = []
  const patterns = [
    /\{[^{}]*"name"\s*:\s*"([^"]+)"[^{}]*"arguments"\s*:\s*(\{[\s\S]*?\})\s*\}/g,
    /\{[^{}]*"function"\s*:\s*\{[^{}]*"name"\s*:\s*"([^"]+)"[^{}]*"arguments"\s*:\s*(\{[\s\S]*?\})[^{}]*\}[^{}]*\}/g,
  ]

  for (const pattern of patterns) {
    let match: RegExpExecArray | null
    while ((match = pattern.exec(content)) !== null) {
      const name = match[1]
      const argumentsText = match[2]
      if (!SUPPORTED_INLINE_TOOL_NAMES.has(name)) continue
      try {
        JSON.parse(argumentsText)
        calls.push({
          id: `inline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: 'function',
          function: { name, arguments: argumentsText },
        })
      } catch {
        continue
      }
    }
  }

  return calls
}

export function inferPendingToolCallsFromText(content: string): ToolCall[] {
  if (!content.includes('"name"') || !content.includes('"arguments"')) {
    return []
  }
  return buildInlineToolCallSummary(content)
}

export function shouldTriggerRewrite(args: {
  promptContext: PromptContext
  content: string
  sawToolCall: boolean
}): boolean {
  if (args.promptContext.chatMode === 'plan') {
    return shouldRewriteDiscussResponse(args.content)
  }

  if (args.promptContext.chatMode !== 'build') {
    return false
  }

  return (
    shouldRewriteBuildResponse(args.content) ||
    shouldRetryBuildForToolUse({
      promptContext: args.promptContext,
      content: args.content,
      pendingToolCalls: args.sawToolCall
        ? [{ id: 'synthetic-tool', type: 'function', function: { name: 'tool', arguments: '{}' } }]
        : inferPendingToolCallsFromText(args.content),
    })
  )
}
