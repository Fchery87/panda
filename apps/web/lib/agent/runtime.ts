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
import { getDefaultHarnessAgent } from './chat-modes'
import { getPromptForMode, type PromptContext } from './prompt-library'
import { executeTool, type ToolContext, type ToolExecutionResult } from './tools'
import { resolveAgentSkillsForPromptContext } from './skills/resolver'
import { resolveRulesForPhase } from './permission/mode-rulesets'
import {
  Runtime as HarnessRuntime,
  agents as harnessAgents,
  ascending as harnessAscending,
  type Message as HarnessMessage,
  type RuntimeConfig as HarnessRuntimeConfig,
  type RuntimeEvent as HarnessRuntimeEvent,
  type ToolExecutor as HarnessToolExecutor,
  type ToolInterruptRequest as HarnessToolInterruptRequest,
  type UserMessage as HarnessUserMessage,
} from './harness'
import { PermissionManager } from './harness/permissions'
import {
  InMemoryCheckpointStore,
  type CheckpointStore as HarnessCheckpointStore,
} from './harness/checkpoint-store'
import type { Permission as HarnessPermission } from './harness/types'
import type { FormalSpecification, SpecTier } from './spec/types'
import { mapToolCallToProgressStep, mapToolResultToProgressStep } from './runtime-progress'

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
  | 'drift_detected'
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
  drift?: {
    specId: string
    findings: Array<{
      filePath: string
      description: string
    }>
  }
  reconcile?: {
    aligned: boolean
    reason: string
    gate?: string
    detail?: string
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
  harnessAgentName?: 'build' | 'code' | 'plan' | 'ask'
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

    if (msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0) {
      const id = harnessAscending('msg_')
      const parts: HarnessMessage['parts'] = []
      // Preserve any text content alongside tool calls
      const textContent = toText(msg)
      if (textContent) {
        parts.push({
          id: harnessAscending('part_'),
          messageID: id,
          sessionID: args.sessionID,
          type: 'text',
          text: textContent,
        })
      }
      // Preserve tool call structure so the harness can reason about past tool usage
      for (const tc of msg.tool_calls) {
        parts.push({
          id: harnessAscending('part_'),
          messageID: id,
          sessionID: args.sessionID,
          type: 'tool',
          tool: tc.function.name,
          state: {
            status: 'completed',
            input: JSON.parse(tc.function.arguments || '{}'),
            output: '',
            time: { start: Date.now(), end: Date.now() },
          },
        })
      }
      return {
        id,
        sessionID: args.sessionID,
        role: 'assistant',
        parentID: harnessAscending('msg_parent_'),
        parts,
        time: { created: Date.now(), completed: Date.now() },
        modelID: 'legacy-context',
        providerID: 'legacy-context',
        mode: 'legacy',
        agent: 'legacy',
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
      // Convert tool results back into completed tool parts on the
      // preceding assistant message, preserving the tool-call structure
      // rather than flattening to synthetic text.
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
            type: 'tool',
            tool: msg.name ?? 'unknown',
            state: {
              status: 'completed',
              input: {},
              output: toText(msg),
              time: { start: Date.now(), end: Date.now() },
            },
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

function resolveExecutionHarnessAgentName(args: {
  chatMode: PromptContext['chatMode']
  harnessAgentName?: RuntimeConfig['harnessAgentName']
}): string {
  if (args.harnessAgentName) {
    return args.harnessAgentName
  }

  return getDefaultHarnessAgent(args.chatMode)
}

function createReasoningAwareProvider(
  provider: LLMProvider,
  reasoning: ReasoningOptions | undefined,
  modelOverride?: string
): LLMProvider {
  const capabilities =
    provider.config.capabilities ?? getDefaultProviderCapabilities(provider.config.provider)
  const resolvedConfig =
    modelOverride && provider.config.defaultModel !== modelOverride
      ? {
          ...provider.config,
          defaultModel: modelOverride,
        }
      : provider.config

  return {
    name: provider.name,
    config: resolvedConfig,
    async listModels() {
      return await provider.listModels()
    },
    async complete(options) {
      return await provider.complete({
        ...options,
        ...(capabilities.supportsReasoning && reasoning ? { reasoning } : {}),
      })
    },
    async *completionStream(options) {
      yield* provider.completionStream({
        ...options,
        ...(capabilities.supportsReasoning && reasoning ? { reasoning } : {}),
      })
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
  private permissions = new PermissionManager()

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
      this.permissions.setSessionPermissions(sessionID, sessionPermissions)
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
      // Enable subagent delegation — the harness runtime has built-in
      // runSubagent that spawns child Runtime instances with narrowed
      // permissions. Without this, the task tool defers but never executes.
      maxSubagentDepth: 2,
      subagentDepth: 0,
      checkpointStore,
      ...(riskInterruptsEnabled
        ? {
            toolRiskPolicy: { high: 'ask', critical: 'ask' as const },
            // Spawning a subagent (`task`) inherits the parent session's
            // approved permissions; the side-effect tools the subagent
            // invokes (write_files, run_command) still surface their own
            // high/critical risk prompts. Aligns with Claude Code / Codex /
            // Cursor norms (Claude Code issue #28584).
            toolRiskOverrides: { task: 'low' as const },
            onToolInterrupt: async (request: HarnessToolInterruptRequest) => {
              const target = request.patterns[0] || request.toolName
              const permissionResult = await this.permissions.request(
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
      // Wire chat mode into the harness for capability-based tool filtering
      chatMode: promptContext.chatMode,
      permissionRules: resolveRulesForPhase(promptContext.chatMode),
      specEngine: {
        // Spec generation is only valuable for the coordinated Code mode,
        // where work should follow a durable execution contract. Build mode
        // stays direct and fast; ask/architect remain read-only and skip specs.
        enabled: promptContext.chatMode === 'code',
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
      this.options.reasoning,
      this.options.model
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
    let fenceRewriteCount = 0
    const MAX_FENCE_REWRITES = 2
    let buildFenceNoticeShown = false
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
        yield mapToolCallToProgressStep(mapped)
        yield mapped
        continue
      }

      if (mapped.type === 'tool_result') {
        yield mapToolResultToProgressStep(mapped)
        yield mapped
        continue
      }

      if (mapped.type === 'text' && mapped.content) {
        if (promptContext.chatMode === 'architect') {
          let chunk = mapped.content
          let filtered = ''
          while (chunk.length > 0) {
            const markerIdx = chunk.indexOf('```')
            if (markerIdx === -1) {
              if (!inArchitectFence) filtered += chunk
              else {
                filtered += '\n[code collapsed — use Build mode to execute]\n'
                inArchitectFence = false
              }
              break
            }
            if (!inArchitectFence) {
              filtered += chunk.slice(0, markerIdx)
              filtered += '\n[code collapsed — use Build mode to execute]\n'
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
        // Only trigger if no tools were called — tool execution means the
        // model is already doing work, and code blocks may be supplementary.
        if (promptContext.chatMode === 'build' && !sawToolCall) {
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
        } else if (promptContext.chatMode === 'build' && sawToolCall) {
          const combined = attemptText + mapped.content
          const fenceIndex = combined.indexOf('```')
          if (fenceIndex !== -1 && !buildFenceNoticeShown) {
            buildFenceNoticeShown = true
            yield {
              type: 'progress_step' as const,
              content: 'Tools are executing — code blocks will be redacted in Build mode',
              progressStatus: 'completed' as const,
              progressCategory: 'rewrite' as const,
            }
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
      (fenceTriggered ||
        shouldTriggerRewrite({ promptContext, content: attemptText, sawToolCall })) &&
      fenceRewriteCount < MAX_FENCE_REWRITES
    ) {
      fenceRewriteCount++
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
          yield mapToolCallToProgressStep(mapped)
          yield mapped
          continue
        }
        if (mapped.type === 'tool_result') {
          yield mapToolResultToProgressStep(mapped)
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
