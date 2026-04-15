/**
 * OpenAI Compatible Provider
 *
 * Supports OpenAI, OpenRouter, Together.ai, and other OpenAI-compatible APIs.
 * Uses the Vercel AI SDK for streaming completions.
 */

import { appLog } from '@/lib/logger'
import {
  streamText,
  generateText,
  jsonSchema,
  NoSuchToolError,
  type CoreMessage,
  type ToolSet,
} from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { formatProviderError, repairHallucinatedToolName } from './error-utils'
import type {
  LLMProvider,
  ModelInfo,
  CompletionOptions,
  CompletionResponse,
  StreamChunk,
  ToolCall,
  ProviderConfig,
  CompletionMessage,
  ToolDefinition,
} from '../types'
import { getDefaultProviderCapabilities } from '../types'
import { mapReasoningToProvider, processChunkWithThinking } from '../reasoning-transform'
import { zaiCompletionStream } from './zai-stream'

type FinishReason = NonNullable<StreamChunk['finishReason']>
type JsonSchemaInput = Parameters<typeof jsonSchema>[0]
type StreamTextArgs = Parameters<typeof streamText>[0]
type AiStreamPart = {
  type: string
  textDelta?: string
  text?: string
  toolCallId?: string
  toolName?: string
  input?: unknown
  args?: unknown
  error?: unknown
  finishReason?: string
  totalUsage?: {
    inputTokens?: number
    outputTokens?: number
  }
}
type CoreMessageWithExtras = CoreMessage & {
  name?: string
  tool_calls?: ToolCall[]
  tool_call_id?: string
}
type OpenRouterModel = {
  id?: string
  name?: string
  description?: string
  top_provider?: { max_completion_tokens?: number }
  context_length?: number
  features?: string[]
  pricing?: { prompt?: number; completion?: number }
}
type TogetherModel = {
  id?: string
  display_name?: string
  description?: string
  context_length?: number
  supports_tools?: boolean
  supports_vision?: boolean
}
type OpenRouterModelsResponse = { data?: OpenRouterModel[] }

function normalizeFinishReason(value: unknown): FinishReason {
  switch (value) {
    case 'stop':
    case 'length':
    case 'tool_calls':
    case 'error':
      return value
    default:
      return 'stop'
  }
}

function splitForPerceivedStreaming(text: string, maxChunkChars = 12): string[] {
  if (!text) return []
  if (text.length <= maxChunkChars) return [text]

  // Prefer splitting on whitespace, but fall back to fixed-size chunks.
  const parts = text.split(/(\s+)/)
  const chunks: string[] = []
  let buf = ''

  const flush = () => {
    if (buf) chunks.push(buf)
    buf = ''
  }

  for (const part of parts) {
    if (!part) continue
    if (part.length > maxChunkChars) {
      // Flush any buffered content before chunking a long token.
      flush()
      for (let i = 0; i < part.length; i += maxChunkChars) {
        chunks.push(part.slice(i, i + maxChunkChars))
      }
      continue
    }

    if ((buf + part).length > maxChunkChars) {
      flush()
    }
    buf += part
  }

  flush()
  return chunks
}

/**
 * OpenAI Compatible Provider implementation
 * Works with OpenAI, OpenRouter, Together.ai, and other compatible APIs
 */
export class OpenAICompatibleProvider implements LLMProvider {
  name = 'openai-compatible'
  config: ProviderConfig
  private client: ReturnType<typeof createOpenAI>

  constructor(config: ProviderConfig) {
    this.config = config

    // Create AI SDK client with custom configuration
    this.client = createOpenAI({
      apiKey: config.auth.apiKey,
      baseURL: config.auth.baseUrl,
      headers: config.customHeaders,
    })
  }

  /**
   * List available models
   * For OpenAI-compatible APIs, we return common models
   * For OpenRouter, we fetch from their API
   */
  async listModels(): Promise<ModelInfo[]> {
    // If using OpenRouter, fetch models from their API
    if (this.config.auth.baseUrl?.includes('openrouter')) {
      return this.listOpenRouterModels()
    }

    // If using Together.ai, fetch models from their API
    if (this.config.auth.baseUrl?.includes('together')) {
      return this.listTogetherModels()
    }

    // Default OpenAI models
    return this.getDefaultOpenAIModels()
  }

