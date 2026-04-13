/**
 * Agent Runtime
 *
 * Compatibility adapter over the harness runtime.
 * The harness is the single execution engine; this module preserves the
 * existing hook/test contract used by the workbench.
 */

import { appLog } from '@/lib/logger'
import type { LLMProvider, CompletionMessage, ReasoningOptions, ToolCall } from '../llm/types'
import { getDefaultProviderCapabilities } from '../llm/types'
import { getDefaultForgeHarnessAgent, getLegacyHarnessAgent } from './chat-modes'
import { getPromptForMode, type PromptContext } from './prompt-library'
import { executeTool, type ToolContext, type ToolExecutionResult } from './tools'
import { resolveAgentSkillsForPromptContext } from './skills/resolver'
import {
  Runtime as HarnessRuntime,
  agents as harnessAgents,
  ascending as harnessAscending,
  permissions as harnessPermissions,
  type Message as HarnessMessage,
  type RuntimeConfig as HarnessRuntimeConfig,
  type RuntimeEvent as HarnessRuntimeEvent,
  type ToolExecutor as HarnessToolExecutor,
  type ToolInterruptRequest as HarnessToolInterruptRequest,
  type UserMessage as HarnessUserMessage,
} from './harness'
import {
  InMemoryCheckpointStore,
  type CheckpointStore as HarnessCheckpointStore,
} from './harness/checkpoint-store'
import { safeJSONParse } from './harness/tool-repair'
import type { Permission as HarnessPermission } from './harness/types'
import type { FormalSpecification, SpecTier } from './spec/types'

const isE2ESpecApprovalModeEnabled = process.env.NEXT_PUBLIC_E2E_AGENT_MODE === 'spec-approval'

export interface RuntimeOptions {
  provider: LLMProvider
  model?: string
  maxIterations?: number
  temperature?: number
  maxTokens?: number
  reasoning?: ReasoningOptions
  harnessCheckpointStore?: HarnessCheckpointStore
  harnessEnableRiskInterrupts?: boolean
  harnessEvalMode?: 'read_only' | 'full'
  harnessSessionPermissions?: HarnessPermission
}

export type AgentEventType =
  | 'status_thinking'
  | 'reasoning'
  | 'thinking'
  | 'progress_step'
  | 'snapshot'
  | 'text'
  | 'tool_call'
  | 'tool_result'
  | 'retry'
  | 'reset'
  | 'error'
  | 'spec_pending_approval'
  | 'spec_generated'
  | 'spec_verification'
  | 'complete'

export interface AgentEvent {
  type: AgentEventType
  content?: string
  progressStatus?: 'running' | 'completed' | 'error'
  progressCategory?: 'analysis' | 'rewrite' | 'tool' | 'complete'
  progressToolName?: string
  progressToolCallId?: string
  progressArgs?: Record<string, unknown>
  progressDurationMs?: number
  progressError?: string
  progressHasArtifactTarget?: boolean
  snapshot?: {
    hash: string
    step: number
    files: string[]
    timestamp: number
  }
  reasoningContent?: string
  toolCall?: ToolCall
  toolResult?: ToolExecutionResult
  spec?: FormalSpecification
  specTier?: SpecTier
  verification?: {
    passed: boolean
    results: Array<{
      criterionId: string
      passed: boolean
      message?: string
    }>
  }
  resetReason?: 'plan_mode_rewrite' | 'build_mode_rewrite'
  error?: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface AgentRuntimeLike {
  run(promptContext: PromptContext, config?: RuntimeConfig): AsyncGenerator<AgentEvent>
  runSync(promptContext: PromptContext): Promise<{
    content: string
    toolResults: ToolExecutionResult[]
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number }
    error?: string
  }>
  resolveSpecApproval?: (
    decision: 'approve' | 'edit' | 'cancel',
    spec?: FormalSpecification
  ) => void
  abort?: () => void
}

export interface RuntimeConfig {
  maxIterations?: number
  maxToolCallsPerIteration?: number
  enableToolDeduplication?: boolean
  toolLoopThreshold?: number
  harnessAgentName?: 'build' | 'code' | 'plan' | 'ask' | 'builder' | 'manager' | 'executive'
  harnessSessionID?: string
  harnessAutoResume?: boolean
  harnessCheckpointStore?: HarnessCheckpointStore
  harnessEnableRiskInterrupts?: boolean
  harnessEvalMode?: 'read_only' | 'full'
  harnessSpecApprovalMode?: 'interactive' | 'auto_approve'
}

