export interface ToolCallInfo {
  id: string
  name: string
  args: Record<string, unknown>
  status: 'pending' | 'running' | 'completed' | 'error'
  result?: {
    output: string
    error?: string
    durationMs: number
  }
}

import type { ChatMode } from '@/lib/agent/prompt-library'
import type { AppliedSkillSummary } from '@/lib/agent/skills/applied-skills'
import type { ExecutionReceipt } from '@/lib/agent/receipt'
import type { HarnessSubagentSummary } from '@/lib/agent/harness'
import type { ContextWindowSource } from '@/lib/llm/model-metadata'

export type TokenSource = 'exact' | 'estimated'

export type ReasoningStateInfo = {
  mode: 'off' | 'auto' | 'low' | 'medium' | 'high' | 'max'
  display: 'hidden' | 'summary' | 'expanded' | 'debug'
  summary?: string
  visibleContent?: string
  redacted?: boolean
  tokenCount?: number
  providerMetadata?: {
    encryptedContent?: string
    signature?: string
    redactedPayload?: string
    thoughtSignature?: string
  }
}

export interface TokenUsageInfo {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  reasoningTokens?: number
  cacheRead?: number
  cacheWrite?: number
}

export type MessageBlockInfo =
  | { type: 'text'; text: string }
  | { type: 'reasoning_summary'; text?: string; redacted?: boolean; tokenCount?: number }
  | { type: 'tool_call_ref'; toolCallId: string; toolName?: string }
  | { type: 'tool_result_ref'; toolCallId: string; eventId?: string }
  | { type: 'artifact_ref'; artifactId: string }
  | { type: 'file_change_ref'; path: string; action: 'created' | 'updated' | 'deleted' }
  | { type: 'error'; message: string }

export interface ChatContextItemInfo {
  id: string
  type:
    | 'file'
    | 'folder'
    | 'selection'
    | 'upload'
    | 'image'
    | 'docs'
    | 'terminal'
    | 'browser'
    | 'git'
    | 'past-chat'
    | 'codebase'
    | 'spec'
    | 'plan'
    | 'memory'
  label: string
  path?: string
  range?: {
    startLine: number
    endLine: number
  }
  source: 'user' | 'editor' | 'upload' | 'retrieval' | 'system'
  status: 'pending' | 'resolved' | 'failed' | 'omitted'
  tokenEstimate?: number
  relevanceScore?: number
  reason?: string
}

export interface ContextRetrievalSummaryInfo {
  retrieved: number
  included: number
  omitted: number
  usedTokens: number
  maxTokens: number
  sourceTypes?: string[]
  includedItems?: Array<{
    label: string
    sourceType: string
    path?: string | null
    score?: number
    tokenCount?: number
    reasons?: string[]
  }>
  omittedItems?: Array<{
    label: string
    sourceType: string
    reason: string
    tokenCount?: number
  }>
}

export interface MessageAnnotationInfo {
  model?: string
  tokenCount?: number
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  tokenSource?: TokenSource
  contextWindow?: number
  contextUsedTokens?: number
  contextRemainingTokens?: number
  contextUsagePct?: number
  contextSource?: ContextWindowSource
  mode?: ChatMode
  autoModeSwitch?: {
    fromMode: ChatMode
    toMode: ChatMode
    confidence: 'high' | 'medium' | 'low'
    rationale: string
    boundary: 'read-only' | 'write-capable'
  }
  attachmentsOnly?: boolean
  contextItems?: ChatContextItemInfo[]
  retrievalSummary?: ContextRetrievalSummaryInfo
  provider?: string
  reasoningTokens?: number
  reasoningSummary?: string
  reasoningState?: ReasoningStateInfo
  toolCalls?: ToolCallInfo[]
  attachments?: Array<{
    id: string
    kind: 'file' | 'image'
    filename: string
    contentType?: string
    size?: number
    url?: string
    contextFilePath?: string
  }>
}

export interface PersistedRunEventInfo {
  _id?: string
  runId?: string
  type: string
  content?: string
  contentPreview?: string
  status?: string
  progressCategory?: string
  progressToolName?: string
  progressHasArtifactTarget?: boolean
  targetFilePaths?: string[]
  toolCallId?: string
  toolName?: string
  args?: Record<string, unknown>
  output?: string
  error?: string
  outputPreview?: string
  errorPreview?: string
  durationMs?: number
  planStepIndex?: number
  planStepTitle?: string
  planTotalSteps?: number
  completedPlanStepIndexes?: number[]
  usage?: TokenUsageInfo
  appliedSkills?: AppliedSkillSummary[]
  subagentSummary?: HarnessSubagentSummary
  snapshot?: {
    hash: string
    step: number
    files: string[]
    timestamp: number
  }
  createdAt?: number
}

export interface PersistedRunEventSummaryInfo {
  _id?: string
  runId?: string
  chatId?: string
  sequence?: number
  type: string
  contentPreview?: string
  status?: string
  progressCategory?: string
  progressToolName?: string
  progressHasArtifactTarget?: boolean
  targetFilePaths?: string[]
  toolCallId?: string
  toolName?: string
  outputPreview?: string
  errorPreview?: string
  durationMs?: number
  planStepIndex?: number
  planStepTitle?: string
  planTotalSteps?: number
  completedPlanStepIndexes?: number[]
  usage?: TokenUsageInfo
  appliedSkills?: AppliedSkillSummary[]
  subagentSummary?: HarnessSubagentSummary
  snapshot?: {
    hash: string
    step: number
    files: string[]
    timestamp: number
  }
  createdAt?: number
}

export interface LatestRunReceiptInfo {
  runId: string
  status: string
  startedAt: number
  completedAt?: number
  receipt: ExecutionReceipt | null
}

export interface SuggestedAction {
  label: string
  prompt: string
  /** If set, clicking this action also switches to the specified mode */
  targetMode?: ChatMode
}

export interface Message {
  _id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  blocks?: MessageBlockInfo[]
  reasoningContent?: string
  toolCalls?: ToolCallInfo[]
  suggestedActions?: SuggestedAction[]
  annotations?: MessageAnnotationInfo
  attachments?: Array<{
    _id?: string
    storageId?: string
    kind: 'file' | 'image'
    filename: string
    contentType?: string
    size?: number
    url?: string
    contextFilePath?: string
    createdAt?: number
  }>
  createdAt: number
}