  /**
   * Create a non-streaming completion
   */
  async complete(options: CompletionOptions): Promise<CompletionResponse> {
    const result = await generateText({
      model: this.client(options.model),
      messages: this.convertMessages(options.messages),
      temperature: options.temperature ?? 0.7,
      maxTokens: options.maxTokens,
      maxRetries: this.config.maxRetries ?? 0,
      topP: options.topP,
      frequencyPenalty: options.frequencyPenalty,
      presencePenalty: options.presencePenalty,
      tools: this.convertTools(options.tools),
    })

    return {
      message: {
        role: 'assistant',
        content: result.text,
      },
      finishReason: normalizeFinishReason(result.finishReason),
      usage: {
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
        totalTokens: result.usage.totalTokens,
      },
      model: options.model,
    }
  }

  /**
   * Create a streaming completion
   * Yields chunks of text, tool calls, and finish events
   */
  async *completionStream(options: CompletionOptions): AsyncGenerator<StreamChunk> {
    // Detect Z.ai provider
    const isZai = this.config.auth.baseUrl?.includes('z.ai') ?? false

    // Z.ai requires special handling for tool streaming
    // Use direct fetch implementation that properly handles tool_stream parameter
    if (isZai && options.tools && options.tools.length > 0) {
      yield* zaiCompletionStream(options, {
        apiKey: this.config.auth.apiKey,
        baseUrl: this.config.auth.baseUrl || 'https://api.z.ai/api/coding/paas/v4',
      })
      return
    }

    try {
      const tools =
        options.tools && options.tools.length > 0 ? this.convertTools(options.tools) : undefined

      // Apply reasoning options if available
      const providerType = this.config.provider
      const capabilities = this.config.capabilities ?? getDefaultProviderCapabilities(providerType)
      const reasoningParams = mapReasoningToProvider(options.reasoning, providerType, capabilities)

      // Build stream options with reasoning support
      const streamOptions = {
        model: this.client(options.model),
        messages: this.convertMessages(options.messages),
        temperature: options.temperature ?? 0.7,
        maxTokens: options.maxTokens,
        maxRetries: this.config.maxRetries ?? 0,
        topP: options.topP,
        frequencyPenalty: options.frequencyPenalty,
        presencePenalty: options.presencePenalty,
        ...(tools && { tools }),
        ...(reasoningParams && {
          providerOptions: {
            [providerType]: reasoningParams as Record<string, unknown>,
          },
        }),
        experimental_repairToolCall: async ({ toolCall, tools: availableTools, error }) => {
          if (!NoSuchToolError.isInstance(error)) return null
          const known = Object.keys(availableTools ?? {})
          const repaired = repairHallucinatedToolName(toolCall.toolName, known)
          if (!repaired) return null
          return { ...toolCall, toolName: repaired }
        },
      } as StreamTextArgs

      const result = streamText(streamOptions)
      for await (const part of result.fullStream as AsyncIterable<AiStreamPart>) {
        switch (part.type) {
          case 'text-delta': {
            const delta = part.textDelta ?? part.text
            if (!delta) break
            const chunks = splitForPerceivedStreaming(delta)
            for (const chunkText of chunks) {
              const chunk: StreamChunk = { type: 'text', content: chunkText }
              // Process for think tags (DeepSeek, open-source models)
              const processed = processChunkWithThinking(chunk)
              for (const processedChunk of processed) {
                yield processedChunk
              }
            }
            break
          }
          case 'reasoning-delta': {
            const reasoning = part.textDelta ?? part.text
            if (!reasoning) break
            yield { type: 'reasoning', reasoningContent: reasoning }
            break
          }
          case 'tool-call': {
            if (!part.toolCallId || !part.toolName) break
            const toolCall: ToolCall = {
              id: part.toolCallId,
              type: 'function',
              function: {
                name: part.toolName,
                arguments: JSON.stringify(part.input ?? part.args ?? {}),
              },
            }
            yield { type: 'tool_call', toolCall }
            break
          }
          case 'error':
            yield {
              type: 'error',
              error: formatProviderError(part.error ?? 'Unknown stream error'),
            }
            return
          case 'finish':
            yield {
              type: 'finish',
              finishReason: normalizeFinishReason(part.finishReason),
              usage: part.totalUsage
                ? {
                    promptTokens: part.totalUsage.inputTokens ?? 0,
                    completionTokens: part.totalUsage.outputTokens ?? 0,
                    totalTokens:
                      (part.totalUsage.inputTokens ?? 0) + (part.totalUsage.outputTokens ?? 0),
                  }
                : undefined,
            }
            break
          default:
            break
        }
      }
    } catch (outerError) {
      yield {
        type: 'error',
        error: formatProviderError(outerError),
      }
    }
  }

