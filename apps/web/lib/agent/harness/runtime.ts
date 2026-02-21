/**
 * Agent Runtime - Core execution engine for the agentic harness
 *
 * Implements OpenCode-style agent execution with:
 * - Provider-agnostic LLM integration
 * - Multi-step reasoning with tool execution
 * - Subagent delegation
 * - Context compaction
 * - Step limiting and forced text-only mode
 * - Reasoning part capture
 * - Permission-aware tool execution
 * - Plugin hooks integration
 */

import type {
  Message,
  UserMessage,
  AssistantMessage,
  Part,
  TextPart,
  ReasoningPart,
  ToolPart,
  SubtaskPart,
  StepStartPart,
  StepFinishPart,
  AgentConfig,
  RuntimeConfig,
  FinishReason,
  Identifier,
  SubagentResult,
} from './types'
import type {
  LLMProvider,
  CompletionOptions,
  StreamChunk,
  ToolDefinition,
  ToolCall,
  CompletionMessage,
} from '../../llm/types'
import { ascending } from './identifier'
import { bus } from './event-bus'
import { agents } from './agents'
import { permissions, checkPermission } from './permissions'
import { plugins } from './plugins'
import { compaction, needsCompaction } from './compaction'

/**
 * Runtime state
 */
interface RuntimeState {
  sessionID: Identifier
  messages: Message[]
  step: number
  isComplete: boolean
  isLastStep: boolean
  abortController: AbortController
  pendingSubtasks: SubtaskPart[]
  cost: number
  tokens: {
    input: number
    output: number
    reasoning: number
  }
}

/**
 * Tool execution context
 */
export interface ToolExecutionContext {
  sessionID: Identifier
  messageID: Identifier
  agent: AgentConfig
  abortSignal: AbortSignal
  metadata: (data: Record<string, unknown>) => void
  ask: (question: string) => Promise<string>
}

/**
 * Tool executor function type
 */
export type ToolExecutor = (
  args: Record<string, unknown>,
  ctx: ToolExecutionContext
) => Promise<{ output: string; error?: string; metadata?: Record<string, unknown> }>

/**
 * Runtime event types
 */
export type RuntimeEventType =
  | 'status'
  | 'text'
  | 'reasoning'
  | 'tool_call'
  | 'tool_result'
  | 'subagent_start'
  | 'subagent_complete'
  | 'step_start'
  | 'step_finish'
  | 'compaction'
  | 'permission_request'
  | 'permission_decision'
  | 'error'
  | 'complete'

/**
 * Runtime event
 */
export interface RuntimeEvent {
  type: RuntimeEventType
  content?: string
  reasoningContent?: string
  toolCall?: ToolCall
  toolResult?: { toolName: string; output: string; error?: string }
  subagent?: { agent: string; sessionID: Identifier }
  step?: number
  finishReason?: FinishReason
  usage?: { input: number; output: number; reasoning: number }
  cost?: number
  error?: string
}

/**
 * Default runtime configuration
 */
const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = {
  maxIterations: 100,
  maxSteps: 50,
  maxToolCallsPerStep: 10,
  enableToolDeduplication: true,
  toolLoopThreshold: 3,
  contextCompactionThreshold: 0.9,
  enableSnapshots: false,
  enableReasoning: true,
}

/**
 * Agent Runtime class
 */
export class Runtime {
  private provider: LLMProvider
  private toolExecutors: Map<string, ToolExecutor>
  private config: RuntimeConfig
  private state: RuntimeState | null = null

  constructor(
    provider: LLMProvider,
    toolExecutors: Map<string, ToolExecutor>,
    config?: Partial<RuntimeConfig>
  ) {
    this.provider = provider
    this.toolExecutors = toolExecutors
    this.config = { ...DEFAULT_RUNTIME_CONFIG, ...config }
  }

