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
  annotations?: {
    model?: string
    tokenCount?: number
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
    tokenSource?: 'exact' | 'estimated'
    contextWindow?: number
    contextUsedTokens?: number
    contextRemainingTokens?: number
    contextUsagePct?: number
    contextSource?: 'map' | 'provider' | 'fallback'
    mode?: ChatMode
    provider?: string
    reasoningTokens?: number
  }
  createdAt: number
}
