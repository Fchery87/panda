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
import type { ContextWindowSource } from '@/lib/llm/model-metadata'

export type TokenSource = 'exact' | 'estimated'

export interface TokenUsageInfo {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  reasoningTokens?: number
  cacheRead?: number
  cacheWrite?: number
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
  provider?: string
  reasoningTokens?: number
  reasoningSummary?: string
  toolCalls?: ToolCallInfo[]
}

export interface PersistedRunEventInfo {
  _id?: string
  runId?: string
  type: string
  content?: string
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
  durationMs?: number
  planStepIndex?: number
  planStepTitle?: string
  planTotalSteps?: number
  completedPlanStepIndexes?: number[]
  usage?: TokenUsageInfo
  snapshot?: {
    hash: string
    step: number
    files: string[]
    timestamp: number
  }
  createdAt?: number
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
  reasoningContent?: string
  toolCalls?: ToolCallInfo[]
  suggestedActions?: SuggestedAction[]
  annotations?: MessageAnnotationInfo
  createdAt: number
}