  /**
   * Run the agent with streaming events
   */
  async *run(
    sessionID: Identifier,
    userMessage: UserMessage,
    initialMessages: Message[] = []
  ): AsyncGenerator<RuntimeEvent> {
    const agent = agents.get(userMessage.agent) ?? agents.get('build')!
    const maxSteps = agent.steps ?? this.config.maxSteps ?? 50
    const contextLimit = this.provider.config.auth.baseUrl?.includes('anthropic') ? 200000 : 128000

    this.state = {
      sessionID,
      messages: [...initialMessages, userMessage],
      step: 0,
      isComplete: false,
      isLastStep: false,
      abortController: new AbortController(),
      pendingSubtasks: [],
      cost: 0,
      tokens: { input: 0, output: 0, reasoning: 0 },
    }

    yield* this.executeHook('session.start', { sessionID, step: 0, agent, messageID: '' }, {})

    try {
      while (!this.state.isComplete && this.state.step < maxSteps) {
        this.state.step++

        const isLastStep = this.state.step >= maxSteps - 1
        this.state.isLastStep = isLastStep

        yield { type: 'step_start', step: this.state.step }

        yield* this.executeHook(
          'step.start',
          { sessionID, step: this.state.step, agent, messageID: '' },
          { isLastStep }
        )

        if (this.state.pendingSubtasks.length > 0) {
          yield* this.processSubtasks(agent)
          continue
        }

        if (
          needsCompaction(this.state.messages, contextLimit, {
            threshold: this.config.contextCompactionThreshold ?? 0.9,
            targetRatio: 0.5,
            preserveRecent: 4,
            maxToolOutputLength: 10000,
          })
        ) {
          yield* this.performCompaction(agent)
          continue
        }

        const result = yield* this.executeStep(agent, isLastStep)

        if (result.finishReason === 'stop' || result.finishReason === 'length') {
          this.state.isComplete = true
        }

        yield {
          type: 'step_finish',
          step: this.state.step,
          finishReason: result.finishReason,
          usage: this.state.tokens,
          cost: this.state.cost,
        }

        yield* this.executeHook(
          'step.end',
          { sessionID, step: this.state.step, agent, messageID: '' },
          { finishReason: result.finishReason }
        )
      }

      if (!this.state.isComplete) {
        yield {
          type: 'error',
          error: `Agent reached maximum steps (${maxSteps}) without completing`,
        }
      }

      yield {
        type: 'complete',
        usage: this.state.tokens,
        cost: this.state.cost,
      }

      yield* this.executeHook(
        'session.end',
        { sessionID, step: this.state.step, agent, messageID: '' },
        {}
      )
    } catch (error) {
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Execute a single step
   */
  private async *executeStep(
    agent: AgentConfig,
    isLastStep: boolean
  ): AsyncGenerator<RuntimeEvent> {
    if (!this.state) throw new Error('Runtime not initialized')

    const messageID = ascending('msg_')
    const lastUserMessage = this.state.messages
      .filter((m): m is UserMessage => m.role === 'user')
      .pop()

    if (!lastUserMessage) {
      throw new Error('No user message found')
    }

    const completionOptions: CompletionOptions = {
      model: agent.model ?? this.provider.config.defaultModel ?? 'gpt-4o',
      messages: this.buildCompletionMessages(isLastStep),
      temperature: agent.temperature ?? 0.7,
      maxTokens: 4096,
      tools: isLastStep ? undefined : this.getToolsForAgent(agent),
      stream: true,
    }

    yield* this.executeHook(
      'llm.request',
      { sessionID: this.state.sessionID, step: this.state.step, agent, messageID },
      completionOptions
    )

    const assistantMessage: AssistantMessage = {
      id: messageID,
      sessionID: this.state.sessionID,
      role: 'assistant',
      parentID: lastUserMessage.id,
      parts: [],
      time: { created: Date.now() },
      modelID: completionOptions.model,
      providerID: this.provider.name,
      mode: agent.name,
      agent: agent.name,
    }

    let fullContent = ''
    let reasoningContent = ''
    let pendingToolCalls: ToolCall[] = []
    let finishReason: FinishReason = 'unknown'
    let usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 }

    try {
      for await (const chunk of this.provider.completionStream(completionOptions)) {
        switch (chunk.type) {
          case 'text':
            if (chunk.content) {
              fullContent += chunk.content
              yield { type: 'text', content: chunk.content }
            }
            break

          case 'reasoning':
            if (chunk.reasoningContent) {
              reasoningContent += chunk.reasoningContent
              yield { type: 'reasoning', reasoningContent: chunk.reasoningContent }
            }
            break

          case 'tool_call':
            if (chunk.toolCall) {
              pendingToolCalls.push(chunk.toolCall)
              yield { type: 'tool_call', toolCall: chunk.toolCall }
            }
            break

          case 'finish':
            if (chunk.usage) {
              usage = chunk.usage
              this.state.tokens.input += usage.promptTokens
              this.state.tokens.output += usage.completionTokens
            }
            if (chunk.finishReason) {
              finishReason = this.mapFinishReason(chunk.finishReason)
            }
            break

          case 'error':
            yield { type: 'error', error: chunk.error }
            return { finishReason: 'error' as FinishReason }
        }
      }
    } catch (error) {
      yield { type: 'error', error: error instanceof Error ? error.message : 'Stream error' }
      return { finishReason: 'error' }
    }

    if (reasoningContent) {
      const reasoningPart: ReasoningPart = {
        id: ascending('part_'),
        messageID,
        sessionID: this.state.sessionID,
        type: 'reasoning',
        text: reasoningContent,
      }
      assistantMessage.parts.push(reasoningPart)
    }

    if (fullContent) {
      const textPart: TextPart = {
        id: ascending('part_'),
        messageID,
        sessionID: this.state.sessionID,
        type: 'text',
        text: fullContent,
      }
      assistantMessage.parts.push(textPart)
    }

    if (pendingToolCalls.length > 0) {
      finishReason = 'tool-calls'

      for (const toolCall of pendingToolCalls) {
        const toolResult = yield* this.executeToolCall(toolCall, agent, messageID)

        const toolPart: ToolPart = {
          id: ascending('part_'),
          messageID,
          sessionID: this.state.sessionID,
          type: 'tool',
          tool: toolCall.function.name,
          state: toolResult.error
            ? {
                status: 'error',
                input: JSON.parse(toolCall.function.arguments),
                error: toolResult.error,
                time: { start: Date.now(), end: Date.now() },
              }
            : {
                status: 'completed',
                input: JSON.parse(toolCall.function.arguments),
                output: toolResult.output,
                time: { start: Date.now(), end: Date.now() },
              },
        }

        assistantMessage.parts.push(toolPart)
      }
    }

    assistantMessage.time.completed = Date.now()
    assistantMessage.finish = finishReason
    assistantMessage.tokens = {
      input: usage.promptTokens,
      output: usage.completionTokens,
      reasoning: this.state.tokens.reasoning,
    }

    this.state.messages.push(assistantMessage)

    yield* this.executeHook(
      'llm.response',
      { sessionID: this.state.sessionID, step: this.state.step, agent, messageID },
      { usage, finishReason, modelID: completionOptions.model }
    )

    return { finishReason }
  }

  /**
   * Execute a tool call with permission checking
   */
  private async *executeToolCall(
    toolCall: ToolCall,
    agent: AgentConfig,
    messageID: Identifier
  ): AsyncGenerator<RuntimeEvent> {
    if (!this.state) throw new Error('Runtime not initialized')

    const toolName = toolCall.function.name
    const args = JSON.parse(toolCall.function.arguments)
    const pattern = this.extractPattern(toolName, args)

    const hookContext = {
      sessionID: this.state.sessionID,
      step: this.state.step,
      agent,
      messageID,
    }

    yield* this.executeHook('tool.execute.before', hookContext, { toolName, args })

    const decision = checkPermission(agent.permission, toolName, pattern)

    if (decision === 'deny') {
      yield {
        type: 'tool_result',
        toolResult: {
          toolName,
          output: '',
          error: `Permission denied for tool: ${toolName}`,
        },
      }
      return { output: '', error: `Permission denied for tool: ${toolName}` }
    }

    if (decision === 'ask') {
      yield { type: 'permission_request', content: `Permission requested for: ${toolName}` }

      const result = await permissions.request(this.state.sessionID, messageID, toolName, pattern, {
        args,
      })

      yield {
        type: 'permission_decision',
        content: result.granted ? 'Granted' : 'Denied',
      }

      if (!result.granted) {
        return { output: '', error: `Permission denied: ${result.reason}` }
      }
    }

    const executor = this.toolExecutors.get(toolName)
    if (!executor) {
      return { output: '', error: `Unknown tool: ${toolName}` }
    }

    try {
      const result = await executor(args, {
        sessionID: this.state.sessionID,
        messageID,
        agent,
        abortSignal: this.state.abortController.signal,
        metadata: () => {},
        ask: async (question: string) => {
          return `User response: ${question}`
        },
      })

      yield {
        type: 'tool_result',
        toolResult: {
          toolName,
          output: result.output,
          error: result.error,
        },
      }

      yield* this.executeHook('tool.execute.after', hookContext, {
        toolName,
        args,
        result,
      })

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Tool execution failed'
      yield { type: 'tool_result', toolResult: { toolName, output: '', error: errorMessage } }
      return { output: '', error: errorMessage }
    }
  }

  /**
   * Process pending subtasks
   */
  private async *processSubtasks(agent: AgentConfig): AsyncGenerator<RuntimeEvent> {
    if (!this.state) return

    while (this.state.pendingSubtasks.length > 0) {
      const subtask = this.state.pendingSubtasks.shift()!

      yield {
        type: 'subagent_start',
        subagent: { agent: subtask.agent, sessionID: this.state.sessionID },
      }

      const subagentConfig = agents.get(subtask.agent)
      if (!subagentConfig) {
        subtask.result = {
          output: '',
          parts: [],
        }
        continue
      }

      yield {
        type: 'subagent_complete',
        subagent: { agent: subtask.agent, sessionID: this.state.sessionID },
      }
    }
  }

  /**
   * Perform context compaction
   */
  private async *performCompaction(agent: AgentConfig): AsyncGenerator<RuntimeEvent> {
    if (!this.state) return

    yield { type: 'compaction', content: 'Compacting context...' }

    const result = await compaction.compact(
      this.state.sessionID,
      this.state.messages,
      128000,
      async (messages) => {
        const content = messages
          .map((m) => {
            if (m.role === 'user') {
              return `User: ${m.parts.map((p) => (p.type === 'text' ? p.text : '')).join(' ')}`
            }
            if (m.role === 'assistant') {
              return `Assistant: ${m.parts.map((p) => (p.type === 'text' ? p.text : '')).join(' ')}`
            }
            return ''
          })
          .join('\n\n')
        return `Summary of conversation:\n\n${content.slice(0, 4000)}`
      }
    )

    if (!result.error) {
      yield {
        type: 'compaction',
        content: `Compacted ${result.messagesCompacted} messages (${result.tokensBefore} → ${result.tokensAfter} tokens)`,
      }
    }
  }

  /**
   * Build completion messages from state
   */
  private buildCompletionMessages(isLastStep: boolean): CompletionMessage[] {
    if (!this.state) return []

    const messages: CompletionMessage[] = []

    for (const msg of this.state.messages) {
      if (msg.role === 'user') {
        const content = msg.parts
          .map((p) => {
            if (p.type === 'text') return p.text
            if (p.type === 'compaction' && p.summary) {
              return `[Previous conversation summary]\n${p.summary}`
            }
            return ''
          })
          .filter(Boolean)
          .join('\n')

        if (content) {
          messages.push({ role: 'user', content })
        }
      } else if (msg.role === 'assistant') {
        const content = msg.parts
          .map((p) => {
            if (p.type === 'text') return p.text
            if (p.type === 'reasoning') return `<thinking>${p.text}</thinking>`
            return ''
          })
          .filter(Boolean)
          .join('\n')

        const toolCalls = msg.parts
          .filter((p): p is ToolPart => p.type === 'tool')
          .filter((p) => p.state.status === 'completed' || p.state.status === 'error')
          .map((p) => ({
            id: ascending('tc_'),
            type: 'function' as const,
            function: {
              name: p.tool,
              arguments: JSON.stringify(p.state.input),
            },
          }))

        if (content || toolCalls.length > 0) {
          const assistantMsg: CompletionMessage = {
            role: 'assistant',
            content: content || ' ',
          }
          if (toolCalls.length > 0) {
            assistantMsg.tool_calls = toolCalls
          }
          messages.push(assistantMsg)

          for (const tc of toolCalls) {
            const toolPart = msg.parts.find(
              (p): p is ToolPart => p.type === 'tool' && p.tool === tc.function.name
            )
            if (
              toolPart &&
              (toolPart.state.status === 'completed' || toolPart.state.status === 'error')
            ) {
              const state = toolPart.state as { output?: string; error?: string }
              messages.push({
                role: 'tool',
                content: state.error || state.output || '',
                tool_call_id: tc.id,
              })
            }
          }
        }
      }
    }

    if (isLastStep) {
      messages.push({
        role: 'user',
        content:
          'You have reached the maximum number of steps. Please provide a final summary of what was accomplished and what remains to be done. Do not make any more tool calls.',
      })
    }

    return messages
  }

  /**
   * Get tools available for an agent
   */
  private getToolsForAgent(agent: AgentConfig): ToolDefinition[] {
    const allTools = [...plugins.getTools()]

    return allTools.filter((tool) => {
      const decision = checkPermission(agent.permission, tool.function.name)
      return decision !== 'deny'
    })
  }

  /**
   * Extract pattern for permission checking
   */
  private extractPattern(toolName: string, args: Record<string, unknown>): string {
    if (toolName === 'read_files' || toolName === 'write_files') {
      if (Array.isArray(args.paths)) return args.paths.join(',')
      if (Array.isArray(args.files)) {
        return args.files.map((f: { path?: string }) => f.path).join(',')
      }
    }
    if (toolName === 'run_command') {
      return args.command as string
    }
    return ''
  }

  /**
   * Map provider finish reason to our finish reason
   */
  private mapFinishReason(reason: string): FinishReason {
    switch (reason) {
      case 'stop':
        return 'stop'
      case 'length':
        return 'length'
      case 'tool_calls':
      case 'tool-calls':
        return 'tool-calls'
      case 'content_filter':
        return 'content-filter'
      case 'error':
        return 'error'
      default:
        return 'unknown'
    }
  }

  /**
   * Execute a plugin hook
   */
  private async *executeHook<T>(
    hookType: string,
    context: { sessionID: Identifier; step: number; agent: AgentConfig; messageID: Identifier },
    data: T
  ): AsyncGenerator<RuntimeEvent> {
    await plugins.executeHooks(hookType as any, context, data)
  }

  /**
   * Abort the current execution
   */
  abort(): void {
    if (this.state) {
      this.state.abortController.abort()
      this.state.isComplete = true
    }
  }
}

/**
 * Create a runtime instance
 */
export function createRuntime(
  provider: LLMProvider,
  toolExecutors: Map<string, ToolExecutor>,
  config?: Partial<RuntimeConfig>
): Runtime {
  return new Runtime(provider, toolExecutors, config)
}