function logRuntimeError(message: string, error?: unknown): void {
  appLog.error(`[agent-runtime] ${message}`, error)
}

export function shouldRewriteDiscussResponse(content: string): boolean {
  return content.includes('```')
}

export function shouldRewriteBuildResponse(content: string): boolean {
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

function completionMessagesToHarnessMessages(args: {
  sessionID: string
  messages: CompletionMessage[]
}): { initialMessages: HarnessMessage[]; userMessage: HarnessUserMessage } {
  const systemMessages = args.messages
    .filter((msg) => msg.role === 'system' && typeof msg.content === 'string')
    .map((msg) => msg.content)
    .filter(Boolean)

  const nonSystemMessages = args.messages.filter((msg) => msg.role !== 'system')
  const lastUserIndex = [...nonSystemMessages]
    .map((msg, index) => ({ msg, index }))
    .filter(({ msg }) => msg.role === 'user')
    .map(({ index }) => index)
    .pop()

  const toText = (msg: CompletionMessage): string => {
    if (Array.isArray(msg.content)) {
      return msg.content
        .map((part) => (typeof part === 'string' ? part : JSON.stringify(part)))
        .join('\n')
    }
    return typeof msg.content === 'string' ? msg.content : ''
  }

  const convertToHarness = (msg: CompletionMessage): HarnessMessage | null => {
    if (msg.role === 'user') {
      const id = harnessAscending('msg_')
      return {
        id,
        sessionID: args.sessionID,
        role: 'user',
        time: { created: Date.now() },
        parts: [
          {
            id: harnessAscending('part_'),
            messageID: id,
            sessionID: args.sessionID,
            type: 'text',
            text: toText(msg),
          },
        ],
        agent: 'builder',
      }
    }

    if (msg.role === 'assistant') {
      const id = harnessAscending('msg_')
      return {
        id,
        sessionID: args.sessionID,
        role: 'assistant',
        parentID: harnessAscending('msg_parent_'),
        parts: [
          {
            id: harnessAscending('part_'),
            messageID: id,
            sessionID: args.sessionID,
            type: 'text',
            text: toText(msg),
          },
        ],
        time: { created: Date.now(), completed: Date.now() },
        modelID: 'legacy-context',
        providerID: 'legacy-context',
        mode: 'legacy',
        agent: 'legacy',
      }
    }

    if (msg.role === 'tool') {
      const id = harnessAscending('msg_')
      return {
        id,
        sessionID: args.sessionID,
        role: 'assistant',
        parentID: harnessAscending('msg_parent_'),
        parts: [
          {
            id: harnessAscending('part_'),
            messageID: id,
            sessionID: args.sessionID,
            type: 'text',
            synthetic: true,
            text: `[Tool output]\n${toText(msg)}`,
          },
        ],
        time: { created: Date.now(), completed: Date.now() },
        modelID: 'tool-context',
        providerID: 'tool-context',
        mode: 'legacy',
        agent: 'legacy',
      }
    }

    return null
  }

  const initialMessages = nonSystemMessages
    .filter((_msg, index) => index !== lastUserIndex)
    .map(convertToHarness)
    .filter((msg): msg is HarnessMessage => msg !== null)

  const finalUserContent =
    (lastUserIndex !== undefined ? toText(nonSystemMessages[lastUserIndex]!) : '').trim() ||
    'Continue.'
  const userMessageID = harnessAscending('msg_')
  const userMessage: HarnessUserMessage = {
    id: userMessageID,
    sessionID: args.sessionID,
    role: 'user',
    time: { created: Date.now() },
    parts: [
      {
        id: harnessAscending('part_'),
        messageID: userMessageID,
        sessionID: args.sessionID,
        type: 'text',
        text: finalUserContent,
      },
    ],
    agent: 'builder',
    ...(systemMessages.length > 0 ? { system: systemMessages.join('\n\n') } : {}),
  }

  return { initialMessages, userMessage }
}

function createHarnessToolExecutors(toolContext: ToolContext): Map<string, HarnessToolExecutor> {
  const toolNames = [
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
  ]

  const executors = new Map<string, HarnessToolExecutor>()
  for (const toolName of toolNames) {
    executors.set(toolName, async (args) => {
      const toolCall: ToolCall = {
        id: `harness-tool-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: 'function',
        function: {
          name: toolName,
          arguments: JSON.stringify(args),
        },
      }
      const result = await executeTool(toolCall, toolContext)
      return {
        output: result.output,
        ...(result.error ? { error: result.error } : {}),
      }
    })
  }

  return executors
}

function buildInlineToolCallSummary(content: string): ToolCall[] {
  const supportedNames = new Set([
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
      if (!supportedNames.has(name)) continue
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

function inferPendingToolCallsFromText(content: string): ToolCall[] {
  if (!content.includes('"name"') || !content.includes('"arguments"')) {
    return []
  }
  return buildInlineToolCallSummary(content)
}

export function resolveHarnessAgentName(args: {
  chatMode: PromptContext['chatMode']
  harnessAgentName?: RuntimeConfig['harnessAgentName']
}): string {
  return resolveExecutionHarnessAgentName(args)
}

export function resolveLegacyHarnessAgentName(args: {
  chatMode: PromptContext['chatMode']
  harnessAgentName?: RuntimeConfig['harnessAgentName']
}): string {
  if (args.harnessAgentName) {
    return args.harnessAgentName
  }

  return getLegacyHarnessAgent(args.chatMode)
}

function resolveExecutionHarnessAgentName(args: {
  chatMode: PromptContext['chatMode']
  harnessAgentName?: RuntimeConfig['harnessAgentName']
}): string {
  if (args.harnessAgentName) {
    return args.harnessAgentName
  }

  return getDefaultForgeHarnessAgent(args.chatMode)
}

function createReasoningAwareProvider(
  provider: LLMProvider,
  reasoning: ReasoningOptions | undefined
): LLMProvider {
  const capabilities =
    provider.config.capabilities ?? getDefaultProviderCapabilities(provider.config.provider)
  if (!capabilities.supportsReasoning || !reasoning) {
    return provider
  }

  return {
    ...provider,
    async complete(options) {
      return await provider.complete({ ...options, reasoning })
    },
    async *completionStream(options) {
      yield* provider.completionStream({ ...options, reasoning })
    },
  }
}

function shouldTriggerRewrite(args: {
  promptContext: PromptContext
  content: string
  sawToolCall: boolean
}): boolean {
  if (args.promptContext.chatMode === 'architect') {
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

class HarnessAgentRuntimeAdapter implements AgentRuntimeLike {
  private pendingSpecApprovalResolver:
    | ((value: { decision: 'approve' | 'edit' | 'cancel'; spec?: FormalSpecification }) => void)
    | null = null
  private abortController: AbortController | null = null

  constructor(
    private options: RuntimeOptions,
    private toolContext: ToolContext
  ) {}

  resolveSpecApproval(decision: 'approve' | 'edit' | 'cancel', spec?: FormalSpecification) {
    if (!this.pendingSpecApprovalResolver) return
    this.pendingSpecApprovalResolver({ decision, spec })
    this.pendingSpecApprovalResolver = null
  }

  abort(): void {
    this.abortController?.abort()
  }

  async *run(promptContext: PromptContext, config?: RuntimeConfig): AsyncGenerator<AgentEvent> {
    const resolvedSkills = resolveAgentSkillsForPromptContext(promptContext)
    void resolvedSkills

    const sessionID =
      config?.harnessSessionID ?? `harness_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const riskInterruptsEnabled =
      config?.harnessEnableRiskInterrupts ?? this.options.harnessEnableRiskInterrupts ?? false
    const harnessEvalMode = config?.harnessEvalMode ?? this.options.harnessEvalMode
    const specApprovalMode = config?.harnessSpecApprovalMode ?? 'auto_approve'
    const sessionPermissions = this.options.harnessSessionPermissions
    this.pendingSpecApprovalResolver = null
    this.abortController = new AbortController()

    if (sessionPermissions && Object.keys(sessionPermissions).length > 0) {
      harnessPermissions.setSessionPermissions(sessionID, sessionPermissions)
    }

    const checkpointStore =
      config?.harnessCheckpointStore ??
      this.options.harnessCheckpointStore ??
      new InMemoryCheckpointStore()

    const harnessRuntimeConfig: Partial<HarnessRuntimeConfig> = {
      ...(typeof config?.maxIterations === 'number' ? { maxSteps: config.maxIterations } : {}),
      ...(typeof config?.maxToolCallsPerIteration === 'number'
        ? { maxToolCallsPerStep: config.maxToolCallsPerIteration }
        : {}),
      ...(typeof config?.enableToolDeduplication === 'boolean'
        ? { enableToolDeduplication: config.enableToolDeduplication }
        : {}),
      ...(typeof config?.toolLoopThreshold === 'number'
        ? { toolLoopThreshold: config.toolLoopThreshold }
        : {}),
      checkpointStore,
      ...(riskInterruptsEnabled
        ? {
            toolRiskPolicy: { high: 'ask', critical: 'ask' as const },
            onToolInterrupt: async (request: HarnessToolInterruptRequest) => {
              const target = request.patterns[0] || request.toolName
              const permissionResult = await harnessPermissions.request(
                request.sessionID,
                request.messageID,
                request.toolName,
                target,
                {
                  interrupt: true,
                  riskTier: request.riskTier,
                  reason: request.reason,
                  args: request.args,
                }
              )

              return permissionResult.granted
                ? { decision: 'approve' as const, reason: permissionResult.reason }
                : { decision: 'reject' as const, reason: permissionResult.reason ?? 'Denied' }
            },
          }
        : {}),
      ...(harnessEvalMode === 'read_only'
        ? {
            toolRiskOverrides: {
              write_files: 'critical' as const,
              apply_patch: 'critical' as const,
              run_command: 'critical' as const,
              update_memory_bank: 'critical' as const,
              task: 'critical' as const,
            },
            toolRiskPolicy: {
              low: 'allow' as const,
              medium: 'allow' as const,
              high: 'deny' as const,
              critical: 'deny' as const,
            },
          }
        : {}),
      maxToolExecutionRetries: 1,
      toolRetryBackoffMs: 200,
      specEngine: {
        enabled: true,
        autoApproveAmbient: true,
        ...(isE2ESpecApprovalModeEnabled ? { defaultTier: 'explicit' as const } : {}),
      },
      onSpecApproval: async ({ spec }) => {
        if (specApprovalMode !== 'interactive') {
          return { decision: 'approve' as const, spec }
        }

        return await new Promise<{
          decision: 'approve' | 'edit' | 'cancel'
          spec?: FormalSpecification
        }>((resolve) => {
          this.pendingSpecApprovalResolver = resolve
        })
      },
    }

    const harnessProvider = createReasoningAwareProvider(
      this.options.provider,
      this.options.reasoning
    )
    const harnessRuntime = new HarnessRuntime(
      harnessProvider,
      createHarnessToolExecutors(this.toolContext),
      harnessRuntimeConfig
    )

    const completionMessages = getPromptForMode(promptContext)
    const { initialMessages, userMessage } = completionMessagesToHarnessMessages({
      sessionID,
      messages: completionMessages,
    })

    const harnessAgentName = resolveHarnessAgentName({
      chatMode: promptContext.chatMode,
      harnessAgentName: config?.harnessAgentName,
    })
    userMessage.agent = harnessAgents.has(harnessAgentName) ? harnessAgentName : 'build'

    let attemptText = ''
    let sawToolCall = false
    let fenceTriggered = false
    // Architect mode: tracks whether the stream is currently inside a fenced block
    // so we can filter it inline rather than aborting the stream entirely.
    let inArchitectFence = false
    let pendingComplete: AgentEvent | null = null

    let shouldResume = false
    if (config?.harnessAutoResume) {
      try {
        const checkpoint = await checkpointStore.load(sessionID)
        shouldResume = checkpoint !== null && checkpoint.reason !== 'complete'
      } catch (error) {
        logRuntimeError('Failed to load harness checkpoint, falling back to fresh run', error)
        shouldResume = false
      }
    }
    const source = shouldResume
      ? harnessRuntime.resume(sessionID)
      : harnessRuntime.run(sessionID, userMessage, initialMessages)

    for await (const event of source) {
      if (this.abortController?.signal.aborted) {
        return
      }

      const mapped = mapHarnessEventToAgentEvent(event)
      if (!mapped) continue

      if (mapped.type === 'tool_call') {
        sawToolCall = true
        yield {
          type: 'progress_step',
          content: `Running tool: ${mapped.toolCall?.function.name ?? 'unknown'}`,
          progressStatus: 'running',
          progressCategory: 'tool',
          progressToolName: mapped.toolCall?.function.name,
          progressToolCallId: mapped.toolCall?.id,
          progressArgs: mapped.toolCall
            ? (safeJSONParse<Record<string, unknown>>(mapped.toolCall.function.arguments, {}) ?? {})
            : undefined,
          progressHasArtifactTarget:
            mapped.toolCall?.function.name === 'write_files' ||
            mapped.toolCall?.function.name === 'run_command' ||
            mapped.toolCall?.function.name === 'apply_patch',
        }
        yield mapped
        continue
      }

      if (mapped.type === 'tool_result') {
        yield {
          type: 'progress_step',
          content: `Tool ${mapped.toolResult?.error ? 'failed' : 'completed'}: ${
            mapped.toolResult?.toolName ?? 'unknown'
          }`,
          progressStatus: mapped.toolResult?.error ? 'error' : 'completed',
          progressCategory: 'tool',
          progressToolName: mapped.toolResult?.toolName,
          progressToolCallId: mapped.toolResult?.toolCallId,
          progressArgs: mapped.toolResult?.args,
          progressDurationMs: mapped.toolResult?.durationMs,
          progressError: mapped.toolResult?.error,
          progressHasArtifactTarget:
            mapped.toolResult?.toolName === 'write_files' ||
            mapped.toolResult?.toolName === 'run_command' ||
            mapped.toolResult?.toolName === 'apply_patch',
        }
        yield mapped
        continue
      }

      if (mapped.type === 'text' && mapped.content) {
        if (promptContext.chatMode === 'architect') {
          // Architect (plan) mode: stream all tokens but silently drop content inside
          // fenced code blocks. This keeps the chat flowing while enforcing the
          // "no large code blocks" contract without aborting the stream entirely.
          let chunk = mapped.content
          let filtered = ''
          while (chunk.length > 0) {
            const markerIdx = chunk.indexOf('```')
            if (markerIdx === -1) {
              if (!inArchitectFence) filtered += chunk
              break
            }
            if (!inArchitectFence) {
              filtered += chunk.slice(0, markerIdx)
              inArchitectFence = true
            } else {
              inArchitectFence = false
            }
            chunk = chunk.slice(markerIdx + 3)
          }
          attemptText += filtered
          if (filtered) yield { ...mapped, content: filtered }
          continue
        }

        // Build mode: break on first fence and trigger a rewrite so the LLM
        // re-executes using tools instead of outputting code in chat.
        if (promptContext.chatMode === 'build') {
          const combined = attemptText + mapped.content
          const fenceIndex = combined.indexOf('```')
          if (fenceIndex !== -1) {
            const safePrefixLength = Math.max(0, fenceIndex - attemptText.length)
            if (safePrefixLength > 0) {
              const safeText = mapped.content.slice(0, safePrefixLength)
              attemptText += safeText
              yield { ...mapped, content: safeText }
            }
            fenceTriggered = true
            break
          }
        }
        attemptText += mapped.content
        yield mapped
        continue
      }

      if (mapped.type === 'complete') {
        pendingComplete = {
          ...mapped,
          content: attemptText,
        }
        continue
      }

      yield mapped
    }

    if (
      fenceTriggered ||
      shouldTriggerRewrite({ promptContext, content: attemptText, sawToolCall })
    ) {
      // Rewrite only fires for build mode — architect handles fenced blocks inline.
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
      yield {
        type: 'reset',
        resetReason: 'build_mode_rewrite',
      }

      const rewriteMessage: CompletionMessage = {
        role: 'user',
        content:
          'Your previous answer included fenced code blocks, which are not allowed in Build Mode. If you only provided a plan without using tools, you must now execute the work using tools. Use tool calls only, and keep chat output to a short summary with no fenced code blocks.',
      }

      // Include the first-attempt text so the rewrite LLM has a "previous answer" to work from.
      const rewriteMessages: CompletionMessage[] = [
        ...completionMessages,
        ...(attemptText.trim() ? [{ role: 'assistant' as const, content: attemptText }] : []),
        rewriteMessage,
      ]

      const rewriteSessionID = `${sessionID}-rewrite`
      const { initialMessages: rewriteInitialMessages, userMessage: rewriteUserMessage } =
        completionMessagesToHarnessMessages({
          sessionID: rewriteSessionID,
          messages: rewriteMessages,
        })

      rewriteUserMessage.agent = userMessage.agent

      const rewriteRuntime = new HarnessRuntime(
        harnessProvider,
        createHarnessToolExecutors(this.toolContext),
        {
          ...harnessRuntimeConfig,
          checkpointStore: new InMemoryCheckpointStore(),
          specEngine: {
            ...(harnessRuntimeConfig.specEngine ?? {}),
            enabled: false,
          },
        }
      )

      let rewriteText = ''
      let rewriteComplete: AgentEvent | null = null
      for await (const event of rewriteRuntime.run(
        rewriteSessionID,
        rewriteUserMessage,
        rewriteInitialMessages
      )) {
        const mapped = mapHarnessEventToAgentEvent(event)
        if (!mapped) continue
        if (mapped.type === 'tool_call') {
          yield {
            type: 'progress_step',
            content: `Running tool: ${mapped.toolCall?.function.name ?? 'unknown'}`,
            progressStatus: 'running',
            progressCategory: 'tool',
            progressToolName: mapped.toolCall?.function.name,
            progressToolCallId: mapped.toolCall?.id,
            progressArgs: mapped.toolCall
              ? (safeJSONParse<Record<string, unknown>>(mapped.toolCall.function.arguments, {}) ??
                {})
              : undefined,
            progressHasArtifactTarget:
              mapped.toolCall?.function.name === 'write_files' ||
              mapped.toolCall?.function.name === 'run_command' ||
              mapped.toolCall?.function.name === 'apply_patch',
          }
          yield mapped
          continue
        }
        if (mapped.type === 'tool_result') {
          yield {
            type: 'progress_step',
            content: `Tool ${mapped.toolResult?.error ? 'failed' : 'completed'}: ${
              mapped.toolResult?.toolName ?? 'unknown'
            }`,
            progressStatus: mapped.toolResult?.error ? 'error' : 'completed',
            progressCategory: 'tool',
            progressToolName: mapped.toolResult?.toolName,
            progressToolCallId: mapped.toolResult?.toolCallId,
            progressArgs: mapped.toolResult?.args,
            progressDurationMs: mapped.toolResult?.durationMs,
            progressError: mapped.toolResult?.error,
            progressHasArtifactTarget:
              mapped.toolResult?.toolName === 'write_files' ||
              mapped.toolResult?.toolName === 'run_command' ||
              mapped.toolResult?.toolName === 'apply_patch',
          }
          yield mapped
          continue
        }
        if (mapped.type === 'text' && mapped.content) {
          const combined = rewriteText + mapped.content
          const fenceIndex = combined.indexOf('```')
          if (fenceIndex !== -1) {
            const safePrefixLength = Math.max(0, fenceIndex - rewriteText.length)
            if (safePrefixLength > 0) {
              const safeText = mapped.content.slice(0, safePrefixLength)
              rewriteText += safeText
              yield { ...mapped, content: safeText }
            }
            continue
          }
          rewriteText += mapped.content
          yield mapped
          continue
        }
        if (mapped.type === 'complete') {
          rewriteComplete = {
            ...mapped,
            content: rewriteText,
          }
          continue
        }
        yield mapped
      }

      yield rewriteComplete ?? { type: 'complete', content: rewriteText }
      return
    }

    if (pendingComplete) {
      yield pendingComplete
    }
  }

  async runSync(promptContext: PromptContext) {
    let content = ''
    const toolResults: ToolExecutionResult[] = []
    let usage: { promptTokens: number; completionTokens: number; totalTokens: number } | undefined
    let error: string | undefined

    for await (const event of this.run(promptContext)) {
      if (event.type === 'text' && event.content) {
        content += event.content
      }
      if (event.type === 'tool_result' && event.toolResult) {
        toolResults.push(event.toolResult)
      }
      if (event.type === 'complete') {
        usage = event.usage
        content = event.content ?? content
      }
      if (event.type === 'error' && event.error) {
        error = event.error
      }
    }

    return { content, toolResults, usage, error }
  }
}

export class AgentRuntime extends HarnessAgentRuntimeAdapter {}

function mapHarnessEventToAgentEvent(event: HarnessRuntimeEvent): AgentEvent | null {
  switch (event.type) {
    case 'step_start':
      return {
        type: 'status_thinking',
        content: `Step ${event.step}: generating response...`,
      }
    case 'reasoning':
      return { type: 'reasoning', reasoningContent: event.reasoningContent }
    case 'text':
      return { type: 'text', content: event.content }
    case 'tool_call':
      return {
        type: 'tool_call',
        toolCall: event.toolCall,
      }
    case 'tool_result': {
      const toolResult: ToolExecutionResult = {
        toolCallId: event.toolResult?.toolCallId ?? `harness-result-${Date.now()}`,
        toolName: event.toolResult?.toolName ?? 'unknown',
        args: event.toolResult?.args ?? {},
        output: event.toolResult?.output ?? '',
        error: event.toolResult?.error,
        durationMs: event.toolResult?.durationMs ?? 0,
        timestamp: Date.now(),
        retryCount: 0,
      }

      return {
        type: 'tool_result',
        toolResult,
      }
    }
    case 'status':
      return event.content
        ? {
            type: 'status_thinking',
            content: event.content,
          }
        : null
    case 'warning':
      return {
        type: 'progress_step',
        content: event.message ?? event.content ?? 'Warning',
        progressStatus: 'error',
        progressCategory: 'analysis',
      }
    case 'step_finish':
      return {
        type: 'progress_step',
        content: `Step ${event.step ?? 0} complete`,
        progressStatus: 'completed',
        progressCategory: 'analysis',
      }
    case 'spec_pending_approval':
      return {
        type: 'spec_pending_approval',
        spec: event.spec,
        specTier: event.tier,
      }
    case 'spec_generated':
      return {
        type: 'spec_generated',
        spec: event.spec,
        specTier: event.tier,
      }
    case 'spec_verification':
      return {
        type: 'spec_verification',
        spec: event.spec,
        verification: event.verification,
      }
    case 'compaction':
      return {
        type: 'progress_step',
        content: event.content ?? 'Compacting context...',
        progressStatus: event.compaction?.phase === 'start' ? 'running' : 'completed',
        progressCategory: 'analysis',
      }
    case 'permission_request':
    case 'permission_decision':
    case 'interrupt_request':
    case 'interrupt_decision':
      return {
        type: 'progress_step',
        content: event.content ?? event.type,
        progressStatus:
          event.type === 'permission_decision' || event.type === 'interrupt_decision'
            ? event.interrupt?.decision === 'reject'
              ? 'error'
              : 'completed'
            : 'running',
        progressCategory: 'tool',
        progressToolName: event.interrupt?.toolName,
        progressError:
          event.type === 'interrupt_decision' && event.interrupt?.decision === 'reject'
            ? event.interrupt.reason
            : undefined,
      }
    case 'subagent_start':
      return {
        type: 'progress_step',
        content: `Subagent started: ${event.subagent?.agent ?? 'unknown'}`,
        progressStatus: 'running',
        progressCategory: 'analysis',
        progressToolName: 'task',
        progressToolCallId: event.subagent?.id,
      }
    case 'subagent_complete':
      return {
        type: 'progress_step',
        content: `Subagent completed: ${event.subagent?.agent ?? 'unknown'}`,
        progressStatus: event.subagent?.success === false ? 'error' : 'completed',
        progressCategory: 'analysis',
        progressToolName: 'task',
        progressToolCallId: event.subagent?.id,
        progressError: event.subagent?.error,
      }
    case 'snapshot':
      return {
        type: 'snapshot',
        content: event.content,
        snapshot: event.snapshot,
      }
    case 'error':
      return { type: 'error', error: event.error }
    case 'complete':
      return {
        type: 'complete',
        usage: event.usage
          ? {
              promptTokens: event.usage.input,
              completionTokens: event.usage.output,
              totalTokens: event.usage.input + event.usage.output + (event.usage.reasoning ?? 0),
            }
          : undefined,
      }
    default:
      return null
  }
}

export function createAgentRuntime(
  options: RuntimeOptions,
  toolContext: ToolContext
): AgentRuntimeLike {
  return new AgentRuntime(options, toolContext)
}

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
