export interface Message {
  _id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  reasoningContent?: string
  annotations?: {
    model?: string
    tokenCount?: number
    mode?: 'discuss' | 'build'
    provider?: string
    reasoningTokens?: number
  }
  createdAt: number
}
