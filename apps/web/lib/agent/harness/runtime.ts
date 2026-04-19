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
import { AGENT_TOOLS, type AgentToolDefinition } from '../tools'
import { evaluate, narrowRulesForSubagent } from './permission/evaluate'
import { analyzeCommand } from '../command-analysis'
import { ascending } from './identifier'
import { agents } from './agents'
import { PermissionManager, checkPermission } from './permissions'
import { plugins } from './plugins'
import { repairJSON, fuzzyMatchToolName, safeJSONParse } from './tool-repair'
import { compaction, needsCompaction, SUMMARIZATION_PROMPT } from './compaction'
import { withTimeoutAndRetry, isContextOverflowError } from '../../llm/stream-resilience'
import { snapshots } from './snapshots'
import { createSubtaskPart, executeTaskTool, getTaskToolDefinitions } from './task-tool'
import { createToolResultEvent } from './runtime-events'
import {
  createToolCallDedupKey,
  isRetryableToolError,
  isToolIdempotencyCacheAllowed,
  isToolRetryAllowed,
  sleep,
} from './runtime-tools'
import { detectCyclicToolPattern } from './runtime-loop-guard'
import { extractFilePaths, isFileCoveredBySpec } from '../spec/drift-detection'
import { appLog, createSessionLogger } from '@/lib/logger'
import type {
  RuntimeCheckpoint,
  RuntimeCheckpointPendingSubtask,
  RuntimeCheckpointReason,
  RuntimeCheckpointState,
} from './checkpoint-store'
import {
  restoreRuntimeCheckpointState,
  serializeRuntimeCheckpointState,
  type RuntimeCheckpointSerializableState,
} from './runtime-checkpoint'
import {
  gatherCommandsRun,
  gatherErrors,
  gatherModifiedFiles,
  gatherOutput,
} from './runtime-summary'
import { SpecEngine, createSpecEngine, type SpecGenerationContext } from '../spec/engine'
import { DefaultSpecLifecycleManager, type SpecLifecycleManager } from '../spec/lifecycle-manager'
import { sanitizeText } from './stream-sanitizer'
import { runPreflight } from './preflight'
import { getGrammarsForModel } from '../providers/model-capabilities'
import type { ChatMode } from '../chat-modes'

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
  /** Incremental checkpoint optimization: cached message snapshot */
  checkpointMessageSnapshot: Message[] | null
  /** Whether messages array has changed since last checkpoint snapshot */
  messagesDirtySinceCheckpoint: boolean
  /** Tracks consecutive compaction failures to break death spirals */
  consecutiveCompactionFailures: number
  /** Consecutive narration turns without tool calls in build mode */
  consecutiveNarrationTurns: number
}

