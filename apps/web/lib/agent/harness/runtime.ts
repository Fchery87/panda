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
  HookType,
  ToolInterruptRequest,
  ToolInterruptResult,
  ToolRiskTier,
  RuntimeSnapshotEvent,
} from './types'
import type { FormalSpecification, SpecTier } from '../spec/types'
import type {
  LLMProvider,
  CompletionOptions,
  ToolDefinition,
  ToolCall,
  CompletionMessage,
  StreamChunk,
} from '../../llm/types'
import { AGENT_TOOLS } from '../tools'
import { analyzeCommand } from '../command-analysis'
import { ascending } from './identifier'
import { agents } from './agents'
import { permissions, checkPermission } from './permissions'
import { plugins } from './plugins'
import { repairJSON, fuzzyMatchToolName, safeJSONParse } from './tool-repair'
import { compaction, needsCompaction, SUMMARIZATION_PROMPT } from './compaction'
import { withTimeoutAndRetry, isContextOverflowError } from '../../llm/stream-resilience'
import { snapshots } from './snapshots'
import { createSubtaskPart, executeTaskTool, getTaskToolDefinitions } from './task-tool'
import type {
  RuntimeCheckpoint,
  RuntimeCheckpointPendingSubtask,
  RuntimeCheckpointReason,
  RuntimeCheckpointState,
} from './checkpoint-store'
import { SpecEngine, createSpecEngine, type SpecGenerationContext } from '../spec/engine'

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
    cacheRead?: number
    cacheWrite?: number
  }
  lastToolLoopSignature: string | null
  toolLoopStreak: number
  /** Enhanced doom loop tracking */
  toolCallHistory: string[] // Recent tool call patterns
  toolCallFrequency: Map<string, number> // Per-tool frequency across session
  cyclicPatternDetected: boolean
  lastInterventionStep: number
  /** Active specification being executed against */
  activeSpec?: FormalSpecification
}

type PendingSubtask = RuntimeCheckpointPendingSubtask

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
  | 'interrupt_request'
  | 'interrupt_decision'
  | 'snapshot'
  | 'error'
  | 'complete'
  // SpecNative events
  | 'spec_pending_approval'
  | 'spec_generated'
  | 'spec_verification'

/**
 * Runtime event
 */
export interface RuntimeEvent {
  type: RuntimeEventType
  content?: string
  reasoningContent?: string
  toolCall?: ToolCall
  toolResult?: {
    toolCallId: string
    toolName: string
    args: Record<string, unknown>
    output: string
    error?: string
    durationMs: number
  }
  interrupt?: {
    toolName: string
    riskTier: ToolRiskTier
    decision?: 'approve' | 'reject' | 'edit'
    reason?: string
  }
  snapshot?: RuntimeSnapshotEvent
  subagent?: {
    agent: string
    sessionID: Identifier
    id?: string
    success?: boolean
    error?: string
  }
  step?: number
  finishReason?: FinishReason
  usage?: { input: number; output: number; reasoning: number }
  cost?: number
  error?: string
  // SpecNative event fields
  spec?: FormalSpecification
  tier?: SpecTier
  verification?: {
    passed: boolean
    results: Array<{
      criterionId: string
      passed: boolean
      message?: string
    }>
  }
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
  enableSnapshots: true,
  snapshotFailureMode: 'warn',
  enableReasoning: true,
  maxSubagentDepth: 2,
  subagentDepth: 0,
  maxToolExecutionRetries: 0,
  toolRetryBackoffMs: 200,
  enableToolCallIdempotencyCache: false,
  specEngine: {
    enabled: false,
    autoApproveAmbient: true,
    maxSpecsPerProject: 100,
    enableDriftDetection: false,
  },
  // Stream resilience configuration
  streamIdleTimeoutMs: 120000,
  maxStreamRetries: 3,
  streamRetryBackoffMs: 2000,
}

/**
 * Agent Runtime class
 */
export class Runtime {
  private provider: LLMProvider
  private toolExecutors: Map<string, ToolExecutor>
  private config: RuntimeConfig
  private state: RuntimeState | null = null
  private toolCallResultCache = new Map<
    string,
    {
      output: string
      error?: string
      metadata?: Record<string, unknown>
      argsUsed?: Record<string, unknown>
    }
  >()
  private specEngine: SpecEngine

  constructor(
    provider: LLMProvider,
    toolExecutors: Map<string, ToolExecutor>,
    config?: Partial<RuntimeConfig>
  ) {
    this.provider = provider
    this.toolExecutors = toolExecutors
    this.config = { ...DEFAULT_RUNTIME_CONFIG, ...config }
    this.specEngine = createSpecEngine(this.config.specEngine)
  }

  /**
   * Run the agent with streaming events
   */
  async *run(
    sessionID: Identifier,
    userMessage: UserMessage,
    initialMessages: Message[] = []
  ): AsyncGenerator<RuntimeEvent> {
    this.toolCallResultCache.clear()
    const agent = agents.get(userMessage.agent) ?? agents.get('build')!
    const maxSteps = agent.steps ?? this.config.maxSteps ?? 50
    this.state = this.createInitialState(sessionID, [...initialMessages, userMessage])

    // SpecNative: Generate spec before execution if enabled
    if (this.specEngine.isEnabled()) {
      const userText = this.extractUserText(userMessage)
      if (userText) {
        const shouldProceed = yield* this.generateAndHandleSpec(userText, agent, sessionID)
        if (shouldProceed === false) {
          yield {
            type: 'error',
            error: 'Specification approval cancelled',
          }
          return
        }
      }
    }

    yield* this.runLoop(agent, maxSteps, { emitSessionStart: true })
  }

  /**
   * Extract text content from user message
   */
  private extractUserText(userMessage: UserMessage): string | null {
    const textParts = userMessage.parts.filter((p) => p.type === 'text')
    if (textParts.length === 0) return null
    return textParts.map((p) => ('text' in p ? p.text : '')).join('\n')
  }

