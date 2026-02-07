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

export interface Message {
  _id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  reasoningContent?: string
  toolCalls?: ToolCallInfo[]
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
    mode?: 'discuss' | 'build'
    provider?: string
    reasoningTokens?: number
  }
  createdAt: number
}