export function buildActiveSpecSystemContent(spec: FormalSpecification): string {
  const lines: string[] = [
    '## Active Specification',
    `**Goal:** ${spec.intent.goal}`,
    `**Status:** ${spec.status} (Tier: ${spec.tier})`,
    '',
  ]

  if (spec.intent.constraints.length > 0) {
    lines.push('**Constraints:**')
    for (const c of spec.intent.constraints) {
      lines.push(
        `- [${c.type}] ${'requirement' in c ? c.requirement : 'rule' in c ? c.rule : 'assertion' in c ? c.assertion : JSON.stringify(c)}`
      )
    }
    lines.push('')
  }

  if (spec.intent.acceptanceCriteria.length > 0) {
    lines.push('**Acceptance Criteria:**')
    for (const a of spec.intent.acceptanceCriteria) {
      lines.push(`- ${a.behavior}`)
    }
    lines.push('')
  }

  if (spec.plan.steps.length > 0) {
    lines.push('**Execution Plan:**')
    for (let i = 0; i < spec.plan.steps.length; i++) {
      lines.push(`${i + 1}. ${spec.plan.steps[i].description}`)
    }
    lines.push('')
  }

  lines.push(
    '**Scope Rule:** Only modify files in plan scope. Out-of-scope writes will be flagged.'
  )

  return lines.join('\n')
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
  | 'warning'
  | 'complete'
  // SpecNative events
  | 'spec_pending_approval'
  | 'spec_generated'
  | 'spec_verification'
  | 'drift_detected'

/**
 * Runtime event
 */
export interface RuntimeEvent {
  type: RuntimeEventType
  content?: string
  compaction?: {
    phase: 'start' | 'deferred' | 'complete'
  }
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
  // Warning event fields
  message?: string
  pluginName?: string
  hookType?: string
  // SpecNative event fields
  spec?: FormalSpecification
  tier?: SpecTier
  reconcile?: {
    aligned: boolean
    reason: string
    gate?: string
    detail?: string
  }
  verification?: {
    passed: boolean
    results: Array<{
      criterionId: string
      passed: boolean
      message?: string
    }>
  }
  drift?: {
    specId: string
    findings: Array<{ filePath: string; description: string }>
  }
  /** Phase 8 — capability-based permission evaluation result */
  permission?: {
    tool: string
    capability: string
    target?: string
    decision: 'allow' | 'ask' | 'deny'
    source?: string
    reason: string
    mode: string
    agentId: string
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
  toolExecutionTimeoutMs: 300000,
  specEngine: {
    enabled: true,
    autoApproveAmbient: true,
    maxSpecsPerProject: 100,
    enableDriftDetection: true,
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
  private specLifecycleManager: SpecLifecycleManager
  private pendingPluginErrors: RuntimeEvent[] = []
  private permissions!: PermissionManager

  constructor(
    provider: LLMProvider,
    toolExecutors: Map<string, ToolExecutor>,
    config?: Partial<RuntimeConfig>
  ) {
    if (!config?.checkpointStore) {
      throw new Error(
        'Runtime requires a checkpointStore. Use InMemoryCheckpointStore for development or ConvexCheckpointStore for production.'
      )
    }
    this.provider = provider
    this.toolExecutors = toolExecutors
    this.config = { ...DEFAULT_RUNTIME_CONFIG, ...config }
    this.permissions = config?.permissionManager ?? new PermissionManager()
    this.specEngine = createSpecEngine(this.config.specEngine)
    this.specEngine.setProvider(provider)
    this.specLifecycleManager =
      config?.specLifecycleManager ?? new DefaultSpecLifecycleManager(this.specEngine)
    this.specLifecycleManager.setProvider(provider)
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
    const agent = agents.get(userMessage.agent)
    if (!agent) {
      throw new Error(
        `Unknown agent: "${userMessage.agent}". Available agents: ${agents
          .list()
          .map((a) => a.name)
          .join(', ')}`
      )
    }
    const maxSteps = agent.steps ?? this.config.maxSteps ?? 50
    this.state = this.createInitialState(sessionID, [...initialMessages, userMessage])

    // SpecNative: Generate spec before execution if enabled
    if (this.specLifecycleManager.isEnabled()) {
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
    const classification = await this.specLifecycleManager.classify(userMessage, {
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

    const { spec } = await this.specLifecycleManager.generate(userMessage, specContext, tier)

    await this.executeHook(
      'spec.generate.after',
      { sessionID, step: this.state.step, agent, messageID: '' },
      { spec }
    )

    // Validate spec
    const validation = await this.specLifecycleManager.validate(spec)

    await this.executeHook(
      'spec.validate',
      { sessionID, step: this.state.step, agent, messageID: '' },
      validation
    )

    let finalSpec = spec

    if (!validation.isValid) {
      finalSpec = await this.specLifecycleManager.refine(spec, validation.errors)

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
      finalSpec = this.specLifecycleManager.approve(finalSpec)

      await this.executeHook(
        'spec.approve',
        { sessionID, step: this.state.step, agent, messageID: '' },
        { spec: finalSpec }
      )
    } else if (tier === 'ambient') {
      // Auto-approve ambient specs based on config
      if (this.config.specEngine?.autoApproveAmbient !== false) {
        finalSpec = this.specLifecycleManager.markExecuting(finalSpec)
      }
    }

    // Store active spec
    this.state.activeSpec = finalSpec

    // Register with drift detection system
    const { registerActiveSpec } = await import('../spec/drift-detection')
    if (finalSpec.status === 'executing' || finalSpec.status === 'approved') {
      registerActiveSpec(finalSpec)
    }

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

    const agent = agents.get(checkpoint.agentName)
    if (!agent) {
      throw new Error(
        `Unknown agent: "${checkpoint.agentName}". Available agents: ${agents
          .list()
          .map((a) => a.name)
          .join(', ')}`
      )
    }
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
      checkpointMessageSnapshot: null,
      messagesDirtySinceCheckpoint: true,
      consecutiveCompactionFailures: 0,
      consecutiveNarrationTurns: 0,
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

    const preflightResult = runPreflight({
      providerId: this.provider.name,
      modelId: agent.model ?? this.provider.config.defaultModel ?? '',
      chatMode: (this.config.chatMode as ChatMode) ?? 'ask',
      // The user's explicit chat message is their intent — no separate
      // plan-approval gate is needed at the runtime level.
      hasApprovedPlan: true,
      allowExperimental: this.config.allowExperimentalModels ?? false,
    })
    if (!preflightResult.ok) {
      yield {
        type: 'error',
        error: `Preflight failed [${preflightResult.error.code}]: ${preflightResult.error.message}`,
      }
      return
    }

    const sessionID = this.state.sessionID
    const log = createSessionLogger(sessionID, { agent: agent.name })
    const contextLimit =
      this.config.contextWindowSize ??
      (this.provider.config.auth.baseUrl?.includes('anthropic') ? 200000 : 128000)

    if (options.emitSessionStart) {
      await this.executeHook(
        'session.start',
        { sessionID, step: this.state.step, agent, messageID: '' },
        {}
      )
      log.info('Session started', { maxSteps })
    }

    try {
      while (!this.state.isComplete && this.state.step < maxSteps) {
        // Yield any pending plugin errors
        while (this.pendingPluginErrors.length > 0) {
          const errorEvent = this.pendingPluginErrors.shift()
          if (errorEvent) {
            yield errorEvent
          }
        }

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
            this.state.consecutiveCompactionFailures = 0
            await this.saveCheckpoint(agent.name, 'step')
            continue
          } else {
            this.state.consecutiveCompactionFailures++
            if (this.state.consecutiveCompactionFailures >= 2) {
              yield {
                type: 'error',
                error: 'Compaction failed repeatedly — context is exhausted and cannot be reduced',
              }
              this.state.isComplete = true
              await this.saveCheckpoint(agent.name, 'error')
              return
            }
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
        log.debug('Step completed', { step: this.state.step, finishReason: result.finishReason })

        const isBuilding = this.config.chatMode === 'code' || this.config.chatMode === 'build'
        const stepHadToolCalls = result.finishReason === 'tool-calls'
        if (isBuilding) {
          if (!stepHadToolCalls) {
            this.state.consecutiveNarrationTurns++
            if (this.state.consecutiveNarrationTurns >= 3) {
              yield {
                type: 'error',
                error:
                  'Agent completed its response without executing tools. ' +
                  'If you expected file changes, try rephrasing your request or switching to a different mode.',
              }
              this.state.isComplete = true
              await this.saveCheckpoint(agent.name, 'error')
              return
            }
          } else {
            this.state.consecutiveNarrationTurns = 0
          }
        }

        await this.executeHook(
          'step.end',
          { sessionID, step: this.state.step, agent, messageID: '' },
          { finishReason: result.finishReason }
        )
      }

      if (!this.state.isComplete) {
        log.warn('Max steps reached', { maxSteps, step: this.state.step })
        await this.saveCheckpoint(agent.name, 'error')
        this.cleanupSessionSingletons(sessionID)
        yield {
          type: 'error',
          error: `Agent reached maximum steps (${maxSteps}) without completing`,
        }
        return
      }

      await this.saveCheckpoint(agent.name, 'complete')

      // SpecNative: Post-execution verification
      let verificationOutcome: { passed: boolean; summary: string } = { passed: true, summary: '' }
      if (this.state.activeSpec && !this.config.skipSpecVerification) {
        verificationOutcome = yield* this.verifyAndFinalizeSpec(sessionID, agent)
      }

      // Gate completion on successful verification
      // Only emit 'complete' if verification passed or there's no active spec
      // If verification failed, emit 'error' instead
      if (verificationOutcome.passed) {
        // Spec reconciliation: emit explicit misalignment event and only
        // block completion when enforcement is enabled.
        log.info('Session completed', {
          steps: this.state.step,
          cost: this.state.cost,
          tokens: this.state.tokens,
        })
        yield {
          type: 'complete',
          usage: this.state.tokens,
          cost: this.state.cost,
        }
      } else {
        yield {
          type: 'error',
          error: `Specification verification failed: ${verificationOutcome.summary}`,
        }
        return
      }

      await this.executeHook(
        'session.end',
        { sessionID, step: this.state.step, agent, messageID: '' },
        {}
      )

      // Cleanup singletons after successful session completion
      this.cleanupSessionSingletons(sessionID)
    } catch (error) {
      log.error('Session error', {
        step: this.state.step,
        error: error instanceof Error ? error.message : String(error),
      })
      await this.saveCheckpoint(agent.name, 'error')
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
      // Cleanup singletons even on error
      this.cleanupSessionSingletons(sessionID)
    }
  }

  /**
   * Clean up module-level singletons for a session
   */
  private cleanupSessionSingletons(sessionID: Identifier): void {
    snapshots.clear(sessionID)
    compaction.clearSummary(sessionID)
    this.permissions.clearSession(sessionID)
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
      messages: this.buildCompletionMessages(agent, isLastStep),
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
                completionOptions.messages = this.buildCompletionMessages(agent, isLastStep)
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
      const declaredGrammars = getGrammarsForModel(this.provider.name, completionOptions.model)
      const sanitized = sanitizeText(fullContent, {
        providerId: this.provider.name,
        modelId: completionOptions.model,
        declaredGrammars,
      })

      if (sanitized.kind === 'error') {
        yield {
          type: 'error',
          error: `Grammar leak detected: ${sanitized.error.kind} — ${JSON.stringify(sanitized.error)}`,
        }
        return { finishReason: 'error', messageID }
      }

      if (sanitized.kind === 'extracted') {
        fullContent = sanitized.cleanText
        for (const tc of sanitized.toolCalls) {
          pendingToolCalls.push({
            id: `extracted_${tc.name}_${Date.now()}`,
            type: 'function',
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.arguments),
            },
          })
        }
      }

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
      const availableToolNames = [...this.getToolsForAgent(agent), ...plugins.getTools()].map(
        (t) => t.function.name
      )

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
          dedupKey: createToolCallDedupKey(toolName, parsedArgs),
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

              yield createToolResultEvent({
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

              yield createToolResultEvent({
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

            yield createToolResultEvent({
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

            yield createToolResultEvent({
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
    this.state.messagesDirtySinceCheckpoint = true

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

    const log = createSessionLogger(this.state.sessionID, { agent: agent.name })
    const toolName = toolCall.function.name
    const startedAt = Date.now()
    let args: Record<string, unknown>
    try {
      args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>
    } catch {
      const error = `Invalid tool arguments for ${toolName}`
      yield createToolResultEvent({
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

    // Phase 5 — execution-time capability guard (defense-in-depth, second layer)
    // Catches tools that slipped through tool-list filtering and enforces
    // target-specific rules (e.g. `rm *` in build mode). Returns a structured
    // tool_result so the LLM can see and reason about the denial.
    const modeRules = this.config.permissionRules
    if (modeRules && modeRules.length > 0) {
      const agentTool = AGENT_TOOLS.find((t) => t.function.name === toolName)
      if (agentTool?.capability) {
        const targets = patterns.length > 0 ? patterns : [undefined]
        for (const target of targets) {
          const execResult = evaluate(modeRules, {
            capability: agentTool.capability,
            target,
            mode: this.config.chatMode ?? 'code',
            agentId: agent.name,
          })
          yield {
            type: 'permission_decision',
            permission: {
              tool: toolName,
              capability: agentTool.capability,
              target,
              decision: execResult.decision,
              source: execResult.rule?.source,
              reason: execResult.reason,
              mode: this.config.chatMode ?? 'code',
              agentId: agent.name,
            },
          }

          if (execResult.decision === 'deny') {
            const error = `Permission denied by ${execResult.rule?.source ?? 'mode'} rule: ${execResult.reason}`
            log.warn('Capability denied at execution', {
              tool: toolName,
              target,
              reason: execResult.reason,
            })
            yield createToolResultEvent({
              toolCallId: toolCall.id,
              toolName,
              args,
              output: '',
              error,
              startedAt,
            })
            return { output: '', error, argsUsed: args }
          }
        }
      }
    }

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
      yield createToolResultEvent({
        toolCallId: toolCall.id,
        toolName,
        args,
        output: '',
        error,
        startedAt,
      })
      log.warn('Permission denied', { tool: toolName, step: this.state.step })
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

    // Session-level permission overrides from automation policy.
    // These grant elevated approval for specific tool+pattern combinations
    // (e.g. auto-approve specific command prefixes). The capability-based
    // ruleset already handled deny decisions above — this layer only
    // adds allow overrides for session-scoped automation settings.
    const sessionPerms = this.permissions.getSessionPermissions(this.state.sessionID) ?? {}

    const askPatterns = patterns.filter((pattern) => {
      const sessionDecision = checkPermission(sessionPerms, toolName, pattern || undefined)
      return Object.keys(sessionPerms).length > 0 && sessionDecision === 'ask'
    })

    if (askPatterns.length > 0) {
      const primaryPattern = askPatterns[0]
      let permissionReason: string | undefined
      const permissionMetadata: Record<string, unknown> = {
        args,
        target: primaryPattern,
      }

      if (toolName === 'run_command') {
        const analysis = analyzeCommand(String(args.command ?? ''))
        permissionReason = analysis.reason
        permissionMetadata.analysis = {
          kind: analysis.kind,
          riskTier: analysis.riskTier,
          reason: analysis.reason,
          requiresApproval: analysis.requiresApproval,
        }
        permissionMetadata.reason = analysis.reason
      }

      yield {
        type: 'permission_request',
        content:
          toolName === 'run_command' && permissionReason
            ? `Command approval required: ${permissionReason}`
            : `Permission requested for: ${toolName} (${askPatterns.length} target${askPatterns.length === 1 ? '' : 's'})`,
      }

      for (const pattern of askPatterns) {
        const result = await this.permissions.request(
          this.state.sessionID,
          messageID,
          toolName,
          pattern,
          {
            ...permissionMetadata,
            target: pattern,
          }
        )

        yield {
          type: 'permission_decision',
          content: `${pattern || toolName}: ${result.granted ? 'Granted' : 'Denied'}`,
        }

        if (!result.granted) {
          log.warn('Permission denied', { tool: toolName, step: this.state.step })
          return { output: '', error: `Permission denied: ${result.reason}`, argsUsed: args }
        }
      }
    }

    const scopeViolation = this.getSpecScopeViolation(toolName, args)
    if (scopeViolation) {
      yield createToolResultEvent({
        toolCallId: toolCall.id,
        toolName,
        args,
        output: '',
        error: scopeViolation,
        startedAt,
      })
      return { output: '', error: scopeViolation, argsUsed: args }
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
        yield createToolResultEvent({
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
        yield createToolResultEvent({
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
      yield createToolResultEvent({
        toolCallId: toolCall.id,
        toolName,
        args,
        output: '',
        error,
        startedAt,
      })
      return { output: '', error, argsUsed: args }
    }

    const cacheKey = createToolCallDedupKey(toolName, args)
    if (this.config.enableToolCallIdempotencyCache && isToolIdempotencyCacheAllowed(toolName)) {
      const cached = this.toolCallResultCache.get(cacheKey)
      if (cached) {
        yield {
          type: 'status',
          content: `Idempotency cache hit for ${toolName}; reusing prior result`,
        }
        yield createToolResultEvent({
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
    const retryableTool = isToolRetryAllowed(toolName)

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const timeoutMs = this.config.toolExecutionTimeoutMs ?? 300000
        const result = await Promise.race([
          executor(args, {
            sessionID: this.state.sessionID,
            messageID,
            agent,
            abortSignal: this.state.abortController.signal,
            metadata: () => {},
            ask: async (question: string) => {
              return `User response: ${question}`
            },
          }),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error(`Tool "${toolName}" timed out after ${timeoutMs}ms`)),
              timeoutMs
            )
          ),
        ])

        if (
          this.config.enableToolCallIdempotencyCache &&
          !result.error &&
          isToolIdempotencyCacheAllowed(toolName)
        ) {
          this.toolCallResultCache.set(cacheKey, { ...result, argsUsed: args })
        }

        yield createToolResultEvent({
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
        log.debug('Tool executed', {
          tool: toolName,
          step: this.state.step,
          durationMs: Date.now() - startedAt,
        })

        // Check for drift after tool execution
        if (this.state.activeSpec && this.config.specEngine?.enableDriftDetection) {
          const { getPendingDrifts, clearPendingDrift } = await import('../spec/drift-detection')
          const drifts = getPendingDrifts()
          for (const drift of drifts) {
            if (drift.specId === this.state.activeSpec.id) {
              yield {
                type: 'drift_detected',
                drift: {
                  specId: drift.specId,
                  findings: drift.findings.map((f) => ({
                    filePath: f.filePath,
                    description: f.description ?? '',
                  })),
                },
              }
              for (const finding of drift.findings) {
                await this.executeHook(
                  'spec.drift.detected',
                  { sessionID: this.state.sessionID, step: this.state.step, agent, messageID: '' },
                  { specId: drift.specId, filePath: finding.filePath, reason: finding.description }
                )
              }
              clearPendingDrift(drift.specId)
            }
          }
        }

        return { ...result, argsUsed: args }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Tool execution failed'
        lastError = errorMessage
        const canRetry = retryableTool && attempt < maxRetries && isRetryableToolError(errorMessage)

        if (canRetry) {
          yield {
            type: 'status',
            content: `Retrying ${toolName} after transient failure (${attempt + 1}/${maxRetries})`,
          }
          await sleep(this.config.toolRetryBackoffMs ?? 200)
          continue
        }

        yield createToolResultEvent({
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
          ...createToolResultEvent({
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
          ...createToolResultEvent({
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

    // Phase 7 — narrow parent permission rules to the subagent's capability ceiling.
    // Subagents can never inherit capabilities beyond their maxCapabilities declaration.
    const narrowedRules = narrowRulesForSubagent(
      this.config.permissionRules ?? [],
      agent.maxCapabilities
    )
    const childRuntime = new Runtime(this.provider, this.toolExecutors, {
      ...this.config,
      subagentDepth: currentDepth + 1,
      permissionRules: narrowedRules.length > 0 ? narrowedRules : this.config.permissionRules,
      // Subagents execute a single scoped task — spec generation and
      // verification are handled by the parent session, not children.
      specEngine: { enabled: false },
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

    yield {
      type: 'compaction',
      content: 'Compacting context...',
      compaction: { phase: 'start' },
    }

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
        compaction: { phase: 'deferred' },
      }
      return false
    }

    const result = compactionOutcome.value

    if (!result.error) {
      if (result.messages) {
        this.state.messages = result.messages
        this.state.messagesDirtySinceCheckpoint = true
      }
      yield {
        type: 'compaction',
        content: `Compacted ${result.messagesCompacted} messages (${result.tokensBefore} → ${result.tokensAfter} tokens)`,
        compaction: { phase: 'complete' },
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
  private buildCompletionMessages(agent: AgentConfig, isLastStep: boolean): CompletionMessage[] {
    if (!this.state) return []

    const messages: CompletionMessage[] = []
    const latestUserWithSystem = [...this.state.messages]
      .reverse()
      .find((msg): msg is UserMessage => msg.role === 'user' && typeof msg.system === 'string')

    if (latestUserWithSystem?.system) {
      messages.push({ role: 'system', content: latestUserWithSystem.system })
    }

    if (
      this.state.activeSpec &&
      (this.state.activeSpec.status === 'executing' || this.state.activeSpec.status === 'approved')
    ) {
      messages.push({
        role: 'system',
        content: buildActiveSpecSystemContent(this.state.activeSpec),
      })
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
      if (tool.function.name === 'question' && !this.toolExecutors.has('question')) {
        continue
      }
      byName.set(tool.function.name, tool)
    }

    return Array.from(byName.values()).filter((tool) => {
      // Capability-based mode rule evaluation (unified permission system).
      // Rules are defined per-mode in lib/agent/permission/mode-rulesets.ts
      // and evaluated with last-rule-wins semantics.
      const rules = this.config.permissionRules
      if (rules && rules.length > 0) {
        const agentTool = tool as AgentToolDefinition
        if (agentTool.capability) {
          const result = evaluate(rules, {
            capability: agentTool.capability,
            mode: this.config.chatMode ?? 'code',
            agentId: agent.name,
          })
          if (result.decision === 'deny') return false
        }
      }

      return true
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

  private getSpecScopeViolation(toolName: string, args: Record<string, unknown>): string | null {
    if (!this.state?.activeSpec) return null
    if (toolName !== 'write_files') return null

    const spec = this.state.activeSpec
    const shouldEnforceStrictScope = spec.tier === 'explicit' || spec.status === 'executing'
    if (!shouldEnforceStrictScope) return null

    const targetPaths = extractFilePaths(toolName, args)
    if (targetPaths.length === 0) return null

    const outOfScopePaths = targetPaths.filter((path) => !isFileCoveredBySpec(path, spec))
    if (outOfScopePaths.length === 0) return null

    return (
      `Write target is outside the active spec scope: ${outOfScopePaths.join(', ')}. ` +
      'Update the specification first or restrict changes to declared files.'
    )
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
      const error = `No interrupt handler configured; denying ${request.toolName} (${request.riskTier} risk)`
      yield {
        type: 'interrupt_decision',
        content: error,
        interrupt: {
          toolName: request.toolName,
          riskTier: request.riskTier,
          decision: 'reject',
          reason: 'No interrupt handler configured — fail-deny policy',
        },
      }
      yield createToolResultEvent({
        toolCallId: request.toolCallId ?? request.messageID,
        toolName: request.toolName,
        args: request.args,
        output: '',
        error,
      })
      return { approved: false, args: request.args, error }
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
        ...createToolResultEvent({
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
      yield createToolResultEvent({
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

    return detectCyclicToolPattern({
      history: this.state.toolCallHistory,
      toolCallFrequency: this.state.toolCallFrequency,
      threshold: this.config.toolLoopThreshold ?? 3,
    })
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

    const serialized = serializeRuntimeCheckpointState(
      this.state as RuntimeCheckpointSerializableState
    )
    this.state.checkpointMessageSnapshot = serialized.messages
    this.state.messagesDirtySinceCheckpoint = false
    return serialized
  }

  private restoreStateFromCheckpoint(checkpointState: RuntimeCheckpointState): RuntimeState {
    return {
      ...restoreRuntimeCheckpointState({ checkpointState, config: this.config }),
      abortController: new AbortController(),
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
    const { result, errors } = await plugins.executeHooks(hookType, context, data)

    // Surface plugin hook errors as warning events
    if (errors.length > 0) {
      for (const { plugin, error } of errors) {
        appLog.warn(`[Runtime] Plugin hook error in ${plugin} for ${hookType}:`, error)
        // Emit warning event to runtime event stream for UI visibility
        const warningEvent: RuntimeEvent = {
          type: 'warning',
          step: context.step,
          message: `Plugin '${plugin}' hook '${hookType}' failed: ${error.message}`,
          pluginName: plugin,
          hookType: hookType,
        }
        // We can't yield from here, but we can store for next event cycle
        this.pendingPluginErrors.push(warningEvent)
      }
    }

    return result
  }

  /**
   * Verify and finalize the active specification
   * @returns The verification outcome - whether it passed or failed
   */
  private async *verifyAndFinalizeSpec(
    sessionID: Identifier,
    agent: AgentConfig
  ): AsyncGenerator<RuntimeEvent, { passed: boolean; summary: string }> {
    if (!this.state?.activeSpec) {
      return { passed: true, summary: 'No active spec to verify' }
    }

    const spec = this.state.activeSpec

    // Gather execution results
    const executionResults = {
      filesModified: gatherModifiedFiles(this.state.messages),
      commandsRun: gatherCommandsRun(this.state.messages),
      errors: gatherErrors(this.state.messages),
      output: gatherOutput(this.state.messages),
    }

    // Execute verification
    const verification = await this.specLifecycleManager.verify(spec, executionResults)

    await this.executeHook(
      'spec.verify',
      { sessionID, step: this.state.step, agent, messageID: '' },
      verification
    )

    // Update spec status based on verification
    if (verification.passed) {
      this.state.activeSpec = this.specLifecycleManager.markVerified(
        spec,
        verification.criterionResults
      )
    } else {
      this.state.activeSpec = this.specLifecycleManager.markFailed(spec, verification.summary)
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

    return { passed: verification.passed, summary: verification.summary }
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