  /**
   * Generate and handle specification
   */
  private async *generateAndHandleSpec(
    userMessage: string,
    agent: AgentConfig,
    sessionID: Identifier
  ): AsyncGenerator<RuntimeEvent, boolean> {
    if (!this.state) return true

    // Classify intent
    const classification = await this.specEngine.classify(userMessage, {
      mode: agent.name,
    })

    // Execute spec.classify hook
    await this.executeHook(
      'spec.classify',
      { sessionID, step: this.state.step, agent, messageID: '' },
      classification
    )

    const tier = classification.tier

    // Skip spec generation for instant tier
    if (tier === 'instant') {
      return true
    }

    // Generate spec
    await this.executeHook(
      'spec.generate.before',
      { sessionID, step: this.state.step, agent, messageID: '' },
      { userMessage, tier }
    )

    const specContext: SpecGenerationContext = {
      mode: agent.name,
      model: agent.model ?? this.provider.config.defaultModel ?? 'unknown',
    }

    const { spec } = await this.specEngine.generate(userMessage, specContext, tier)

    await this.executeHook(
      'spec.generate.after',
      { sessionID, step: this.state.step, agent, messageID: '' },
      { spec }
    )

    // Validate spec
    const validation = await this.specEngine.validate(spec)

    await this.executeHook(
      'spec.validate',
      { sessionID, step: this.state.step, agent, messageID: '' },
      validation
    )

    let finalSpec = spec

    if (!validation.isValid) {
      finalSpec = await this.specEngine.refine(spec, validation.errors)

      await this.executeHook(
        'spec.refine',
        { sessionID, step: this.state.step, agent, messageID: '' },
        { original: spec, refined: finalSpec, errors: validation.errors }
      )
    }

    // Handle tier-specific behavior
    if (tier === 'explicit') {
      // Yield spec for UI approval
      yield { type: 'spec_pending_approval', spec: finalSpec, tier }

      const approval = this.config.onSpecApproval
        ? await this.config.onSpecApproval({
            sessionID,
            spec: finalSpec,
            tier,
          })
        : { decision: 'approve' as const, spec: finalSpec }

      if (approval.decision === 'cancel') {
        this.state.activeSpec = undefined
        return false
      }

      finalSpec = approval.spec ?? finalSpec
      finalSpec = this.specEngine.approve(finalSpec)

      await this.executeHook(
        'spec.approve',
        { sessionID, step: this.state.step, agent, messageID: '' },
        { spec: finalSpec }
      )
    } else if (tier === 'ambient') {
      // Auto-approve ambient specs based on config
      if (this.config.specEngine?.autoApproveAmbient !== false) {
        finalSpec = this.specEngine.markExecuting(finalSpec)
      }
    }

    // Store active spec
    this.state.activeSpec = finalSpec

    // Yield spec generated event
    yield { type: 'spec_generated', spec: finalSpec, tier }

    await this.executeHook(
      'spec.execute.before',
      { sessionID, step: this.state.step, agent, messageID: '' },
      { spec: finalSpec }
    )

    return true
  }

  /**
   * Resume a session from a stored checkpoint
   */
  async *resume(sessionID: Identifier): AsyncGenerator<RuntimeEvent> {
    this.toolCallResultCache.clear()
    const checkpointStore = this.config.checkpointStore
    if (!checkpointStore) {
      throw new Error('Checkpoint store is not configured')
    }

    const checkpoint = await checkpointStore.load(sessionID)
    if (!checkpoint) {
      throw new Error(`No checkpoint found for session: ${sessionID}`)
    }

    const agent = agents.get(checkpoint.agentName) ?? agents.get('build')!
    const maxSteps = agent.steps ?? this.config.maxSteps ?? 50

    this.state = this.restoreStateFromCheckpoint(checkpoint.state)

    yield* this.runLoop(agent, maxSteps, { emitSessionStart: false })
  }

  private createInitialState(sessionID: Identifier, messages: Message[]): RuntimeState {
    return {
      sessionID,
      messages,
      step: 0,
      isComplete: false,
      isLastStep: false,
      abortController: new AbortController(),
      pendingSubtasks: [],
      cost: 0,
      tokens: { input: 0, output: 0, reasoning: 0, cacheRead: 0, cacheWrite: 0 },
      lastToolLoopSignature: null,
      toolLoopStreak: 0,
      toolCallHistory: [],
      toolCallFrequency: new Map(),
      cyclicPatternDetected: false,
      lastInterventionStep: 0,
    }
  }

  private async *runLoop(
    agent: AgentConfig,
    maxSteps: number,
    options: { emitSessionStart: boolean }
  ): AsyncGenerator<RuntimeEvent> {
    if (!this.state) {
      throw new Error('Runtime not initialized')
    }

    const sessionID = this.state.sessionID
    const contextLimit = this.provider.config.auth.baseUrl?.includes('anthropic') ? 200000 : 128000

    if (options.emitSessionStart) {
      await this.executeHook(
        'session.start',
        { sessionID, step: this.state.step, agent, messageID: '' },
        {}
      )
    }

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
          await this.saveCheckpoint(agent.name, 'step')
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
          const compacted = yield* this.performCompaction(agent)
          if (compacted) {
            await this.saveCheckpoint(agent.name, 'step')
            continue
          }
        }

        const result = yield* this.executeStep(agent, isLastStep)

        if (result.messageID) {
          yield* this.captureStepSnapshot(agent, result.messageID)
        }

        if (result.finishReason === 'stop' || result.finishReason === 'length') {
          this.state.isComplete = true
        }

        await this.saveCheckpoint(agent.name, 'step')

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

      let completedSuccessfully = this.state.isComplete
      if (!this.state.isComplete) {
        await this.saveCheckpoint(agent.name, 'error')
        yield {
          type: 'error',
          error: `Agent reached maximum steps (${maxSteps}) without completing`,
        }
      } else {
        completedSuccessfully = true
      }

      if (completedSuccessfully) {
        await this.saveCheckpoint(agent.name, 'complete')
      }

