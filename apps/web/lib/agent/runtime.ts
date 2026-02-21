/**
 * Agent Runtime
 *
 * Core runtime for executing agent tasks with streaming support.
 * Manages the conversation loop, tool execution, and response streaming.
 */

import type {
  LLMProvider,
  CompletionMessage,
  CompletionOptions,
  ToolCall,
  ReasoningOptions,
} from '../llm/types'
import { getDefaultProviderCapabilities } from '../llm/types'
import type { PromptContext } from './prompt-library'
import type { ToolContext, ToolExecutionResult } from './tools'
import { getPromptForMode } from './prompt-library'
import { getToolsForMode, executeTool } from './tools'

/**
 * Runtime options for agent execution
 */
export interface RuntimeOptions {
  provider: LLMProvider
  model?: string
  maxIterations?: number
  temperature?: number
  maxTokens?: number
  reasoning?: ReasoningOptions
}

/**
 * Agent event types for streaming
 */
export type AgentEventType =
  | 'status_thinking'
  | 'reasoning'
  // Backward compatibility for existing hook switch statements.
  | 'thinking'
  | 'progress_step'
  | 'text'
  | 'tool_call'
  | 'tool_result'
  | 'reset'
  | 'error'
  | 'complete'

/**
 * Agent event for streaming
 */
export interface AgentEvent {
  type: AgentEventType
  content?: string
  progressStatus?: 'running' | 'completed' | 'error'
  progressCategory?: 'analysis' | 'rewrite' | 'tool' | 'complete'
  progressToolName?: string
  progressArgs?: Record<string, unknown>
  progressDurationMs?: number
  progressError?: string
  progressHasArtifactTarget?: boolean
  reasoningContent?: string
  toolCall?: ToolCall
  toolResult?: ToolExecutionResult
  resetReason?: 'plan_mode_rewrite' | 'build_mode_rewrite'
  error?: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

/**
 * Agent runtime state
 */
interface RuntimeState {
  messages: CompletionMessage[]
  iteration: number
  toolResults: ToolExecutionResult[]
  isComplete: boolean
  // Track executed tool calls for deduplication
  executedToolCalls: Set<string>
  // Track tool call patterns to prevent loops
  toolCallHistory: string[]
}

/**
 * Runtime configuration options
 */
export interface RuntimeConfig {
  maxIterations?: number
  maxToolCallsPerIteration?: number
  enableToolDeduplication?: boolean
  toolLoopThreshold?: number
}

/**
 * Generate a hash for a tool call to detect duplicates
 */
function hashToolCall(toolCall: ToolCall): string {
  return `${toolCall.function.name}:${toolCall.function.arguments}`
}

function buildToolCallPattern(toolCalls: ToolCall[]): string {
  return toolCalls.map((toolCall) => hashToolCall(toolCall)).join('||')
}

function summarizeToolCallNames(toolCalls: ToolCall[]): string {
  const names = Array.from(new Set(toolCalls.map((toolCall) => toolCall.function.name)))
  return names.join(', ')
}

export function shouldRewriteDiscussResponse(content: string): boolean {
  // Claude Code Plan Mode expectation: no large code blocks / no fenced implementations.
  // For now we treat fenced code blocks as a hard violation and trigger a single rewrite pass.
  return content.includes('```')
}

export function shouldRewriteBuildResponse(content: string): boolean {
  // Build Mode expectation (Claude Code-style): code changes should go through tools/artifacts,
  // and the chat panel should not contain large code blocks.
  // For now we treat fenced code blocks as a hard violation and trigger a single rewrite pass.
  return content.includes('```')
}

function shouldRetryBuildForToolUse(args: {
  promptContext: PromptContext
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

function extractInlineToolCalls(content: string): {
  cleanedContent: string
  toolCalls: ToolCall[]
} {
  const toolCalls: ToolCall[] = []
  const toolCallIds = new Set<string>()

  const validToolNames = [
    'read_files',
    'write_files',
    'run_command',
    'search_code',
    'search_code_ast',
    'update_memory_bank',
  ]

  const patterns = [
    /\{[^{}]*"name"\s*:\s*"([^"]+)"[^{}]*"arguments"\s*:\s*(\{[\s\S]*?\})\s*\}/g,
    /\{[^{}]*"function"\s*:\s*\{[^{}]*"name"\s*:\s*"([^"]+)"[^{}]*"arguments"\s*:\s*(\{[\s\S]*?\})[^{}]*\}[^{}]*\}/g,
    /```json\s*\n?\s*(\{[\s\S]*?"name"\s*:\s*"([^"]+)"[\s\S]*?"arguments"\s*:\s*(\{[\s\S]*?\})[\s\S]*?\})\s*\n?\s*```/g,
  ]

  const extractFromMatch = (toolName: string, argsStr: string, _fullMatch: string): boolean => {
    if (!validToolNames.includes(toolName)) return false

    try {
      const args = JSON.parse(argsStr)
      const id = `inline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

      if (toolCallIds.has(id)) return false
      toolCallIds.add(id)

      const toolCall: ToolCall = {
        id,
        type: 'function',
        function: {
          name: toolName,
          arguments: JSON.stringify(args),
        },
      }
      toolCalls.push(toolCall)
      return true
    } catch {
      return false
    }
  }

  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(content)) !== null) {
      if (pattern.source.includes('```json')) {
        extractFromMatch(match[2], match[3], match[0])
      } else {
        extractFromMatch(match[1], match[2], match[0])
      }
    }
  }

  let cleanedContent = content

  if (toolCalls.length > 0) {
    for (const pattern of patterns) {
      cleanedContent = cleanedContent.replace(pattern, '')
    }
    cleanedContent = cleanedContent
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/^[\s\n]+|[\s\n]+$/g, '')
      .trim()
  }

