/**
 * LLM Types - Core type definitions for language model providers
 *
 * This module defines interfaces for:
 * - Model metadata and capabilities
 * - Message formats for completions
 * - Tool definitions for function calling
 * - Provider configurations
 */

/**
 * Provider type - supported LLM providers
 */
export type ProviderType = 'openai' | 'openrouter' | 'together' | 'anthropic' | 'zai' | 'custom'

/**
 * Model capability flags
 */
export interface ModelCapabilities {
  streaming: boolean
  functionCalling: boolean
  vision: boolean
  jsonMode: boolean
  toolUse: boolean
  supportsReasoning?: boolean
  supportsInterleavedReasoning?: boolean
  supportsReasoningSummary?: boolean
  supportsToolStreaming?: boolean
  reasoningControl?: ReasoningControl
}

/**
 * Model information metadata
 */
export interface ModelInfo {
  id: string
  name: string
  provider: ProviderType
  description?: string
  maxTokens: number
  contextWindow: number
  capabilities: ModelCapabilities
  pricing?: {
    inputPerToken: number
    outputPerToken: number
  }
}

/**
 * Message role types
 */
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool'

/**
 * Base message interface for completions
 */
export interface CompletionMessage {
  role: MessageRole
  content: string
  name?: string
  tool_calls?: ToolCall[]
  tool_call_id?: string
}

/**
 * Tool call from assistant
 */
export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

/**
 * Tool result from execution
 */
export interface ToolResult {
  toolCallId: string
  toolName: string
  args: Record<string, unknown>
  output: string
  error?: string
  durationMs: number
}

/**
 * Tool parameter definition
 */
export interface ToolParameter {
  type: string
  description?: string
  enum?: string[]
  items?: ToolParameter
  properties?: Record<string, ToolParameter>
  required?: string[]
}

/**
 * Tool definition for function calling
 */
export interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, ToolParameter>
      required?: string[]
    }
  }
}

/**
 * Provider authentication configuration
 */
export interface ProviderAuth {
  apiKey: string
  baseUrl?: string
}

/**
 * Provider-specific configuration
 */
export interface ProviderConfig {
  provider: ProviderType
  auth: ProviderAuth
  defaultModel?: string
  timeout?: number
  maxRetries?: number
  customHeaders?: Record<string, string>
  capabilities?: ProviderCapabilities
}

/**
 * Streaming chunk types
 */
export type StreamChunkType =
  | 'status_thinking'
  | 'reasoning'
  | 'text'
  | 'tool_call'
  | 'tool_result'
  | 'error'
  | 'finish'

/**
 * Streaming chunk from LLM
 */
export interface StreamChunk {
  type: StreamChunkType
  content?: string
  reasoningContent?: string
  toolCall?: ToolCall
  toolResult?: ToolResult
  finishReason?: 'stop' | 'length' | 'tool_calls' | 'error'
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  error?: string
}

/**
 * Completion request options
 */
export interface CompletionOptions {
  model: string
  messages: CompletionMessage[]
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  tools?: ToolDefinition[]
  stream?: boolean
  responseFormat?: { type: 'text' | 'json_object' }
  reasoning?: ReasoningOptions
}

/**
 * Reasoning control strategy
 */
export type ReasoningControl = 'none' | 'budget' | 'effort' | 'level'

/**
 * Normalized reasoning options
 */
export interface ReasoningOptions {
  enabled?: boolean
  budgetTokens?: number
  effort?: 'low' | 'medium' | 'high' | 'max'
  level?: 'minimal' | 'low' | 'medium' | 'high'
  summary?: 'none' | 'auto' | 'detailed'
}

/**
 * Provider capability flags used for runtime gating.
 */
export interface ProviderCapabilities {
  supportsReasoning: boolean
  supportsInterleavedReasoning: boolean
  supportsReasoningSummary: boolean
  supportsToolStreaming: boolean
  reasoningControl: ReasoningControl
}

export function getDefaultProviderCapabilities(type: ProviderType): ProviderCapabilities {
  switch (type) {
    case 'anthropic':
      return {
        supportsReasoning: true,
        supportsInterleavedReasoning: true,
        supportsReasoningSummary: true,
        supportsToolStreaming: true,
        reasoningControl: 'budget',
      }
    case 'zai':
      return {
        supportsReasoning: true,
        supportsInterleavedReasoning: false,
        supportsReasoningSummary: false,
        supportsToolStreaming: true,
        reasoningControl: 'budget',
      }
    case 'openai':
    case 'openrouter':
    case 'together':
    case 'custom':
      return {
        supportsReasoning: false,
        supportsInterleavedReasoning: false,
        supportsReasoningSummary: false,
        supportsToolStreaming: true,
        reasoningControl: 'none',
      }
    default:
      return {
        supportsReasoning: false,
        supportsInterleavedReasoning: false,
        supportsReasoningSummary: false,
        supportsToolStreaming: true,
        reasoningControl: 'none',
      }
  }
}

/**
 * Completion response (non-streaming)
 */
export interface CompletionResponse {
  message: CompletionMessage
  finishReason: 'stop' | 'length' | 'tool_calls' | 'error'
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  model: string
}

/**
 * Provider interface - all providers must implement this
 */
export interface LLMProvider {
  name: string
  config: ProviderConfig

  /**
   * List available models from this provider
   */
  listModels(): Promise<ModelInfo[]>

  /**
   * Create a completion (non-streaming)
   */
  complete(options: CompletionOptions): Promise<CompletionResponse>

  /**
   * Create a streaming completion
   */
  completionStream(options: CompletionOptions): AsyncGenerator<StreamChunk>
}