  /**
   * Convert our message format to AI SDK format
   * Z.ai doesn't support system role, so we filter it out
   * Chutes doesn't support tool role, so we convert to assistant messages
   */
  private convertMessages(messages: CompletionOptions['messages']): CoreMessage[] {
    const isZai = this.config.auth.baseUrl?.includes('z.ai')
    const isChutes = this.config.auth.baseUrl?.includes('chutes.ai')

    let filteredMessages = messages

    // Filter out system messages for Z.ai
    if (isZai) {
      filteredMessages = filteredMessages.filter((msg: CompletionMessage) => msg.role !== 'system')
    }

    // Z.ai rejects system messages. If we filtered everything out, surface a clear error
    // instead of letting downstream validation fail with a generic message.
    if (isZai && filteredMessages.length === 0) {
      throw new Error(
        'Invalid prompt: messages must not be empty (Z.ai does not support system role; ensure a user message is present).'
      )
    }

    // Chutes doesn't support role: "tool" - convert to assistant messages with tool results
    if (isChutes) {
      filteredMessages = this.convertChutesToolMessages(filteredMessages)
    }

    return filteredMessages.map((msg: CompletionMessage): CoreMessage => {
      // AI SDK CoreToolMessage requires content to be ToolResultPart[], not a string
      if (msg.role === 'tool') {
        return {
          role: 'tool',
          content: [
            {
              type: 'tool-result',
              toolCallId: msg.tool_call_id ?? '',
              toolName: msg.name ?? 'unknown',
              result: msg.content,
            },
          ],
        }
      }

      // AI SDK CoreAssistantMessage with tool calls requires content array format
      if (msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0) {
        const parts: Array<
          | { type: 'text'; text: string }
          | { type: 'tool-call'; toolCallId: string; toolName: string; args: unknown }
        > = []
        if (msg.content) {
          parts.push({ type: 'text', text: msg.content })
        }
        for (const tc of msg.tool_calls) {
          let args: unknown = {}
          try {
            args = JSON.parse(tc.function.arguments ?? '{}')
          } catch {
            args = {}
          }
          parts.push({
            type: 'tool-call',
            toolCallId: tc.id,
            toolName: tc.function.name,
            args,
          })
        }
        return { role: 'assistant', content: parts }
      }

      const baseMessage = {
        role: msg.role,
        content: msg.content,
      } as CoreMessageWithExtras

      if (msg.name) {
        baseMessage.name = msg.name
      }
      if (msg.tool_call_id) {
        baseMessage.tool_call_id = msg.tool_call_id
      }

      return baseMessage
    })
  }

  /**
   * Convert tool role messages for Chutes which doesn't support them
   * Merges tool results into assistant messages with tool_calls
   */
  private convertChutesToolMessages(messages: CompletionMessage[]): CompletionMessage[] {
    const result: CompletionMessage[] = []
    const toolResults = new Map<string, { content: string; name?: string }>()

    // Collect all tool results
    for (const msg of messages) {
      if (msg.role === 'tool' && msg.tool_call_id) {
        toolResults.set(msg.tool_call_id, {
          content: msg.content,
          name: msg.name,
        })
      }
    }

    // Process messages, merging tool results into assistant messages
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i]

      if (msg.role === 'tool') {
        // Skip standalone tool messages - they'll be merged
        continue
      }

