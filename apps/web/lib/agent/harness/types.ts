/**
 * Agentic Harness Types - Core type definitions for the OpenCode-style agent system
 *
 * Implements a provider-agnostic agentic harness with:
 * - Message/Part system with all part types
 * - Agent definitions with mode/permissions
 * - Permission system with allow/deny/ask patterns
 * - Subagent delegation
 * - Context compaction
 * - Plugin hooks
 */

import type { ToolDefinition } from '../../llm/types'
import type { CheckpointStore } from './checkpoint-store'
import type { FormalSpecification, SpecEngineConfig, SpecTier } from '../spec/types'
import type { WorkerContextPack } from '../../forge/types'
import type { ChatMode } from '../chat-modes'
import type { PermissionRule, Capability } from './permission/types'

export type { ToolDefinition } from '../../llm/types'

/**
 * Unique identifier for messages, parts, sessions
 */
export type Identifier = string

/**
 * Agent mode - determines when/how agent can be invoked
 */
export type AgentMode = 'primary' | 'subagent' | 'all'

/**
 * Permission decision for tool access
 */
export type PermissionDecision = 'allow' | 'deny' | 'ask'

/**
 * Permission configuration - maps tool patterns to decisions
 */
export type Permission = Record<string, PermissionDecision>

export type ToolRiskTier = 'low' | 'medium' | 'high' | 'critical'
export type ToolInterruptDecision = 'approve' | 'reject' | 'edit'

export interface ToolInterruptRequest {
  sessionID: Identifier
  messageID: Identifier
  toolCallId?: string
  toolName: string
  args: Record<string, unknown>
  patterns: string[]
  riskTier: ToolRiskTier
  reason: string
}

export interface ToolInterruptResult {
  decision: ToolInterruptDecision
  args?: Record<string, unknown>
  reason?: string
}

/**
 * Finish reason for assistant messages
 */
export type FinishReason = 'stop' | 'length' | 'tool-calls' | 'error' | 'content-filter' | 'unknown'

/**
 * Agent configuration
 */
export interface AgentConfig {
  name: string
  description?: string
  model?: string
  variant?: string
  temperature?: number
  topP?: number
  prompt?: string
  permission: Permission
  mode: AgentMode
  hidden?: boolean
  color?: string
  steps?: number
  options?: Record<string, unknown>
  /**
   * Capability ceiling for subagent permission narrowing.
   * When set, parent permissionRules are filtered to only include
   * rules for capabilities listed here. Prevents subagents from
   * inheriting parent capabilities beyond their declared scope.
   */
  maxCapabilities?: Capability[]
}

/**
 * Tool state lifecycle
 */
export type ToolState =
  | { status: 'pending'; input: Record<string, unknown>; time: { start: number } }
  | { status: 'running'; input: Record<string, unknown>; time: { start: number } }
  | {
      status: 'completed'
      input: Record<string, unknown>
      output: string
      metadata?: Record<string, unknown>
      title?: string
      time: { start: number; end: number }
    }
  | {
      status: 'error'
      input: Record<string, unknown>
      error: string
      time: { start: number; end: number }
    }

/**
 * Base part interface
 */
export interface BasePart {
  id: Identifier
  messageID: Identifier
  sessionID: Identifier
}

/**
 * Text part - plain text content
 */
export interface TextPart extends BasePart {
  type: 'text'
  text: string
  synthetic?: boolean
}

/**
 * Reasoning part - model's thinking process
 */
export interface ReasoningPart extends BasePart {
  type: 'reasoning'
  text: string
  summary?: string
}

/**
 * File source types
 */
export type FileSource =
  | { type: 'path'; path: string }
  | { type: 'url'; url: string }
  | { type: 'base64'; mediaType: string; data: string }

/**
 * File part - attachments (images, PDFs, etc.)
 */
export interface FilePart extends BasePart {
  type: 'file'
  source: FileSource
  mediaType?: string
}

/**
 * Tool part - tool invocation and lifecycle
 */
export interface ToolPart extends BasePart {
  type: 'tool'
  tool: string
  state: ToolState
}

/**
 * Subtask part - deferred task for subagent
 */
export interface SubtaskPart extends BasePart {
  type: 'subtask'
  agent: string
  prompt: string
  result?: {
    output: string
    parts: Part[]
  }
}

/**
 * Agent reference part
 */
export interface AgentPart extends BasePart {
  type: 'agent'
  name: string
  config?: Partial<AgentConfig>
}

/**
 * Step start marker
 */
export interface StepStartPart extends BasePart {
  type: 'step_start'
  step: number
  snapshot?: string
}

/**
 * Step finish marker
 */
