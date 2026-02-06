/**
 * OpenAI Compatible Provider
 *
 * Supports OpenAI, OpenRouter, Together.ai, and other OpenAI-compatible APIs.
 * Uses the Vercel AI SDK for streaming completions.
 */

import { streamText, generateText, type CoreMessage, type ToolSet } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
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
import { zaiCompletionStream } from './zai-stream'

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
      finishReason: result.finishReason as any,
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

      const streamOptions: any = {
        model: this.client(options.model),
        messages: this.convertMessages(options.messages),
        temperature: options.temperature ?? 0.7,
        maxTokens: options.maxTokens,
        topP: options.topP,
        frequencyPenalty: options.frequencyPenalty,
        presencePenalty: options.presencePenalty,
        ...(tools && { tools }),
      }

      const result = streamText(streamOptions)
      for await (const part of result.fullStream as AsyncIterable<any>) {
        switch (part.type) {
          case 'text-delta': {
            const delta = part.textDelta ?? part.text
            if (!delta) break
            const chunks = splitForPerceivedStreaming(delta)
            for (const chunk of chunks) {
              yield { type: 'text', content: chunk }
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
              error: part.error?.message ?? String(part.error ?? 'Unknown stream error'),
            }
            return
          case 'finish':
            yield {
              type: 'finish',
              finishReason: (part.finishReason ?? 'stop') as any,
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
      const errorMsg = outerError instanceof Error ? outerError.message : String(outerError)
      yield {
        type: 'error',
        error: `Unexpected error: ${errorMsg}`,
      }
    }
  }

  /**
   * Convert our message format to AI SDK format
   * Z.ai doesn't support system role, so we filter it out
   */
  private convertMessages(messages: CompletionOptions['messages']): CoreMessage[] {
    const isZai = this.config.auth.baseUrl?.includes('z.ai')

    // Filter out system messages for Z.ai
    const filteredMessages = isZai
      ? messages.filter((msg: CompletionMessage) => msg.role !== 'system')
      : messages

    // Z.ai rejects system messages. If we filtered everything out, surface a clear error
    // instead of letting downstream validation fail with a generic message.
    if (isZai && filteredMessages.length === 0) {
      throw new Error(
        'Invalid prompt: messages must not be empty (Z.ai does not support system role; ensure a user message is present).'
      )
    }

    return filteredMessages.map((msg: CompletionMessage) => {
      const baseMessage = {
        role: msg.role,
        content: msg.content,
      } as CoreMessage

      if (msg.name) {
        ;(baseMessage as any).name = msg.name
      }
      if (msg.tool_calls) {
        ;(baseMessage as any).tool_calls = msg.tool_calls
      }
      if (msg.tool_call_id) {
        ;(baseMessage as any).tool_call_id = msg.tool_call_id
      }

      return baseMessage
    })
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
        parameters: tool.function.parameters as any,
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

      const data = await response.json()

      return data.data.map((model: any) => ({
        id: model.id,
        name: model.name || model.id,
        provider: 'openrouter' as const,
        description: model.description,
        maxTokens: model.top_provider?.max_completion_tokens || 4096,
        contextWindow: model.context_length || 8192,
        capabilities: {
          streaming: true,
          functionCalling: model.features?.includes('tools') || false,
          vision:
            model.features?.includes('vision') ||
            model.id.includes('vision') ||
            model.id.includes('claude-3'),
          jsonMode: true,
          toolUse: model.features?.includes('tools') || false,
        },
        pricing: {
          inputPerToken: model.pricing?.prompt || 0,
          outputPerToken: model.pricing?.completion || 0,
        },
      }))
    } catch (error) {
      console.error('Error fetching OpenRouter models:', error)
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

      const data = await response.json()

      return data.map((model: any) => ({
        id: model.id,
        name: model.display_name || model.id,
        provider: 'together' as const,
        description: model.description,
        maxTokens: model.context_length || 4096,
        contextWindow: model.context_length || 8192,
        capabilities: {
          streaming: true,
          functionCalling: model.supports_tools || false,
          vision: model.supports_vision || model.id.includes('llava') || false,
          jsonMode: true,
          toolUse: model.supports_tools || false,
        },
      }))
    } catch (error) {
      console.error('Error fetching Together models:', error)
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