      // SpecNative: Post-execution verification
      if (this.state.activeSpec) {
        yield* this.verifyAndFinalizeSpec(sessionID, agent)
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
      await this.saveCheckpoint(agent.name, 'error')
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
  ): AsyncGenerator<RuntimeEvent, { finishReason: FinishReason; messageID?: Identifier }> {
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
    let usage: StreamChunk['usage'] = { promptTokens: 0, completionTokens: 0, totalTokens: 0 }

    // Stream resilience: wrap with timeout and retry
    const streamIdleTimeoutMs = this.config.streamIdleTimeoutMs ?? 120000
    const maxStreamRetries = this.config.maxStreamRetries ?? 3
    const streamRetryBackoffMs = this.config.streamRetryBackoffMs ?? 2000

    try {
      let contextOverflowRetryCount = 0
      const maxContextOverflowRetries = 1

      const processStreamWithResilience = async function* (this: Runtime) {
        type StreamEvent = { type: 'chunk'; data: StreamChunk } | { type: 'error'; error: string }
        while (true) {
          try {
            const streamFactory = () => this.provider.completionStream(completionOptions)

            for await (const chunk of withTimeoutAndRetry(streamFactory, streamIdleTimeoutMs, {
              maxRetries: maxStreamRetries,
              initialDelayMs: streamRetryBackoffMs,
            })) {
              // Filter out retry notification chunks
              if (typeof chunk === 'object' && chunk !== null && 'type' in (chunk as object)) {
                const chunkType = (chunk as { type?: string }).type
                if (chunkType === 'retry') {
                  yield {
                    type: 'chunk',
                    data: {
                      type: 'status_thinking',
                      content: 'Retrying LLM request...',
                    } as StreamChunk,
                  } as StreamEvent
                  continue
                }
              }
              yield { type: 'chunk', data: chunk as StreamChunk } as StreamEvent
            }
            return
          } catch (error) {
            const errorObj = error instanceof Error ? error : new Error(String(error))

            // Handle context overflow by triggering compaction
            if (
              isContextOverflowError(errorObj) &&
              contextOverflowRetryCount < maxContextOverflowRetries
            ) {
              contextOverflowRetryCount++

              // Trigger compaction
              for await (const event of this.performCompaction(agent)) {
                // Consume compaction events
                yield event as StreamEvent
              }

              if (contextOverflowRetryCount <= maxContextOverflowRetries) {
                // Update completion options with compacted messages
                completionOptions.messages = this.buildCompletionMessages(isLastStep)
                continue // Retry the stream with compacted context
              }
            }

            yield { type: 'error', error: errorObj.message } as StreamEvent
            return
          }
        }
      }.bind(this)

      for await (const event of processStreamWithResilience()) {
        if (event.type === 'error') {
          yield { type: 'error', error: event.error }
          return { finishReason: 'error', messageID }
        }

        const chunk = event.data

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
              // Track reasoning and cache tokens if available
              if (usage.reasoningTokens) {
                this.state.tokens.reasoning += usage.reasoningTokens
              }
              if (usage.cacheReadTokens) {
                this.state.tokens.cacheRead =
                  (this.state.tokens.cacheRead ?? 0) + usage.cacheReadTokens
              }
              if (usage.cacheWriteTokens) {
                this.state.tokens.cacheWrite =
                  (this.state.tokens.cacheWrite ?? 0) + usage.cacheWriteTokens
              }
            }
            if (chunk.finishReason) {
              finishReason = this.mapFinishReason(chunk.finishReason)
            }
            break

          case 'error':
            yield { type: 'error', error: chunk.error }
            return { finishReason: 'error', messageID }

          case 'status_thinking':
            if (chunk.content) {
              yield { type: 'status', content: chunk.content }
            }
            break
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Stream error'
      yield { type: 'error', error: errorMessage }
      return { finishReason: 'error', messageID }
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
      // Get list of available tool names for fuzzy matching
      const availableToolNames = [
        ...AGENT_TOOLS,
        ...getTaskToolDefinitions(),
        ...plugins.getTools(),
      ].map((t) => t.function.name)

      const preparedToolCalls = pendingToolCalls.map((toolCall) => {
        // Try to repair tool name if it's not recognized
        let toolName = toolCall.function.name
        if (!availableToolNames.includes(toolName)) {
          const matchedName = fuzzyMatchToolName(toolName, availableToolNames)
          if (matchedName) {
            console.warn(`[runtime] Tool name '${toolName}' was corrected to '${matchedName}'`)
            toolName = matchedName
          }
        }

        // Try to parse arguments with repair fallback
        let parsedArgs: Record<string, unknown>
        try {
          parsedArgs = JSON.parse(toolCall.function.arguments) as Record<string, unknown>
        } catch {
          // Try repair
          const repairedArgs = repairJSON(toolCall.function.arguments)
          parsedArgs = safeJSONParse(repairedArgs, {}) as Record<string, unknown>
          if (Object.keys(parsedArgs).length > 0) {
            console.warn('[runtime] Tool arguments JSON was repaired automatically')
          } else {
            parsedArgs = {} as Record<string, unknown>
          }
        }

        return {
          toolCall: { ...toolCall, function: { ...toolCall.function, name: toolName } },
          parsedArgs,
          dedupKey: this.createToolCallDedupKey(toolName, parsedArgs),
        }
      })

      let processedToolCallsThisStep = 0
      const maxToolCallsPerStep = this.config.maxToolCallsPerStep
      const dedupEnabled = this.config.enableToolDeduplication === true
      const seenDedupKeysThisStep = new Set<string>()

      const executableToolKeysForLoop = [] as string[]
      {
        let previewProcessedToolCallsThisStep = 0
        const previewSeenDedupKeysThisStep = new Set<string>()

        for (const prepared of preparedToolCalls) {
          if (dedupEnabled && previewSeenDedupKeysThisStep.has(prepared.dedupKey)) {
            continue
          }
          if (dedupEnabled) {
            previewSeenDedupKeysThisStep.add(prepared.dedupKey)
          }
          if (
            typeof maxToolCallsPerStep === 'number' &&
            previewProcessedToolCallsThisStep >= maxToolCallsPerStep
          ) {
            continue
          }
          previewProcessedToolCallsThisStep++
          executableToolKeysForLoop.push(prepared.dedupKey)
        }
      }

      const loopGuardResult = this.applyToolLoopGuard(executableToolKeysForLoop)

      // Progressive intervention: warn at threshold - 1
      if (loopGuardResult.warned) {
        yield {
          type: 'status',
          content:
            'Warning: You appear to be repeating similar tool calls. Try a different approach to avoid a loop.',
        }
      }

      if (loopGuardResult.triggered) {
        const threshold = this.config.toolLoopThreshold

        // Hard stop
        yield {
          type: 'error',
          error:
            `Detected repeated tool loop across steps (threshold: ${threshold}); ` +
            'halting before executing tool calls',
        }
        this.state.isComplete = true
      } else {
        // Partition tools into parallelizable (read-only) and sequential (side effects)
        const parallelizableTools = [
          'read_files',
          'list_directory',
          'search_code',
          'search_code_ast',
          'search_codebase',
        ]
        const partitionedTools = preparedToolCalls.reduce(
          (acc, tool) => {
            const toolName = tool.toolCall.function.name
            if (parallelizableTools.includes(toolName)) {
              acc.parallel.push(tool)
            } else {
              acc.sequential.push(tool)
            }
            return acc
          },
          { parallel: [] as typeof preparedToolCalls, sequential: [] as typeof preparedToolCalls }
        )

        // Execute tools (parallel tools can run concurrently)
        const sequentialTools = partitionedTools.sequential
        const parallelTools = partitionedTools.parallel

        // Execute parallel tools concurrently
        if (parallelTools.length > 0) {
          yield {
            type: 'status',
            content: `Executing ${parallelTools.length} read-only tool(s)`,
          }

          for (const tool of parallelTools) {
            const { toolCall, parsedArgs, dedupKey } = tool
            const toolName = toolCall.function.name

            if (dedupEnabled && seenDedupKeysThisStep.has(dedupKey)) {
              const error =
                `Skipped duplicate tool call within step: ${toolName} ` + '(duplicate tool call)'

              yield this.createToolResultEvent({
                toolCallId: toolCall.id,
                toolName,
                args: parsedArgs,
                output: '',
                error,
              })

              assistantMessage.parts.push({
                id: ascending('part_'),
                messageID,
                sessionID: this.state.sessionID,
                type: 'tool',
                tool: toolName,
                state: {
                  status: 'error',
                  input: parsedArgs,
                  error,
                  time: { start: Date.now(), end: Date.now() },
                },
              })
              continue
            }
            if (dedupEnabled) {
              seenDedupKeysThisStep.add(dedupKey)
            }

            if (
              typeof maxToolCallsPerStep === 'number' &&
              processedToolCallsThisStep >= maxToolCallsPerStep
            ) {
              const error =
                `Reached maximum tool calls per step (${maxToolCallsPerStep}); ` +
                `skipping additional tool call: ${toolName}`

              yield this.createToolResultEvent({
                toolCallId: toolCall.id,
                toolName,
                args: parsedArgs,
                output: '',
                error,
              })

              assistantMessage.parts.push({
                id: ascending('part_'),
                messageID,
                sessionID: this.state.sessionID,
                type: 'tool',
                tool: toolName,
                state: {
                  status: 'error',
                  input: parsedArgs,
                  error,
                  time: { start: Date.now(), end: Date.now() },
                },
              })
              continue
            }

            processedToolCallsThisStep++
            for await (const event of this.executeToolAndAddToMessage(
              toolCall,
              parsedArgs,
              agent,
              messageID,
              assistantMessage
            )) {
              yield event
            }
          }
        }

        // Execute sequential tools in order
        for (const tool of sequentialTools) {
          const { toolCall, parsedArgs, dedupKey } = tool
          const toolName = toolCall.function.name

          if (dedupEnabled && seenDedupKeysThisStep.has(dedupKey)) {
            const error =
              `Skipped duplicate tool call within step: ${toolName} ` + '(duplicate tool call)'

            yield this.createToolResultEvent({
              toolCallId: toolCall.id,
              toolName,
              args: parsedArgs,
              output: '',
              error,
            })

            assistantMessage.parts.push({
              id: ascending('part_'),
              messageID,
              sessionID: this.state.sessionID,
              type: 'tool',
              tool: toolName,
              state: {
                status: 'error',
                input: parsedArgs,
                error,
                time: { start: Date.now(), end: Date.now() },
              },
            })
            continue
          }
          if (dedupEnabled) {
            seenDedupKeysThisStep.add(dedupKey)
          }

          if (
            typeof maxToolCallsPerStep === 'number' &&
            processedToolCallsThisStep >= maxToolCallsPerStep
          ) {
            const error =
              `Reached maximum tool calls per step (${maxToolCallsPerStep}); ` +
              `skipping additional tool call: ${toolName}`

            yield this.createToolResultEvent({
              toolCallId: toolCall.id,
              toolName,
              args: parsedArgs,
              output: '',
              error,
            })

            assistantMessage.parts.push({
              id: ascending('part_'),
              messageID,
              sessionID: this.state.sessionID,
              type: 'tool',
              tool: toolName,
              state: {
                status: 'error',
                input: parsedArgs,
                error,
                time: { start: Date.now(), end: Date.now() },
              },
            })
            continue
          }

          processedToolCallsThisStep++
          for await (const event of this.executeToolAndAddToMessage(
            toolCall,
            parsedArgs,
            agent,
            messageID,
            assistantMessage
          )) {
            yield event
          }
        }
      }
    } else {
      this.state.lastToolLoopSignature = null
      this.state.toolLoopStreak = 0
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

    return { finishReason, messageID }
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
    const startedAt = Date.now()
    let args: Record<string, unknown>
    try {
      args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>
    } catch {
      const error = `Invalid tool arguments for ${toolName}`
      yield this.createToolResultEvent({
        toolCallId: toolCall.id,
        toolName,
        args: {},
        output: '',
        error,
        startedAt,
      })
      return { output: '', error }
    }
    const patterns = this.extractPatterns(toolName, args)
    const riskTier = this.classifyToolRisk(toolName, args)
    const riskPolicyDecision = this.resolveRiskPolicyDecision(toolName, riskTier)

    const hookContext = {
      sessionID: this.state.sessionID,
      step: this.state.step,
      agent,
      messageID,
    }

    await this.executeHook('tool.execute.before', hookContext, { toolName, args })

    if (riskPolicyDecision === 'deny') {
      const error =
        this.config.toolRiskPolicy &&
        ['write_files', 'run_command', 'update_memory_bank', 'task'].includes(toolName)
          ? `Eval mode denied tool: ${toolName}`
          : `Risk policy denied tool: ${toolName} (${riskTier})`
      yield {
        type: 'interrupt_decision',
        content: error,
        interrupt: { toolName, riskTier, decision: 'reject', reason: 'Risk policy deny' },
      }
      yield this.createToolResultEvent({
        toolCallId: toolCall.id,
        toolName,
        args,
        output: '',
        error,
        startedAt,
      })
      return { output: '', error, argsUsed: args }
    }

    if (riskPolicyDecision === 'ask') {
      const interruptResult = yield* this.requestToolInterrupt({
        sessionID: this.state.sessionID,
        messageID,
        toolCallId: toolCall.id,
        toolName,
        args,
        patterns,
        riskTier,
        reason: `Risk-tier policy requires approval for ${toolName}`,
      })
      if (!interruptResult.approved) {
        return { output: '', error: interruptResult.error ?? 'Tool interrupted', argsUsed: args }
      }
      args = interruptResult.args
    }

    for (const pattern of patterns) {
      const decision = checkPermission(agent.permission, toolName, pattern || undefined)
      if (decision === 'deny') {
        yield this.createToolResultEvent({
          toolCallId: toolCall.id,
          toolName,
          args,
          output: '',
          error: `Permission denied for tool: ${toolName}${pattern ? ` (${pattern})` : ''}`,
          startedAt,
        })
        return { output: '', error: `Permission denied for tool: ${toolName}`, argsUsed: args }
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
          return { output: '', error: `Permission denied: ${result.reason}`, argsUsed: args }
        }
      }
    }

    if (toolName === 'task') {
      const subagentType = args.subagent_type
      const prompt = args.prompt
      const description = args.description

      if (
        typeof subagentType !== 'string' ||
        typeof prompt !== 'string' ||
        typeof description !== 'string'
      ) {
        const error = 'Invalid task tool arguments'
        yield this.createToolResultEvent({
          toolCallId: toolCall.id,
          toolName,
          args,
          output: '',
          error,
          startedAt,
        })
        return { output: '', error, argsUsed: args }
      }

      const currentDepth = this.config.subagentDepth ?? 0
      const maxDepth = this.config.maxSubagentDepth ?? 0
      if (currentDepth >= maxDepth) {
        const error = 'Maximum subagent depth reached'
        yield this.createToolResultEvent({
          toolCallId: toolCall.id,
          toolName,
          args,
          output: '',
          error,
          startedAt,
        })
        return { output: '', error, argsUsed: args }
      }

      const result = {
        output: '',
        metadata: {
          deferredTask: {
            subagentType,
            prompt,
            description,
          },
        },
        argsUsed: args,
      }

      await this.executeHook('tool.execute.after', hookContext, {
        toolName,
        args,
        result,
      })

      return result
    }

    const executor = this.toolExecutors.get(toolName)
    if (!executor) {
      const error = `Unknown tool: ${toolName}`
      yield this.createToolResultEvent({
        toolCallId: toolCall.id,
        toolName,
        args,
        output: '',
        error,
        startedAt,
      })
      return { output: '', error, argsUsed: args }
    }

    const cacheKey = this.createToolCallDedupKey(toolName, args)
    if (
      this.config.enableToolCallIdempotencyCache &&
      this.isToolIdempotencyCacheAllowed(toolName)
    ) {
      const cached = this.toolCallResultCache.get(cacheKey)
      if (cached) {
        yield {
          type: 'status',
          content: `Idempotency cache hit for ${toolName}; reusing prior result`,
        }
        yield this.createToolResultEvent({
          toolCallId: toolCall.id,
          toolName,
          args: cached.argsUsed ?? args,
          output: cached.output,
          error: cached.error,
          startedAt,
        })
        return cached
      }
    }

    let lastError: string | undefined
    const maxRetries = Math.max(0, this.config.maxToolExecutionRetries ?? 0)
    const retryableTool = this.isToolRetryAllowed(toolName)

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
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

        if (
          this.config.enableToolCallIdempotencyCache &&
          !result.error &&
          this.isToolIdempotencyCacheAllowed(toolName)
        ) {
          this.toolCallResultCache.set(cacheKey, { ...result, argsUsed: args })
        }

        yield this.createToolResultEvent({
          toolCallId: toolCall.id,
          toolName,
          args,
          output: result.output,
          error: result.error,
          startedAt,
        })

        await this.executeHook('tool.execute.after', hookContext, {
          toolName,
          args,
          result,
        })

        return { ...result, argsUsed: args }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Tool execution failed'
        lastError = errorMessage
        const canRetry =
          retryableTool && attempt < maxRetries && this.isRetryableToolError(errorMessage)

        if (canRetry) {
          yield {
            type: 'status',
            content: `Retrying ${toolName} after transient failure (${attempt + 1}/${maxRetries})`,
          }
          await this.sleep(this.config.toolRetryBackoffMs ?? 200)
          continue
        }

        yield this.createToolResultEvent({
          toolCallId: toolCall.id,
          toolName,
          args,
          output: '',
          error: errorMessage,
          startedAt,
        })
        return { output: '', error: errorMessage, argsUsed: args }
      }
    }

    return { output: '', error: lastError ?? 'Tool execution failed', argsUsed: args }
  }

  private async *executeToolAndAddToMessage(
    toolCall: ToolCall,
    parsedArgs: Record<string, unknown>,
    agent: AgentConfig,
    messageID: Identifier,
    assistantMessage: AssistantMessage
  ): AsyncGenerator<RuntimeEvent, void> {
    if (!this.state) throw new Error('Runtime not initialized')

    const toolIterator = this.executeToolCall(toolCall, agent, messageID)
    let result:
      | {
          output: string
          error?: string
          metadata?: Record<string, unknown>
          argsUsed?: Record<string, unknown>
        }
      | undefined

    while (true) {
      const next = await toolIterator.next()
      if (next.done) {
        result = next.value
        break
      }
      yield next.value
    }

    const toolName = toolCall.function.name
    const argsUsed = result?.argsUsed ?? parsedArgs
    const deferredTask = result?.metadata?.deferredTask as
      | {
          subagentType: string
          prompt: string
          description: string
        }
      | undefined

    if (deferredTask) {
      const deferredStartedAt = Date.now()
      const subtaskPart = createSubtaskPart(
        messageID,
        this.state.sessionID,
        deferredTask.subagentType,
        deferredTask.prompt
      )
      assistantMessage.parts.push(subtaskPart)
      this.state.pendingSubtasks.push({
        part: subtaskPart,
        parentAgent: agent,
        description: deferredTask.description,
        toolCallId: toolCall.id,
        input: argsUsed,
        startedAt: deferredStartedAt,
      })
      return
    }

    assistantMessage.parts.push({
      id: ascending('part_'),
      messageID,
      sessionID: this.state.sessionID,
      type: 'tool',
      tool: toolName,
      state: result?.error
        ? {
            status: 'error',
            input: argsUsed,
            error: result.error,
            time: { start: Date.now(), end: Date.now() },
          }
        : {
            status: 'completed',
            input: argsUsed,
            output: result?.output ?? '',
            metadata: result?.metadata,
            time: { start: Date.now(), end: Date.now() },
          },
    })
  }

  /**
   * Process pending subtasks
   */
  private async *processSubtasks(_agent: AgentConfig): AsyncGenerator<RuntimeEvent> {
    if (!this.state || this.state.pendingSubtasks.length === 0) return

    const subtasksToProcess = [...this.state.pendingSubtasks]
    this.state.pendingSubtasks = []

    // 1. Yield start events for all subagents first (so the UI shows them running in parallel)
    for (const pending of subtasksToProcess) {
      yield {
        type: 'subagent_start',
        subagent: {
          agent: pending.part.agent,
          sessionID: this.state.sessionID,
          id: pending.part.id,
        },
      }
    }

    // 2. Execute all subagents concurrently
    const results = await Promise.all(
      subtasksToProcess.map(async (pending) => {
        const subtask = pending.part
        const subagentConfig = agents.get(subtask.agent)

        if (!subagentConfig) {
          const errorMessage = `Unknown subagent type: ${subtask.agent}`
          return { pending, success: false, errorMessage, taskResult: null }
        }

        try {
          const taskResult = await executeTaskTool(
            {
              subagent_type: subtask.agent,
              prompt: subtask.prompt,
              description: pending.description,
            },
            {
              sessionID: this.state!.sessionID,
              messageID: subtask.messageID,
              parentAgent: pending.parentAgent,
              runSubagent: async (childAgent, prompt, childSessionID) =>
                this.runSubagent(childAgent, prompt, childSessionID),
            }
          )
          return { pending, success: true, errorMessage: taskResult.error, taskResult }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown subagent execution error'
          return { pending, success: false, errorMessage, taskResult: null }
        }
      })
    )

    // 3. Yield completion events for all subagents
    for (const res of results) {
      const { pending, success, errorMessage, taskResult } = res
      const subtask = pending.part

      if (!success || !taskResult) {
        subtask.result = { output: '', parts: [] }
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
          ...this.createToolResultEvent({
            toolCallId: pending.toolCallId ?? subtask.id,
            toolName: 'task',
            args: pending.input ?? {
              subagent_type: subtask.agent,
              prompt: subtask.prompt,
              description: pending.description,
            },
            output: '',
            error: errorMessage,
            startedAt: pending.startedAt,
          }),
        }

        yield {
          type: 'subagent_complete',
          subagent: {
            agent: subtask.agent,
            sessionID: this.state.sessionID,
            id: subtask.id,
            success: false,
            error: errorMessage,
          },
        }
      } else {
        subtask.result = { output: taskResult.output, parts: [] }
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
          ...this.createToolResultEvent({
            toolCallId: pending.toolCallId ?? subtask.id,
            toolName: 'task',
            args: pending.input ?? {
              subagent_type: subtask.agent,
              prompt: subtask.prompt,
              description: pending.description,
            },
            output: taskResult.output,
            ...(taskResult.error ? { error: taskResult.error } : {}),
            startedAt: pending.startedAt,
          }),
        }

        yield {
          type: 'subagent_complete',
          subagent: {
            agent: subtask.agent,
            sessionID: this.state.sessionID,
            id: subtask.id,
            success: !taskResult.error,
            ...(taskResult.error ? { error: taskResult.error } : {}),
          },
        }
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
  private async *performCompaction(_agent: AgentConfig): AsyncGenerator<RuntimeEvent, boolean> {
    if (!this.state) return false

    yield { type: 'compaction', content: 'Compacting context...' }

    const compactionPromise = compaction.compact(
      this.state.sessionID,
      this.state.messages,
      128000,
      async (messages) => {
        // Build conversation text for summarization
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

        // Use LLM for intelligent summarization instead of naive truncation
        const model = _agent.model ?? this.provider.config.defaultModel ?? 'gpt-4o-mini'
        const summaryMessages: CompletionMessage[] = [
          { role: 'user', content: `${SUMMARIZATION_PROMPT}\n\n${content}` },
        ]

        try {
          const completionOptions: CompletionOptions = {
            model,
            messages: summaryMessages,
            temperature: 0.3,
            maxTokens: 2000,
          }

          const result = await this.provider.complete(completionOptions)
          return result.message.content || `Summary of conversation:\n\n${content.slice(0, 4000)}`
        } catch (error) {
          // Fallback to naive truncation if LLM summarization fails
          console.warn('LLM compaction failed, falling back to truncation:', error)
          return `Summary of conversation:\n\n${content.slice(0, 4000)}`
        }
      }
    )
    const compactionBudgetMs = this.config.compactionTimeBudgetMs
    const compactionOutcome = await this.raceWithTimeout(compactionPromise, compactionBudgetMs)

    if (compactionOutcome.timedOut) {
      yield {
        type: 'compaction',
        content:
          `Compaction budget exceeded (${compactionBudgetMs}ms); ` +
          'deferring compaction and continuing step',
      }
      return false
    }

    const result = compactionOutcome.value

    if (!result.error) {
      if (result.messages) {
        this.state.messages = result.messages
      }
      yield {
        type: 'compaction',
        content: `Compacted ${result.messagesCompacted} messages (${result.tokensBefore} → ${result.tokensAfter} tokens)`,
      }
    }

    return true
  }

  private async *captureStepSnapshot(
    _agent: AgentConfig,
    messageID: Identifier
  ): AsyncGenerator<RuntimeEvent> {
    if (!this.state || !this.config.enableSnapshots) return

    const timeoutMs = this.config.snapshotTimeoutMs
    const failureMode = this.config.snapshotFailureMode ?? 'warn'

    try {
      const outcome = await this.raceWithTimeout(
        snapshots.track(this.state.sessionID, messageID, this.state.step),
        timeoutMs
      )

      if (outcome.timedOut) {
        const timeoutError = new Error(`Snapshot timeout after ${timeoutMs}ms`)
        if (failureMode === 'error') {
          throw timeoutError
        }
        yield {
          type: 'status',
          content: `Snapshot warning: ${timeoutError.message}; continuing without snapshot`,
        }
        return
      }

      if (outcome.value) {
        yield {
          type: 'snapshot',
          content: `Step ${outcome.value.step} snapshot created`,
          snapshot: {
            hash: outcome.value.hash,
            step: outcome.value.step,
            files: outcome.value.files,
            timestamp: outcome.value.timestamp,
          },
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Snapshot failed'
      if (failureMode === 'error') {
        throw error
      }
      yield {
        type: 'status',
        content: `Snapshot warning: ${errorMessage}; continuing without snapshot`,
      }
    }
  }

  private async raceWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs?: number
  ): Promise<{ timedOut: false; value: T } | { timedOut: true }> {
    if (typeof timeoutMs !== 'number') {
      return { timedOut: false, value: await promise }
    }

    let timer: ReturnType<typeof setTimeout> | undefined
    const timeoutPromise = new Promise<{ timedOut: true }>((resolve) => {
      timer = setTimeout(() => resolve({ timedOut: true }), timeoutMs)
    })

    // Prevent late rejections from timed-out work from becoming unhandled.
    void promise.catch(() => undefined)

    try {
      const result = await Promise.race([
        promise.then((value) => ({ timedOut: false as const, value })),
        timeoutPromise,
      ])
      return result
    } finally {
      if (timer) clearTimeout(timer)
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

  private classifyToolRisk(toolName: string, args: Record<string, unknown>): ToolRiskTier {
    const override = this.config.toolRiskOverrides?.[toolName]
    if (override) return override

    if (toolName === 'run_command') {
      const analysis = analyzeCommand(String(args.command ?? ''))
      if (analysis.kind === 'pipeline' && !analysis.requiresApproval) return 'low'
      if (analysis.kind === 'chain') return 'high'
      if (analysis.kind === 'redirect') return 'critical'
      return 'critical'
    }
    if (toolName === 'write_files') return 'high'
    if (toolName === 'update_memory_bank') return 'medium'
    if (toolName === 'task') return 'high'
    if (
      toolName.startsWith('search_') ||
      toolName === 'read_files' ||
      toolName === 'list_directory'
    ) {
      return 'low'
    }

    return 'medium'
  }

  private resolveRiskPolicyDecision(
    toolName: string,
    riskTier: ToolRiskTier
  ): 'allow' | 'deny' | 'ask' {
    const explicit = this.config.toolRiskPolicy?.[riskTier]
    if (explicit) return explicit

    // Conservative defaults only for highest-risk operations, preserving current behavior elsewhere.
    if (toolName === 'run_command') return 'ask'
    if (toolName === 'write_files') return 'ask'
    return 'allow'
  }

  private async *requestToolInterrupt(
    request: ToolInterruptRequest
  ): AsyncGenerator<
    RuntimeEvent,
    { approved: boolean; args: Record<string, unknown>; error?: string }
  > {
    yield {
      type: 'interrupt_request',
      content: request.reason,
      interrupt: {
        toolName: request.toolName,
        riskTier: request.riskTier,
        reason: request.reason,
      },
    }

    const handler = this.config.onToolInterrupt
    if (!handler) {
      yield {
        type: 'interrupt_decision',
        content: `No interrupt handler configured for ${request.toolName}; proceeding to standard permissions`,
        interrupt: {
          toolName: request.toolName,
          riskTier: request.riskTier,
          decision: 'approve',
          reason: 'No interrupt handler configured',
        },
      }
      return { approved: true, args: request.args }
    }

    let result: ToolInterruptResult
    try {
      result = await handler(request)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Interrupt handler failed'
      yield {
        type: 'interrupt_decision',
        content: `Interrupt rejected ${request.toolName}: ${errorMessage}`,
        interrupt: {
          toolName: request.toolName,
          riskTier: request.riskTier,
          decision: 'reject',
          reason: errorMessage,
        },
      }
      yield {
        ...this.createToolResultEvent({
          toolCallId: request.toolCallId ?? request.messageID,
          toolName: request.toolName,
          args: request.args,
          output: '',
          error: `Interrupted: ${errorMessage}`,
        }),
      }
      return { approved: false, args: request.args, error: `Interrupted: ${errorMessage}` }
    }

    const decision = result.decision
    if (decision === 'reject') {
      const error = `Interrupted: ${result.reason ?? 'Rejected by user'}`
      yield {
        type: 'interrupt_decision',
        content: error,
        interrupt: {
          toolName: request.toolName,
          riskTier: request.riskTier,
          decision,
          reason: result.reason,
        },
      }
      yield this.createToolResultEvent({
        toolCallId: request.toolCallId ?? request.messageID,
        toolName: request.toolName,
        args: request.args,
        output: '',
        error,
      })
      return { approved: false, args: request.args, error }
    }

    const nextArgs = decision === 'edit' && result.args ? result.args : request.args
    yield {
      type: 'interrupt_decision',
      content:
        decision === 'edit'
          ? `Interrupt edited arguments for ${request.toolName}`
          : `Interrupt approved ${request.toolName}`,
      interrupt: {
        toolName: request.toolName,
        riskTier: request.riskTier,
        decision,
        reason: result.reason,
      },
    }
    return { approved: true, args: nextArgs }
  }

  private isToolRetryAllowed(toolName: string): boolean {
    return !['write_files', 'run_command', 'task', 'update_memory_bank'].includes(toolName)
  }

  private isToolIdempotencyCacheAllowed(toolName: string): boolean {
    return !['write_files', 'run_command', 'task', 'update_memory_bank'].includes(toolName)
  }

  private createToolResultEvent(args: {
    toolCallId: string
    toolName: string
    args: Record<string, unknown>
    output: string
    error?: string
    startedAt?: number
    finishedAt?: number
  }): RuntimeEvent {
    const finishedAt = args.finishedAt ?? Date.now()
    const startedAt = args.startedAt ?? finishedAt
    return {
      type: 'tool_result',
      toolResult: {
        toolCallId: args.toolCallId,
        toolName: args.toolName,
        args: args.args,
        output: args.output,
        ...(args.error ? { error: args.error } : {}),
        durationMs: Math.max(0, finishedAt - startedAt),
      },
    }
  }

  private isRetryableToolError(errorMessage: string): boolean {
    const message = errorMessage.toLowerCase()
    return (
      message.includes('timeout') ||
      message.includes('timed out') ||
      message.includes('econnreset') ||
      message.includes('eai_again') ||
      message.includes('temporar') ||
      message.includes('429') ||
      message.includes('rate limit')
    )
  }

  private async sleep(ms: number): Promise<void> {
    if (ms <= 0) return
    await new Promise((resolve) => setTimeout(resolve, ms))
  }

  private createToolCallDedupKey(toolName: string, args: Record<string, unknown>): string {
    return `${toolName}:${this.normalizeToolArgs(args)}`
  }

  private normalizeToolArgs(value: unknown): string {
    if (value === null || typeof value !== 'object') {
      return JSON.stringify(value)
    }

    if (Array.isArray(value)) {
      return `[${value.map((item) => this.normalizeToolArgs(item)).join(',')}]`
    }

    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b)
    )
    return `{${entries
      .map(([key, entryValue]) => `${JSON.stringify(key)}:${this.normalizeToolArgs(entryValue)}`)
      .join(',')}}`
  }

  private applyToolLoopGuard(toolKeysForStep: string[]): { triggered: boolean; warned: boolean } {
    if (!this.state) return { triggered: false, warned: false }

    const threshold = this.config.toolLoopThreshold
    if (typeof threshold !== 'number' || threshold <= 0) return { triggered: false, warned: false }

    // Track per-tool-call frequency across session
    for (const key of toolKeysForStep) {
      const currentFreq = this.state.toolCallFrequency.get(key) ?? 0
      this.state.toolCallFrequency.set(key, currentFreq + 1)
    }

    // Add to sliding window history
    const signature = toolKeysForStep.join('\x1f')
    this.state.toolCallHistory.push(signature)
    // Keep only recent history for pattern detection (sliding window)
    const windowSize = threshold * 4 // Allow for some variation
    if (this.state.toolCallHistory.length > windowSize) {
      this.state.toolCallHistory.shift()
    }

    // Check for cyclic pattern detection (A→B→A→B pattern)
    if (this.detectCyclicPattern()) {
      const shouldWarn = this.shouldWarnAboutDoomLoop()
      if (shouldWarn) {
        return { triggered: false, warned: true }
      }
      return { triggered: this.handleDoomLoop(toolKeysForStep), warned: false }
    }

    if (toolKeysForStep.length === 0) {
      this.state.lastToolLoopSignature = null
      this.state.toolLoopStreak = 0
      return { triggered: false, warned: false }
    }

    if (this.state.lastToolLoopSignature === signature) {
      const nextStreak = this.state.toolLoopStreak + 1

      // Progressive intervention: warn at threshold - 1
      if (nextStreak === threshold - 1 && this.shouldWarnAboutDoomLoop()) {
        return { triggered: false, warned: true }
      }

      if (nextStreak > threshold) {
        return { triggered: this.handleDoomLoop(toolKeysForStep), warned: false }
      }
      this.state.toolLoopStreak = nextStreak
      return { triggered: false, warned: false }
    }

    this.state.lastToolLoopSignature = signature
    this.state.toolLoopStreak = 1
    return { triggered: false, warned: false }
  }

  /**
   * Check if we should warn the LLM about potential doom loop
   * Only warn once per intervention point
   */
  private shouldWarnAboutDoomLoop(): boolean {
    if (!this.state) return false

    const currentStep = this.state.step
    // Only warn if we haven't warned in this step already
    if (currentStep === this.state.lastInterventionStep) {
      return false
    }
    this.state.lastInterventionStep = currentStep
    return true
  }

  /**
   * Detect cyclic patterns like A→B→A→B in tool call history
   */
  private detectCyclicPattern(): boolean {
    if (!this.state) return false

    const history = this.state.toolCallHistory
    const threshold = this.config.toolLoopThreshold ?? 3

    // Need at least 4 entries to detect a cycle (A→B→A→B)
    if (history.length < 4) return false

    // Check for A→B→A→B pattern in recent history
    const recent = history.slice(-4)
    const [a, b, c, d] = recent

    if (a === c && b === d && a !== b) {
      // Detected A→B→A→B pattern
      const toolFreq = this.state.toolCallFrequency
      const toolNames = a?.split('\x1f').map((k) => k.split(':')[0]) ?? []

      // Only flag if tools are being called frequently
      const highFreqTools = toolNames.filter((name) => {
        let count = 0
        for (const [key, freq] of toolFreq) {
          if (key.startsWith(`${name}:`) && freq > threshold) {
            count++
          }
        }
        return count > 0
      })

      return highFreqTools.length > 0
    }

    return false
  }

  /**
   * Handle doom loop detection - returns true to indicate hard stop
   */
  private handleDoomLoop(_toolKeysForStep: string[]): boolean {
    // Always hard stop when doom loop is detected
    return true
  }

  private serializeStateForCheckpoint(): RuntimeCheckpointState | null {
    if (!this.state) return null

    return {
      sessionID: this.state.sessionID,
      messages: structuredClone(this.state.messages),
      step: this.state.step,
      isComplete: this.state.isComplete,
      isLastStep: this.state.isLastStep,
      pendingSubtasks: structuredClone(this.state.pendingSubtasks),
      cost: this.state.cost,
      tokens: { ...this.state.tokens },
      lastToolLoopSignature: this.state.lastToolLoopSignature,
      toolLoopStreak: this.state.toolLoopStreak,
      toolCallHistory: this.state.toolCallHistory,
      toolCallFrequency: Array.from(this.state.toolCallFrequency.entries()),
      cyclicPatternDetected: this.state.cyclicPatternDetected,
      lastInterventionStep: this.state.lastInterventionStep,
    }
  }

  private restoreStateFromCheckpoint(checkpointState: RuntimeCheckpointState): RuntimeState {
    return {
      sessionID: checkpointState.sessionID,
      messages: structuredClone(checkpointState.messages),
      step: checkpointState.step,
      isComplete: checkpointState.isComplete,
      isLastStep: checkpointState.isLastStep,
      abortController: new AbortController(),
      pendingSubtasks: structuredClone(checkpointState.pendingSubtasks) as PendingSubtask[],
      cost: checkpointState.cost,
      tokens: { ...checkpointState.tokens },
      lastToolLoopSignature: checkpointState.lastToolLoopSignature,
      toolLoopStreak: checkpointState.toolLoopStreak,
      toolCallHistory: checkpointState.toolCallHistory ?? [],
      toolCallFrequency: new Map(checkpointState.toolCallFrequency ?? []),
      cyclicPatternDetected: checkpointState.cyclicPatternDetected ?? false,
      lastInterventionStep: checkpointState.lastInterventionStep ?? 0,
    }
  }

  private async saveCheckpoint(agentName: string, reason: RuntimeCheckpointReason): Promise<void> {
    const checkpointStore = this.config.checkpointStore
    if (!checkpointStore) return

    const state = this.serializeStateForCheckpoint()
    if (!state) return

    const checkpoint: RuntimeCheckpoint = {
      version: 1,
      sessionID: state.sessionID,
      agentName,
      reason,
      savedAt: Date.now(),
      state,
    }

    await checkpointStore.save(checkpoint)
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
    hookType: HookType,
    context: { sessionID: Identifier; step: number; agent: AgentConfig; messageID: Identifier },
    data: T
  ): Promise<T> {
    return plugins.executeHooks(hookType, context, data)
  }

  /**
   * Verify and finalize the active specification
   */
  private async *verifyAndFinalizeSpec(
    sessionID: Identifier,
    agent: AgentConfig
  ): AsyncGenerator<RuntimeEvent> {
    if (!this.state?.activeSpec) return

    const spec = this.state.activeSpec

    // Gather execution results
    const executionResults = {
      filesModified: this.gatherModifiedFiles(),
      commandsRun: this.gatherCommandsRun(),
      errors: this.gatherErrors(),
      output: this.gatherOutput(),
    }

    // Execute verification
    const verification = await this.specEngine.verify(spec, executionResults)

    await this.executeHook(
      'spec.verify',
      { sessionID, step: this.state.step, agent, messageID: '' },
      verification
    )

    // Update spec status based on verification
    if (verification.passed) {
      this.state.activeSpec = this.specEngine.markVerified(spec, verification.criterionResults)
    } else {
      this.state.activeSpec = this.specEngine.markFailed(spec, verification.summary)
    }

    await this.executeHook(
      'spec.execute.after',
      { sessionID, step: this.state.step, agent, messageID: '' },
      { spec: this.state.activeSpec, verification }
    )

    // Yield verification event
    yield {
      type: 'spec_verification',
      spec: this.state.activeSpec,
      verification: {
        passed: verification.passed,
        results: verification.criterionResults.map((r) => ({
          criterionId: r.criterionId,
          passed: r.passed,
          message: r.message,
        })),
      },
    }
  }

  /**
   * Gather modified files from tool calls
   */
  private gatherModifiedFiles(): string[] {
    if (!this.state) return []

    const modifiedFiles: string[] = []

    for (const message of this.state.messages) {
      if (message.role === 'assistant') {
        for (const part of message.parts) {
          if (part.type === 'tool' && part.state.status === 'completed') {
            // Extract file paths from tool calls
            const input = part.state.input as Record<string, unknown> | undefined
            if (input) {
              if (Array.isArray(input.paths)) {
                modifiedFiles.push(...input.paths.map((p) => String(p)))
              }
              if (Array.isArray(input.files)) {
                modifiedFiles.push(
                  ...input.files.map((f: { path?: string }) => f.path || '').filter(Boolean)
                )
              }
              if (typeof input.path === 'string') {
                modifiedFiles.push(input.path)
              }
              if (typeof input.file_path === 'string') {
                modifiedFiles.push(input.file_path)
              }
            }
          }
        }
      }
    }

    return [...new Set(modifiedFiles)]
  }

  /**
   * Gather commands run from tool calls
   */
  private gatherCommandsRun(): string[] {
    if (!this.state) return []

    const commands: string[] = []

    for (const message of this.state.messages) {
      if (message.role === 'assistant') {
        for (const part of message.parts) {
          if (part.type === 'tool' && part.tool === 'run_command') {
            const input = part.state.input as { command?: string } | undefined
            if (input?.command) {
              commands.push(input.command)
            }
          }
        }
      }
    }

    return commands
  }

  /**
   * Gather errors from execution
   */
  private gatherErrors(): string[] {
    if (!this.state) return []

    const errors: string[] = []

    for (const message of this.state.messages) {
      if (message.role === 'assistant') {
        for (const part of message.parts) {
          if (part.type === 'tool' && part.state.status === 'error') {
            const errorState = part.state as { error?: string }
            if (errorState.error) {
              errors.push(errorState.error)
            }
          }
        }
      }
    }

    return errors
  }

  /**
   * Gather output from assistant messages
   */
  private gatherOutput(): string {
    if (!this.state) return ''

    const outputs: string[] = []

    for (const message of this.state.messages) {
      if (message.role === 'assistant') {
        for (const part of message.parts) {
          if (part.type === 'text') {
            outputs.push(part.text)
          }
        }
      }
    }

    return outputs.join('\n')
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