export interface StepFinishPart extends BasePart {
  type: 'step_finish'
  step: number
  finishReason: FinishReason
  usage?: {
    promptTokens: number
    completionTokens: number
    reasoningTokens?: number
    totalTokens: number
  }
  cost?: number
}

/**
 * Snapshot part - git snapshot reference
 */
export interface SnapshotPart extends BasePart {
  type: 'snapshot'
  hash: string
}

/**
 * Patch part - git patch reference
 */
export interface PatchPart extends BasePart {
  type: 'patch'
  hash: string
  files: string[]
}

/**
 * Retry part - API retry attempt
 */
export interface RetryPart extends BasePart {
  type: 'retry'
  attempt: number
  error: string
}

/**
 * Compaction part - context compaction marker
 */
export interface CompactionPart extends BasePart {
  type: 'compaction'
  auto: boolean
  summary?: string
}

/**
 * Permission request part
 */
export interface PermissionPart extends BasePart {
  type: 'permission'
  tool: string
  pattern: string
  decision?: PermissionDecision
  reason?: string
}

/**
 * All part types union
 */
export type Part =
  | TextPart
  | ReasoningPart
  | FilePart
  | ToolPart
  | SubtaskPart
  | AgentPart
  | StepStartPart
  | StepFinishPart
  | SnapshotPart
  | PatchPart
  | RetryPart
  | CompactionPart
  | PermissionPart

/**
 * User message
 */
export interface UserMessage {
  id: Identifier
  sessionID: Identifier
  role: 'user'
  time: {
    created: number
  }
  parts: Part[]
  agent: string
  model?: {
    providerID: string
    modelID: string
  }
  system?: string
  tools?: Record<string, boolean>
  variant?: string
}

/**
 * API Error types
 */
export interface APIError {
  type:
    | 'ProviderAuthError'
    | 'UnknownError'
    | 'MessageOutputLengthError'
    | 'MessageAbortedError'
    | 'ContextOverflowError'
    | 'APIError'
  message: string
  statusCode?: number
  isRetryable?: boolean
  responseBody?: string
  responseHeaders?: Record<string, string>
}

/**
 * Assistant message
 */
export interface AssistantMessage {
  id: Identifier
  sessionID: Identifier
  role: 'assistant'
  parentID: Identifier
  parts: Part[]
  time: {
    created: number
    completed?: number
  }
  modelID: string
  providerID: string
  mode: string
  agent: string
  cost?: number
  tokens?: {
    input: number
    output: number
    reasoning?: number
    cache?: {
      read: number
      write: number
    }
  }
  error?: APIError
  finish?: FinishReason
  summary?: boolean
  variant?: string
}

/**
 * Message union type
 */
export type Message = UserMessage | AssistantMessage

/**
 * Session state
 */
export interface SessionState {
  id: Identifier
  parentID?: Identifier
  projectID: string
  status: 'idle' | 'busy' | 'waiting' | 'error'
  agent: string
  model?: {
    providerID: string
    modelID: string
  }
  createdAt: number
  updatedAt: number
  messages: Identifier[]
  compactionCount: number
}

/**
 * Runtime configuration
 */
export interface RuntimeConfig {
  maxIterations?: number
  maxSteps?: number
  maxToolCallsPerStep?: number
  enableToolDeduplication?: boolean
  toolLoopThreshold?: number
  contextWindowSize?: number
  contextCompactionThreshold?: number
  compactionTimeBudgetMs?: number
  enableSnapshots?: boolean
  snapshotTimeoutMs?: number
  snapshotFailureMode?: 'warn' | 'error'
  enableReasoning?: boolean
  maxSubagentDepth?: number
  subagentDepth?: number
  checkpointStore?: CheckpointStore
  toolRiskPolicy?: Partial<Record<ToolRiskTier, PermissionDecision>>
  toolRiskOverrides?: Record<string, ToolRiskTier>
  onToolInterrupt?: (request: ToolInterruptRequest) => Promise<ToolInterruptResult>
  maxToolExecutionRetries?: number
  toolRetryBackoffMs?: number
  enableToolCallIdempotencyCache?: boolean
  runSubagent?: (
    agent: AgentConfig,
    prompt: string,
    sessionID: Identifier
  ) => Promise<SubagentResult>
  onSpecApproval?: (request: {
    sessionID: Identifier
    spec: FormalSpecification
    tier: SpecTier
  }) => Promise<{
    decision: 'approve' | 'edit' | 'cancel'
    spec?: FormalSpecification
  }>
  /** SpecNative engine configuration */
  specEngine?: SpecEngineConfig
  /** Skip post-execution spec verification (useful for tests) */
  skipSpecVerification?: boolean
  /**
   * Stream resilience configuration
   */
  streamIdleTimeoutMs?: number
  maxStreamRetries?: number
  streamRetryBackoffMs?: number
  /** Timeout in ms for individual tool executions (default: 300000 = 5 minutes) */
  toolExecutionTimeoutMs?: number
  /** Prebuilt Forge execution context for builder/manager/executive runs */
  forgeContextPack?: WorkerContextPack
  /** Active chat mode — used for capability-based tool filtering */
  chatMode?: ChatMode
  /** Ordered permission rules evaluated with last-rule-wins semantics to filter tools */
  permissionRules?: PermissionRule[]
}