      if (msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0) {
        // Check if we have tool results to merge
        const hasResults = msg.tool_calls.some((tc) => toolResults.has(tc.id))

        if (hasResults) {
          // Create assistant message with tool results embedded in content
          const toolResultsContent = msg.tool_calls
            .filter((tc) => toolResults.has(tc.id))
            .map((tc) => {
              const result = toolResults.get(tc.id)!
              return `[Tool Result: ${tc.function.name}]\n${result.content}`
            })
            .join('\n\n')

          result.push({
            role: 'assistant',
            content: msg.content ? `${msg.content}\n\n${toolResultsContent}` : toolResultsContent,
            tool_calls: msg.tool_calls,
          })
        } else {
          result.push(msg)
        }
      } else {
        result.push(msg)
      }
    }

    return result
  }

  /**
   * Convert our tool format to AI SDK format
   */
  private convertTools(tools?: CompletionOptions['tools']): ToolSet | undefined {
    if (!tools || tools.length === 0) return undefined

    const toolSet: ToolSet = {}
    tools.forEach((tool: ToolDefinition) => {
      toolSet[tool.function.name] = {
        description: tool.function.description,
        parameters: jsonSchema(tool.function.parameters as JsonSchemaInput),
      }
    })
    return toolSet
  }

  /**
   * Fetch models from OpenRouter API
   */
  private async listOpenRouterModels(): Promise<ModelInfo[]> {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          Authorization: `Bearer ${this.config.auth.apiKey}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch OpenRouter models: ${response.statusText}`)
      }

      const data = (await response.json()) as OpenRouterModelsResponse

      return (data.data ?? []).map((model) => {
        const id = model.id ?? ''
        const features = model.features ?? []
        return {
          id,
          name: model.name || id,
          provider: 'openrouter' as const,
          description: model.description,
          maxTokens: model.top_provider?.max_completion_tokens || 4096,
          contextWindow: model.context_length || 8192,
          capabilities: {
            streaming: true,
            functionCalling: features.includes('tools'),
            vision: features.includes('vision') || id.includes('vision') || id.includes('claude-3'),
            jsonMode: true,
            toolUse: features.includes('tools'),
          },
          pricing: {
            inputPerToken: model.pricing?.prompt || 0,
            outputPerToken: model.pricing?.completion || 0,
          },
        }
      })
    } catch (error) {
      appLog.error('Error fetching OpenRouter models:', error)
      return this.getFallbackModels('openrouter')
    }
  }

  /**
   * Fetch models from Together.ai API
   */
  private async listTogetherModels(): Promise<ModelInfo[]> {
    try {
      const response = await fetch('https://api.together.xyz/v1/models', {
        headers: {
          Authorization: `Bearer ${this.config.auth.apiKey}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch Together models: ${response.statusText}`)
      }

      const data = (await response.json()) as TogetherModel[]

      return data.map((model) => {
        const id = model.id ?? ''
        return {
          id,
          name: model.display_name || id,
          provider: 'together' as const,
          description: model.description,
          maxTokens: model.context_length || 4096,
          contextWindow: model.context_length || 8192,
          capabilities: {
            streaming: true,
            functionCalling: model.supports_tools || false,
            vision: model.supports_vision || id.includes('llava') || false,
            jsonMode: true,
            toolUse: model.supports_tools || false,
          },
        }
      })
    } catch (error) {
      appLog.error('Error fetching Together models:', error)
      return this.getFallbackModels('together')
    }
  }

  /**
   * Get default OpenAI models
   */
  private getDefaultOpenAIModels(): ModelInfo[] {
    return [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'openai',
        description: 'Most capable multimodal model',
        maxTokens: 4096,
        contextWindow: 128000,
        capabilities: {
          streaming: true,
          functionCalling: true,
          vision: true,
          jsonMode: true,
          toolUse: true,
        },
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'openai',
        description: 'Fast, affordable small model for focused tasks',
        maxTokens: 4096,
        contextWindow: 128000,
        capabilities: {
          streaming: true,
          functionCalling: true,
          vision: true,
          jsonMode: true,
          toolUse: true,
        },
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        provider: 'openai',
        description: 'Previous generation model with 128k context',
        maxTokens: 4096,
        contextWindow: 128000,
        capabilities: {
          streaming: true,
          functionCalling: true,
          vision: true,
          jsonMode: true,
          toolUse: true,
        },
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: 'openai',
        description: 'Fast, cost-effective model for simpler tasks',
        maxTokens: 4096,
        contextWindow: 16385,
        capabilities: {
          streaming: true,
          functionCalling: true,
          vision: false,
          jsonMode: true,
          toolUse: true,
        },
      },
    ]
  }

  /**
   * Get fallback models when API fetch fails
   */
  private getFallbackModels(provider: 'openrouter' | 'together'): ModelInfo[] {
    if (provider === 'openrouter') {
      return [
        {
          id: 'anthropic/claude-3.5-sonnet',
          name: 'Claude 3.5 Sonnet',
          provider: 'openrouter',
          maxTokens: 8192,
          contextWindow: 200000,
          capabilities: {
            streaming: true,
            functionCalling: true,
            vision: true,
            jsonMode: true,
            toolUse: true,
          },
        },
        {
          id: 'openai/gpt-4o',
          name: 'GPT-4o',
          provider: 'openrouter',
          maxTokens: 4096,
          contextWindow: 128000,
          capabilities: {
            streaming: true,
            functionCalling: true,
            vision: true,
            jsonMode: true,
            toolUse: true,
          },
        },
      ]
    }

    return [
      {
        id: 'togethercomputer/llama-3.1-70b',
        name: 'Llama 3.1 70B',
        provider: 'together',
        maxTokens: 4096,
        contextWindow: 128000,
        capabilities: {
          streaming: true,
          functionCalling: true,
          vision: false,
          jsonMode: true,
          toolUse: true,
        },
      },
    ]
  }
}

/**
 * Factory function to create a provider instance
 */
export function createOpenAICompatibleProvider(config: ProviderConfig): OpenAICompatibleProvider {
  return new OpenAICompatibleProvider(config)
}