  return { cleanedContent, toolCalls }
}

/**
 * Agent Runtime - manages agent execution
 */
export class AgentRuntime {
  private options: RuntimeOptions
  private toolContext: ToolContext

  constructor(options: RuntimeOptions, toolContext: ToolContext) {
    this.options = options
    this.toolContext = toolContext
  }

  /**
   * Run the agent with streaming output
   * This is a generator that yields events as they occur
   */
  async *run(promptContext: PromptContext, config?: RuntimeConfig): AsyncGenerator<AgentEvent> {
    // Initialize state
    const state: RuntimeState = {
      messages: getPromptForMode(promptContext),
      iteration: 0,
      toolResults: [],
      isComplete: false,
      executedToolCalls: new Set(),
      toolCallHistory: [],
    }

    if (!state.messages || state.messages.length === 0) {
      yield {
        type: 'error',
        error: 'Invalid prompt: messages must not be empty (no user message provided).',
      }
      return
    }

    const maxIterations = this.options.maxIterations ?? config?.maxIterations ?? 10
    const maxToolCallsPerIteration = config?.maxToolCallsPerIteration ?? 5
    const enableDeduplication = config?.enableToolDeduplication ?? true
    const toolLoopThreshold = config?.toolLoopThreshold ?? 3
    const model = this.options.model ?? 'gpt-4o'
    const providerCapabilities =
      this.options.provider.config.capabilities ??
      getDefaultProviderCapabilities(this.options.provider.config.provider)

    try {
      // Main agent loop
      while (state.iteration < maxIterations && !state.isComplete) {
        state.iteration++

        // Yield thinking event
        yield {
          type: 'status_thinking',
          content: `Iteration ${state.iteration}: Generating response...`,
        }
        yield {
          type: 'progress_step',
          content: `Iteration ${state.iteration}: analyzing context and drafting response`,
          progressStatus: 'running',
          progressCategory: 'analysis',
        }

        // Create completion options
        const completionOptions: CompletionOptions = {
          model,
          messages: state.messages,
          temperature: this.options.temperature ?? 0.7,
          maxTokens: this.options.maxTokens,
          tools: getToolsForMode(promptContext.chatMode),
          stream: true,
          ...(providerCapabilities.supportsReasoning && this.options.reasoning
            ? { reasoning: this.options.reasoning }
            : {}),
        }

        // Stream the completion
        let fullContent = ''
        let pendingToolCalls: ToolCall[] = []
        let usage:
          | { promptTokens: number; completionTokens: number; totalTokens: number }
          | undefined
        let didPlanModeRewrite = false
        let didBuildModeRewrite = false
        let buildRewriteTriggeredDuringStream = false
        let planRewriteTriggeredDuringStream = false

        for await (const chunk of this.options.provider.completionStream(completionOptions)) {
          // Handle different chunk types
          switch (chunk.type) {
            case 'text':
              if (chunk.content) {
                // In Build mode, prevent fenced code blocks from ever streaming into the UI.
                // If we detect a code fence, stop streaming and do a single rewrite pass that uses tools/artifacts.
                if (promptContext.chatMode === 'build') {
                  const combined = fullContent + chunk.content
                  const fenceIndex = combined.indexOf('```')
                  if (fenceIndex !== -1) {
                    const safePrefixLen = Math.max(0, fenceIndex - fullContent.length)
                    if (safePrefixLen > 0) {
                      const safe = chunk.content.slice(0, safePrefixLen)
                      fullContent += safe
                      yield { type: 'text', content: safe }
                    }
                    buildRewriteTriggeredDuringStream = true
                    break
                  }
                }

                // In Architect mode, prevent fenced code blocks from ever streaming into the UI.
                // If we detect a code fence, stop streaming and do a single rewrite pass into plan format.
                if (promptContext.chatMode === 'architect') {
                  const combined = fullContent + chunk.content
                  const fenceIndex = combined.indexOf('```')
                  if (fenceIndex !== -1) {
                    const safePrefixLen = Math.max(0, fenceIndex - fullContent.length)
                    if (safePrefixLen > 0) {
                      const safe = chunk.content.slice(0, safePrefixLen)
                      fullContent += safe
                      yield { type: 'text', content: safe }
                    }
                    planRewriteTriggeredDuringStream = true
                    break
                  }
                }

                fullContent += chunk.content
                yield { type: 'text', content: chunk.content }
              }
              break
            case 'status_thinking':
              yield {
                type: 'status_thinking',
                content: chunk.content,
              }
              break
            case 'reasoning':
              if (chunk.reasoningContent || chunk.content) {
                yield {
                  type: 'reasoning',
                  reasoningContent: chunk.reasoningContent ?? chunk.content,
                }
              }
              break

            case 'tool_call':
              if (chunk.toolCall) {
                pendingToolCalls.push(chunk.toolCall)
                yield {
                  type: 'tool_call',
                  toolCall: chunk.toolCall,
                }
              }
              break

            case 'finish':
              if (chunk.usage) {
                usage = chunk.usage
              }
              break

            case 'error':
              yield {
                type: 'error',
                error: chunk.error ?? 'Unknown error during streaming',
              }
              return
          }

          if (buildRewriteTriggeredDuringStream) {
            // Stop consuming the provider stream early to avoid leaking more code.
            break
          }
          if (planRewriteTriggeredDuringStream) {
            // Stop consuming the provider stream early to avoid leaking more code.
            break
          }
        }

        // Claude Code-style Plan Mode enforcement:
        // If the model outputs code in architect mode, do one automatic rewrite pass into plan format.
        if (
          promptContext.chatMode === 'architect' &&
          !didPlanModeRewrite &&
          (planRewriteTriggeredDuringStream || shouldRewriteDiscussResponse(fullContent))
        ) {
          didPlanModeRewrite = true

          yield {
            type: 'status_thinking',
            content: 'Plan Mode: rewriting response into a plan (no code)…',
          }
          yield {
            type: 'progress_step',
            content: 'Plan mode guardrail triggered: rewriting response into plan format',
            progressStatus: 'running',
            progressCategory: 'rewrite',
          }
          yield { type: 'reset', resetReason: 'plan_mode_rewrite' }

          const retryMessages: CompletionMessage[] = [
            ...state.messages,
            {
              role: 'user',
              content:
                'Rewrite your previous answer into Plan Mode format. Do not include any fenced code blocks. ' +
                'Follow the required Plan Mode structure (clarifying questions, proposed plan, risks, next step). ' +
                `\n\nPrevious answer:\n${fullContent}`,
            },
          ]

          const retryOptions: CompletionOptions = {
            ...completionOptions,
            messages: retryMessages,
            // No tools in architect mode anyway, but keep explicit.
            tools: undefined,
          }

          fullContent = ''
          pendingToolCalls = []
          usage = undefined

          for await (const chunk of this.options.provider.completionStream(retryOptions)) {
            switch (chunk.type) {
              case 'text':
                if (chunk.content) {
                  fullContent += chunk.content
                  yield { type: 'text', content: chunk.content }
                }
                break
              case 'finish':
                if (chunk.usage) usage = chunk.usage
                break
              case 'error':
                yield { type: 'error', error: chunk.error ?? 'Unknown error during streaming' }
                return
              // Ignore tool events in plan rewrite (should not happen)
              default:
                break
            }
          }
        }

        // Claude Code-style Build Mode enforcement:
        // If the model dumps code blocks into chat OR "plans" without any tool calls when the user asked to build,
        // do one automatic rewrite pass that uses tools/artifacts.
        if (
          promptContext.chatMode === 'build' &&
          !didBuildModeRewrite &&
          (buildRewriteTriggeredDuringStream ||
            shouldRewriteBuildResponse(fullContent) ||
            shouldRetryBuildForToolUse({
              promptContext,
              content: fullContent,
              pendingToolCalls,
            }))
        ) {
          didBuildModeRewrite = true

          yield {
            type: 'status_thinking',
            content: 'Build Mode: rewriting response to use artifacts (no code blocks)…',
          }
          yield {
            type: 'progress_step',
            content: 'Build mode guardrail triggered: rewriting response to execute via tools',
            progressStatus: 'running',
            progressCategory: 'rewrite',
          }
          yield { type: 'reset', resetReason: 'build_mode_rewrite' }

          const retryMessages: CompletionMessage[] = [
            ...state.messages,
            {
              role: 'user',
              content:
                'Your previous answer included fenced code blocks, which are not allowed in Build Mode. ' +
                'If you only provided a plan without using tools, you must now EXECUTE the plan. ' +
                'Redo the work using tools only:\n' +
                '- Use search_code or search_code_ast to locate relevant code quickly.\n' +
                '- Use read_files to inspect context as needed.\n' +
                '- Use write_files to apply code changes (complete file contents).\n' +
                '- Use run_command to validate.\n' +
                'In chat, output only a short summary and next steps. Do not include any fenced code blocks.\n\n' +
                `Previous answer:\n${fullContent}`,
            },
          ]

          const retryOptions: CompletionOptions = {
            ...completionOptions,
            messages: retryMessages,
            tools: getToolsForMode(promptContext.chatMode),
          }

          fullContent = ''
          pendingToolCalls = []
          usage = undefined

          for await (const chunk of this.options.provider.completionStream(retryOptions)) {
            switch (chunk.type) {
              case 'text':
                if (chunk.content) {
                  fullContent += chunk.content
                  yield { type: 'text', content: chunk.content }
                }
                break
              case 'tool_call':
                if (chunk.toolCall) {
                  pendingToolCalls.push(chunk.toolCall)
                  yield { type: 'tool_call', toolCall: chunk.toolCall }
                }
                break
              case 'finish':
                if (chunk.usage) usage = chunk.usage
                break
              case 'error':
                yield { type: 'error', error: chunk.error ?? 'Unknown error during streaming' }
                return
              default:
                break
            }
          }
        }

        // Detect and extract inline tool calls (models that output tool calls as text JSON)
        // This happens when models don't properly support function calling
        if (
          pendingToolCalls.length === 0 &&
          fullContent.includes('"name"') &&
          fullContent.includes('"arguments"')
        ) {
          const extracted = extractInlineToolCalls(fullContent)
          if (extracted.toolCalls.length > 0) {
            fullContent = extracted.cleanedContent
            pendingToolCalls = extracted.toolCalls
            yield {
              type: 'status_thinking',
              content: `Detected ${extracted.toolCalls.length} inline tool call(s) in response`,
            }
            for (const tc of extracted.toolCalls) {
              yield { type: 'tool_call', toolCall: tc }
            }
          }
        }

        // Check for empty response - this can happen if the provider doesn't support tools
        // or if there's an API issue that didn't trigger an error event
        if (!fullContent.trim() && pendingToolCalls.length === 0) {
          console.error('[runtime] Empty response detected - no content and no tool calls')
          yield {
            type: 'error',
            error:
              'Model produced no output. This may indicate:\n' +
              '1. The provider (Z.ai) does not support tools/function calling\n' +
              '2. The API endpoint is not responding correctly\n' +
              '3. The model configuration is incompatible\n\n' +
              'Try using Plan mode (no tools) or switching to a different provider.',
          }
          state.isComplete = true
          break
        }

        // Add assistant message to history
        const assistantMessage: CompletionMessage = {
          role: 'assistant',
          content: fullContent,
          ...(pendingToolCalls.length > 0 && { tool_calls: pendingToolCalls }),
        }
        state.messages.push(assistantMessage)

        // Handle tool calls if any
        if (pendingToolCalls.length > 0) {
          // Limit tool calls per iteration to prevent abuse
          if (pendingToolCalls.length > maxToolCallsPerIteration) {
            yield {
              type: 'status_thinking',
              content: `Limiting to ${maxToolCallsPerIteration} tool calls out of ${pendingToolCalls.length} requested...`,
            }
            pendingToolCalls = pendingToolCalls.slice(0, maxToolCallsPerIteration)
          }

          // Deduplicate tool calls
          if (enableDeduplication) {
            const uniqueToolCalls: ToolCall[] = []
            for (const toolCall of pendingToolCalls) {
              const toolHash = hashToolCall(toolCall)

              if (state.executedToolCalls.has(toolHash)) {
                yield {
                  type: 'status_thinking',
                  content: `Skipping duplicate tool call: ${toolCall.function.name}`,
                }
                continue
              }

              uniqueToolCalls.push(toolCall)
              state.executedToolCalls.add(toolHash)
            }
            pendingToolCalls = uniqueToolCalls
          }

          // Track tool call patterns for loop detection using full call signatures
          // (name + arguments), not just tool names.
          // This avoids false positives for legitimate repeated tools with different targets.
          const currentToolPattern = buildToolCallPattern(pendingToolCalls)
          state.toolCallHistory.push(currentToolPattern)

          // Detect repeated identical tool call batches across recent iterations.
          if (state.toolCallHistory.length >= toolLoopThreshold) {
            const recentPatterns = state.toolCallHistory.slice(-toolLoopThreshold)
            if (recentPatterns.every((pattern) => pattern === recentPatterns[0])) {
              const toolSummary = summarizeToolCallNames(pendingToolCalls)
              yield {
                type: 'error',
                error:
                  `Detected repeated identical tool calls: ${toolSummary || 'unknown tools'}. ` +
                  'Stopping to prevent infinite iteration.',
              }
              state.isComplete = true
              break
            }
          }

          // Execute each tool call
          for (const toolCall of pendingToolCalls) {
            yield {
              type: 'status_thinking',
              content: `Executing tool: ${toolCall.function.name}...`,
            }
            yield {
              type: 'progress_step',
              content: `Executing tool: ${toolCall.function.name}`,
              progressStatus: 'running',
              progressCategory: 'tool',
              progressToolName: toolCall.function.name,
              progressHasArtifactTarget:
                toolCall.function.name === 'write_files' ||
                toolCall.function.name === 'run_command',
              progressArgs: (() => {
                try {
                  return JSON.parse(toolCall.function.arguments) as Record<string, unknown>
                } catch {
                  return undefined
                }
              })(),
            }

            const result = await executeTool(toolCall, this.toolContext)
            state.toolResults.push(result)

            yield {
              type: 'tool_result',
              toolResult: result,
            }
            yield {
              type: 'progress_step',
              content: result.error
                ? `Tool failed: ${toolCall.function.name}`
                : `Tool completed: ${toolCall.function.name}`,
              progressStatus: result.error ? 'error' : 'completed',
              progressCategory: 'tool',
              progressToolName: toolCall.function.name,
              progressHasArtifactTarget:
                toolCall.function.name === 'write_files' ||
                toolCall.function.name === 'run_command',
              progressDurationMs: result.durationMs,
              progressError: result.error,
            }

            // Add tool result to messages
            state.messages.push({
              role: 'tool',
              content: result.error
                ? `Error: ${result.error}\n\nOutput: ${result.output}`
                : result.output,
              tool_call_id: toolCall.id,
            })
          }

          // Continue loop for next iteration with tool results
          continue
        }

        // No tool calls - agent is done
        state.isComplete = true

        // Yield complete event
        yield {
          type: 'progress_step',
          content: 'Run complete: final response ready',
          progressStatus: 'completed',
          progressCategory: 'complete',
        }
        yield {
          type: 'complete',
          content: fullContent,
          usage,
        }
      }

      // Check if we hit max iterations
      if (state.iteration >= maxIterations && !state.isComplete) {
        yield {
          type: 'error',
          error: `Agent reached maximum iterations (${maxIterations}) without completing`,
        }
      }
    } catch (error) {
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Run the agent without streaming (returns complete result)
   */
  async runSync(promptContext: PromptContext): Promise<{
    content: string
    toolResults: ToolExecutionResult[]
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number }
    error?: string
  }> {
    const events: AgentEvent[] = []

    for await (const event of this.run(promptContext)) {
      events.push(event)
    }

    const completeEvent = events.find((e) => e.type === 'complete')
    const errorEvent = events.find((e) => e.type === 'error')
    const toolResults = events
      .filter((e) => e.type === 'tool_result' && e.toolResult)
      .map((e) => e.toolResult!)

    return {
      content: completeEvent?.content ?? '',
      toolResults,
      usage: completeEvent?.usage,
      error: errorEvent?.error,
    }
  }
}

/**
 * Factory function to create an agent runtime
 */
export function createAgentRuntime(
  options: RuntimeOptions,
  toolContext: ToolContext
): AgentRuntime {
  return new AgentRuntime(options, toolContext)
}

/**
 * Quick helper to run an agent with minimal setup
 */
export async function runAgent(
  provider: LLMProvider,
  promptContext: PromptContext,
  toolContext: ToolContext,
  options: Omit<RuntimeOptions, 'provider'> = {}
): Promise<{
  content: string
  toolResults: ToolExecutionResult[]
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number }
  error?: string
}> {
  const runtime = createAgentRuntime({ provider, ...options }, toolContext)
  return runtime.runSync(promptContext)
}

/**
 * Stream helper for React hooks
 */
export async function* streamAgent(
  provider: LLMProvider,
  promptContext: PromptContext,
  toolContext: ToolContext,
  options: Omit<RuntimeOptions, 'provider'> = {},
  config?: RuntimeConfig
): AsyncGenerator<AgentEvent> {
  const runtime = createAgentRuntime({ provider, ...options }, toolContext)
  yield* runtime.run(promptContext, config)
}