export interface RuntimeSnapshotEvent {
  hash: string
  step: number
  files: string[]
  timestamp: number
}

/**
 * Hook context passed to plugin hooks
 */
export interface HookContext {
  sessionID: Identifier
  messageID: Identifier
  agent: AgentConfig
  step: number
}

/**
 * Plugin hook types
 */
export type HookType =
  | 'session.start'
  | 'session.end'
  | 'step.start'
  | 'step.end'
  | 'tool.execute.before'
  | 'tool.execute.after'
  | 'llm.request'
  | 'llm.response'
  | 'compaction.before'
  | 'compaction.after'
  | 'permission.ask'
  | 'permission.decision'
  // SpecNative hooks
  | 'spec.classify' // After intent classification
  | 'spec.generate.before' // Before spec generation
  | 'spec.generate.after' // After spec generation
  | 'spec.validate' // During spec validation
  | 'spec.refine' // During spec refinement
  | 'spec.approve' // When user approves explicit spec
  | 'spec.execute.before' // Before executing against spec
  | 'spec.execute.after' // After execution completes
  | 'spec.verify' // During post-execution verification
  | 'spec.drift.detected' // When code changes affect a spec
  | 'spec.reconcile' // During bidirectional sync
  // Validation hooks
  | 'validation.post-write' // After write operations for quality checks

/**
 * Plugin hook handler
 */
export type HookHandler<T = unknown> = (
  context: HookContext,
  data: T
) => Promise<T | void> | T | void

/**
 * Plugin definition
 */
export interface Plugin {
  name: string
  version?: string
  hooks: Partial<Record<HookType, HookHandler<unknown>>>
  tools?: ToolDefinition[]
  agents?: AgentConfig[]
}

/**
 * Validation check result for post-write validation
 */
export interface ValidationCheck {
  name: string
  type: 'typecheck' | 'lint' | 'test' | 'custom'
  passed: boolean
  message?: string
  durationMs?: number
}

/**
 * Post-write validation result
 */
export interface PostWriteValidationResult {
  toolName: string
  toolCallId: string
  filesAffected: string[]
  checks: ValidationCheck[]
  passed: boolean
  summary: string
  timestamp: number
}

/**
 * Event types for real-time updates
 */
export type EventType =
  | 'session.created'
  | 'session.updated'
  | 'session.deleted'
  | 'message.created'
  | 'message.updated'
  | 'message.deleted'
  | 'part.created'
  | 'part.updated'
  | 'part.deleted'
  | 'tool.executing'
  | 'tool.completed'
  | 'tool.failed'
  | 'compaction.started'
  | 'compaction.completed'
  | 'permission.requested'
  | 'permission.decided'
  | 'subagent.started'
  | 'subagent.completed'
  | 'snapshot.created'
  | 'error'

/**
 * Event payload
 */
export interface Event {
  type: EventType
  sessionID: Identifier
  timestamp: number
  payload: unknown
}

/**
 * Event handler for real-time subscriptions
 */
export type EventHandler = (event: Event) => void

/**
 * Subagent task definition
 */
export interface SubagentTask {
  agent: string
  prompt: string
  description: string
  parentSessionID: Identifier
  parentMessageID: Identifier
}

/**
 * Subagent result
 */
export interface SubagentResult {
  sessionID: Identifier
  output: string
  parts: Part[]
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  cost?: number
  error?: string
}

/**
 * Compaction result
 */
export interface CompactionResult {
  summary: string
  tokensBefore: number
  tokensAfter: number
  messagesCompacted: number
  messages?: Message[]
  error?: string
}

/**
 * Permission request
 */
export interface PermissionRequest {
  sessionID: Identifier
  messageID: Identifier
  tool: string
  pattern: string
  metadata?: Record<string, unknown>
  decision?: PermissionDecision
  reason?: string
}

/**
 * Permission result
 */
export interface PermissionResult {
  granted: boolean
  decision: PermissionDecision
  reason?: string
}
