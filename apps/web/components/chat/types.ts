export interface Message {
  _id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  annotations?: { model?: string; tokenCount?: number }
  createdAt: number
}
