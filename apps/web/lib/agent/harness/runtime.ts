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
  TextPart,
  ReasoningPart,
  ToolPart,
  SubtaskPart,
  SubagentResult,
  AgentConfig,
  RuntimeConfig,
  FinishReason,
  Identifier,
} from './types'
import type {
  LLMProvider,
  CompletionOptions,
  ToolDefinition,
  ToolCall,
  CompletionMessage,
} from '../../llm/types'
import { AGENT_TOOLS } from '../tools'
import { ascending } from './identifier'
import { agents } from './agents'
import { permissions, checkPermission } from './permissions'
import { plugins } from './plugins'
import { compaction, needsCompaction } from './compaction'
import { executeTaskTool, getTaskToolDefinitions } from './task-tool'

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
  pendingSubtasks: PendingSubtask[]
  cost: number
  tokens: {
    input: number
    output: number
    reasoning: number
  }
}

interface PendingSubtask {
  part: SubtaskPart
  parentAgent: AgentConfig
  description: string
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
  subagent?: { agent: string; sessionID: Identifier; success?: boolean; error?: string }
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
  maxSubagentDepth: 2,
  subagentDepth: 0,
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

    await this.executeHook('session.start', { sessionID, step: 0, agent, messageID: '' }, {})

    try {
      while (!this.state.isComplete && this.state.step < maxSteps) {
        this.state.step++

        const isLastStep = this.state.step >= maxSteps - 1
        this.state.isLastStep = isLastStep

        yield { type: 'step_start', step: this.state.step }

        await this.executeHook(
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

        await this.executeHook(
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

      await this.executeHook(
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

    const baseCompletionOptions: CompletionOptions = {
      model: agent.model ?? this.provider.config.defaultModel ?? 'gpt-4o',
      messages: this.buildCompletionMessages(isLastStep),
      temperature: agent.temperature ?? 0.7,
      maxTokens: 4096,
      tools: isLastStep ? undefined : this.getToolsForAgent(agent),
      stream: true,
    }

    const completionOptions = await this.executeHook(
      'llm.request',
      { sessionID: this.state.sessionID, step: this.state.step, agent, messageID },
      baseCompletionOptions
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
    const pendingToolCalls: ToolCall[] = []
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
        if (toolCall.function.name === 'task') {
          const rawArgs = JSON.parse(toolCall.function.arguments) as {
            subagent_type?: string
            prompt?: string
            description?: string
          }
          const subtaskPart: SubtaskPart = {
            id: ascending('part_'),
            messageID,
            sessionID: this.state.sessionID,
            type: 'subtask',
            agent: String(rawArgs.subagent_type ?? ''),
            prompt: String(rawArgs.prompt ?? ''),
          }
          this.state.pendingSubtasks.push({
            part: subtaskPart,
            parentAgent: agent,
            description: String(rawArgs.description ?? 'subtask'),
          })
          assistantMessage.parts.push(subtaskPart)
          continue
        }

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

    await this.executeHook(
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
    const patterns = this.extractPatterns(toolName, args)

    const hookContext = {
      sessionID: this.state.sessionID,
      step: this.state.step,
      agent,
      messageID,
    }

    await this.executeHook('tool.execute.before', hookContext, { toolName, args })

    for (const pattern of patterns) {
      const decision = checkPermission(agent.permission, toolName, pattern || undefined)
      if (decision === 'deny') {
        yield {
          type: 'tool_result',
          toolResult: {
            toolName,
            output: '',
            error: `Permission denied for tool: ${toolName}${pattern ? ` (${pattern})` : ''}`,
          },
        }
        return { output: '', error: `Permission denied for tool: ${toolName}` }
      }
    }

    const askPatterns = patterns.filter(
      (pattern) => checkPermission(agent.permission, toolName, pattern || undefined) === 'ask'
    )

    if (askPatterns.length > 0) {
      yield {
        type: 'permission_request',
        content: `Permission requested for: ${toolName} (${askPatterns.length} target${askPatterns.length === 1 ? '' : 's'})`,
      }

      for (const pattern of askPatterns) {
        const result = await permissions.request(
          this.state.sessionID,
          messageID,
          toolName,
          pattern,
          { args, target: pattern }
        )

        yield {
          type: 'permission_decision',
          content: `${pattern || toolName}: ${result.granted ? 'Granted' : 'Denied'}`,
        }

        if (!result.granted) {
          return { output: '', error: `Permission denied: ${result.reason}` }
        }
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

      await this.executeHook('tool.execute.after', hookContext, {
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
  private async *processSubtasks(_agent: AgentConfig): AsyncGenerator<RuntimeEvent> {
    if (!this.state) return

    while (this.state.pendingSubtasks.length > 0) {
      const pending = this.state.pendingSubtasks.shift()!
      const subtask = pending.part

      yield {
        type: 'subagent_start',
        subagent: { agent: subtask.agent, sessionID: this.state.sessionID },
      }

      const subagentConfig = agents.get(subtask.agent)
      if (!subagentConfig) {
        const errorMessage = `Unknown subagent type: ${subtask.agent}`
        subtask.result = {
          output: '',
          parts: [],
        }
        this.replaceSubtaskWithToolPart(subtask, {
          toolName: 'task',
          output: '',
          error: errorMessage,
          input: {
            subagent_type: subtask.agent,
            prompt: subtask.prompt,
            description: pending.description,
          },
        })
        yield {
          type: 'tool_result',
          toolResult: {
            toolName: 'task',
            output: '',
            error: errorMessage,
          },
        }
        yield {
          type: 'subagent_complete',
          subagent: {
            agent: subtask.agent,
            sessionID: this.state.sessionID,
            success: false,
            error: errorMessage,
          },
        }
        continue
      }

      const taskResult = await executeTaskTool(
        {
          subagent_type: subtask.agent,
          prompt: subtask.prompt,
          description: pending.description,
        },
        {
          sessionID: this.state.sessionID,
          messageID: subtask.messageID,
          parentAgent: pending.parentAgent,
          runSubagent: async (childAgent, prompt, childSessionID) =>
            this.runSubagent(childAgent, prompt, childSessionID),
        }
      )

      subtask.result = {
        output: taskResult.output,
        parts: [],
      }

      this.replaceSubtaskWithToolPart(subtask, {
        toolName: 'task',
        output: taskResult.output,
        error: taskResult.error,
        input: {
          subagent_type: subtask.agent,
          prompt: subtask.prompt,
          description: pending.description,
        },
      })

      yield {
        type: 'tool_result',
        toolResult: {
          toolName: 'task',
          output: taskResult.output,
          ...(taskResult.error ? { error: taskResult.error } : {}),
        },
      }

      yield {
        type: 'subagent_complete',
        subagent: {
          agent: subtask.agent,
          sessionID: this.state.sessionID,
          success: !taskResult.error,
          ...(taskResult.error ? { error: taskResult.error } : {}),
        },
      }
    }
  }

  private replaceSubtaskWithToolPart(
    subtask: SubtaskPart,
    args: {
      toolName: string
      output: string
      error?: string
      input: Record<string, unknown>
    }
  ): void {
    if (!this.state) return
    const parentMessage = this.state.messages.find(
      (message): message is AssistantMessage =>
        message.role === 'assistant' && message.id === subtask.messageID
    )
    if (!parentMessage) return

    const partIndex = parentMessage.parts.findIndex(
      (part) => part.type === 'subtask' && part.id === subtask.id
    )
    if (partIndex === -1) return

    parentMessage.parts[partIndex] = {
      id: ascending('part_'),
      messageID: subtask.messageID,
      sessionID: subtask.sessionID,
      type: 'tool',
      tool: args.toolName,
      state: args.error
        ? {
            status: 'error',
            input: args.input,
            error: args.error,
            time: { start: Date.now(), end: Date.now() },
          }
        : {
            status: 'completed',
            input: args.input,
            output: args.output,
            time: { start: Date.now(), end: Date.now() },
          },
    }
  }

  private async runSubagent(
    agent: AgentConfig,
    prompt: string,
    childSessionID: Identifier
  ): Promise<SubagentResult> {
    if (this.config.runSubagent) {
      return this.config.runSubagent(agent, prompt, childSessionID)
    }

    const currentDepth = this.config.subagentDepth ?? 0
    const maxDepth = this.config.maxSubagentDepth ?? 2
    if (currentDepth >= maxDepth) {
      return {
        sessionID: childSessionID,
        output: '',
        parts: [],
        error: 'Maximum subagent depth reached',
      }
    }

    const childRuntime = new Runtime(this.provider, this.toolExecutors, {
      ...this.config,
      subagentDepth: currentDepth + 1,
    })
    const parentAbortSignal = this.state?.abortController.signal
    const abortChild = () => childRuntime.abort()
    parentAbortSignal?.addEventListener('abort', abortChild, { once: true })
    const childMessageID = ascending('msg_')
    const childUserMessage: UserMessage = {
      id: childMessageID,
      sessionID: childSessionID,
      role: 'user',
      time: { created: Date.now() },
      parts: [
        {
          id: ascending('part_'),
          messageID: childMessageID,
          sessionID: childSessionID,
          type: 'text',
          text: prompt,
        },
      ],
      agent: agent.name,
      ...(agent.prompt ? { system: agent.prompt } : {}),
    }

    let output = ''
    let usage: { promptTokens: number; completionTokens: number; totalTokens: number } | undefined
    let error: string | undefined

    try {
      for await (const event of childRuntime.run(childSessionID, childUserMessage)) {
        if (event.type === 'text' && event.content) {
          output += event.content
        }
        if (event.type === 'complete' && event.usage) {
          usage = {
            promptTokens: event.usage.input,
            completionTokens: event.usage.output,
            totalTokens: event.usage.input + event.usage.output + (event.usage.reasoning ?? 0),
          }
        }
        if (event.type === 'error' && event.error) {
          error = event.error
        }
      }
    } finally {
      parentAbortSignal?.removeEventListener('abort', abortChild)
    }

    return {
      sessionID: childSessionID,
      output,
      parts: [],
      usage,
      error,
    }
  }

  /**
   * Perform context compaction
   */
  private async *performCompaction(_agent: AgentConfig): AsyncGenerator<RuntimeEvent> {
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
      if (result.messages) {
        this.state.messages = result.messages
      }
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
    const latestUserWithSystem = [...this.state.messages]
      .reverse()
      .find((msg): msg is UserMessage => msg.role === 'user' && typeof msg.system === 'string')

    if (latestUserWithSystem?.system) {
      messages.push({ role: 'system', content: latestUserWithSystem.system })
    }

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
    const allTools = [...AGENT_TOOLS, ...getTaskToolDefinitions(), ...plugins.getTools()]
    const byName = new Map<string, ToolDefinition>()
    for (const tool of allTools) {
      byName.set(tool.function.name, tool)
    }

    return Array.from(byName.values()).filter((tool) => {
      const decision = checkPermission(agent.permission, tool.function.name)
      return decision !== 'deny'
    })
  }

  /**
   * Extract pattern for permission checking
   */
  private extractPatterns(toolName: string, args: Record<string, unknown>): string[] {
    if (toolName === 'read_files' || toolName === 'write_files') {
      if (Array.isArray(args.paths)) {
        return args.paths.map((value) => String(value)).filter(Boolean)
      }
      if (Array.isArray(args.files)) {
        return args.files.map((f: { path?: string }) => String(f.path ?? '')).filter(Boolean)
      }
    }
    if (toolName === 'list_directory' && typeof args.path === 'string') {
      return [args.path]
    }
    if (toolName === 'run_command') {
      return [String(args.command ?? '')]
    }
    return ['']
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
  private async executeHook<T>(
    hookType: string,
    context: { sessionID: Identifier; step: number; agent: AgentConfig; messageID: Identifier },
    data: T
  ): Promise<T> {
    return plugins.executeHooks(hookType as any, context, data)
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
