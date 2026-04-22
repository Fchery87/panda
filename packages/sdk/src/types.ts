export type ChatMode = 'ask' | 'plan' | 'code' | 'build'

export type PermissionLevel = 'allow' | 'deny' | 'ask'

export interface PermissionsConfig {
  tools?: Record<string, PermissionLevel>
  bash?: Record<string, PermissionLevel>
}

export interface ProviderCapabilities {
  supportsStreaming: boolean
  supportsReasoning: boolean
  supportsVision: boolean
  supportsTools: boolean
  maxContextTokens: number
}

export interface ProviderConfig {
  name: string
  apiKey?: string
  baseUrl?: string
  defaultModel: string
  availableModels: string[]
  enabled: boolean
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: number
}

export interface Chat {
  id: string
  projectId: string
  title?: string
  mode: ChatMode
  createdAt: number
  updatedAt: number
}

export interface Project {
  id: string
  name: string
  description?: string
  createdAt: number
}

export interface Artifact {
  id: string
  chatId: string
  messageId?: string
  type: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rejected'
  createdAt: number
}

export interface AgentRun {
  id: string
  projectId: string
  chatId: string
  mode: ChatMode
  status: 'running' | 'completed' | 'failed' | 'stopped'
  startedAt: number
  completedAt?: number
}

export interface Checkpoint {
  id: string
  projectId: string
  chatId: string
  name: string
  description?: string
  filesChanged: string[]
  createdAt: number
}

export interface ToolCall {
  id: string
  name: string
  args: Record<string, unknown>
}

export interface ToolResult {
  toolCallId: string
  output?: string
  error?: string
}

export interface StreamChunk {
  type: 'text' | 'tool_call' | 'tool_result' | 'error' | 'done'
  content?: string
  toolCall?: ToolCall
  toolResult?: ToolResult
  error?: string
}

export interface StreamOptions {
  provider: string
  model: string
  messages: Message[]
  tools?: ToolDefinition[]
  permissions?: PermissionsConfig
  onChunk?: (chunk: StreamChunk) => void
  signal?: AbortSignal
}

export interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, unknown>
}
