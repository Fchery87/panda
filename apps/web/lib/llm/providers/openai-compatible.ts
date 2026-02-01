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
    console.log('[completionStream] Starting with model:', options.model)
    console.log('[completionStream] BaseURL:', this.config.auth.baseUrl)
    console.log('[completionStream] Messages count:', options.messages.length)
    console.log('[completionStream] Tools provided:', options.tools?.length || 0)
    if (options.messages.length > 0) {
      console.log('[completionStream] First message role:', options.messages[0]?.role)
      console.log(
        '[completionStream] First message preview:',
        options.messages[0]?.content?.slice(0, 100)
      )
    }

    // Detect Z.ai provider
    const isZai = this.config.auth.baseUrl?.includes('z.ai') ?? false
    console.log('[completionStream] Is Z.ai provider:', isZai)

    // Z.ai requires special handling for tool streaming
    // Use direct fetch implementation that properly handles tool_stream parameter
    if (isZai && options.tools && options.tools.length > 0) {
      console.log('[completionStream] Using direct Z.ai implementation for tool streaming')
      yield* zaiCompletionStream(options, {
        apiKey: this.config.auth.apiKey,
        baseUrl: this.config.auth.baseUrl || 'https://api.z.ai/api/coding/paas/v4',
      })
      return
    }

    try {
      // Only send tools if they're provided and not empty
      const tools =
        options.tools && options.tools.length > 0 ? this.convertTools(options.tools) : undefined

      console.log('[completionStream] Tools converted:', tools ? 'yes' : 'no')
      if (tools) {
        console.log('[completionStream] Tool names:', Object.keys(tools).join(', '))
      }

      let result
      try {
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

        // Z.ai requires tool_stream=true parameter when using tools with streaming
        // This is a Z.ai-specific parameter not supported by standard OpenAI API
        if (isZai && tools) {
          console.log('[completionStream] Adding Z.ai specific tool_stream parameter')
          // Add providerOptions for Z.ai - this may work with newer AI SDK versions
          streamOptions.providerOptions = {
            openai: {
              tool_stream: true,
            },
          }
          // Also try adding as a custom header that Z.ai might recognize
          streamOptions.headers = {
            ...streamOptions.headers,
            'X-Tool-Stream': 'true',
          }
        }

        result = streamText(streamOptions)
        console.log('[completionStream] streamText created successfully')
      } catch (setupError) {
        const errorMsg = setupError instanceof Error ? setupError.message : String(setupError)
        console.error('[completionStream] Failed to create streamText:', setupError)
        yield {
          type: 'error',
          error: `Failed to start stream: ${errorMsg}`,
        }
        return
      }

      const toolCalls: ToolCall[] = []

      // Stream text deltas
      console.log('[completionStream] Starting text stream loop...')
      try {
        let chunkCount = 0
        for await (const delta of result.textStream) {
          chunkCount++
          console.log(`[completionStream] Received delta #${chunkCount}:`, delta?.slice(0, 50))

          if (!delta) {
            console.log('[completionStream] Received empty delta, skipping')
            continue
          }

          // Some providers buffer tokens and emit large chunks. Split to improve perceived
          // streaming (closer to token-by-token) without changing model output.
          const chunks = splitForPerceivedStreaming(delta)
          console.log(`[completionStream] Split into ${chunks.length} chunks`)

          for (const chunk of chunks) {
            yield {
              type: 'text',
              content: chunk,
            }
          }
        }
        console.log(`[completionStream] Text stream loop complete. Total deltas: ${chunkCount}`)

        // Check if we got any content - if not, this might be a provider issue
        if (chunkCount === 0) {
          console.error(
            '[completionStream] WARNING: Received 0 deltas from stream. This may indicate:'
          )
          console.error('  1. Provider (Z.ai) does not support streaming')
          console.error('  2. Provider does not support tools with this model')
          console.error('  3. API key or endpoint is invalid')
          console.error('  4. Network or timeout issue')
        }
      } catch (streamError) {
        const errorMsg = streamError instanceof Error ? streamError.message : String(streamError)
        console.error('[completionStream] Error during text streaming:', streamError)
        yield {
          type: 'error',
          error: `Stream error: ${errorMsg}`,
        }
        return
      }

      // Get the final result for tool calls and usage
      console.log('[completionStream] Getting final result...')
      let finalResult
      try {
        finalResult = await result
        console.log('[completionStream] Final result object received, awaiting properties...')
      } catch (finalError) {
        const errorMsg = finalError instanceof Error ? finalError.message : String(finalError)
        console.error('[completionStream] Error getting final result:', finalError)
        yield {
          type: 'error',
          error: `Failed to complete: ${errorMsg}`,
        }
        return
      }

      // Handle tool calls - toolCalls is a Promise, need to await it
      console.log('[completionStream] Checking for tool calls...')
      let toolCallsResult
      try {
        toolCallsResult = await finalResult.toolCalls
        console.log(
          '[completionStream] Tool calls result:',
          toolCallsResult?.length || 0,
          'tool calls'
        )

        if (toolCallsResult && toolCallsResult.length > 0) {
          for (const toolCall of toolCallsResult) {
            console.log('[completionStream] Yielding tool call:', toolCall.toolName)
            const tc: ToolCall = {
              id: toolCall.toolCallId,
              type: 'function',
              function: {
                name: toolCall.toolName,
                arguments: JSON.stringify(toolCall.args),
              },
            }
            toolCalls.push(tc)

            yield {
              type: 'tool_call',
              toolCall: tc,
            }
          }
        }
      } catch (toolError) {
        const errorMsg = toolError instanceof Error ? toolError.message : String(toolError)
        console.error('[completionStream] Error extracting tool calls:', toolError)
        yield {
          type: 'error',
          error: `Failed to extract tool calls: ${errorMsg}`,
        }
        return
      }

      // Get finishReason and usage - both may be Promises that need awaiting
      console.log('[completionStream] Getting finishReason and usage...')
      let finishReason: string = 'unknown'
      let usageResult:
        | { promptTokens: number; completionTokens: number; totalTokens: number }
        | undefined

      // Helper to await with timeout
      const awaitWithTimeout = async <T>(
        promise: Promise<T>,
        timeoutMs: number,
        defaultValue: T
      ): Promise<T> => {
        try {
          return await Promise.race([
            promise,
            new Promise<T>((_, reject) =>
              setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
            ),
          ])
        } catch (error) {
          console.warn(`[completionStream] Promise timed out or failed:`, error)
          return defaultValue
        }
      }

      try {
        // finishReason might be a Promise or a value - use timeout to prevent hanging
        const finishReasonValue = await awaitWithTimeout(
          Promise.resolve(finalResult.finishReason),
          5000,
          'unknown'
        )
        finishReason = finishReasonValue as string
        console.log('[completionStream] Finish reason:', finishReason)
      } catch (finishError) {
        console.error('[completionStream] Error getting finishReason:', finishError)
        finishReason = 'unknown'
      }

      try {
        // usage might be a Promise or a value - use timeout to prevent hanging
        const usageValue = await awaitWithTimeout(
          Promise.resolve(finalResult.usage),
          5000,
          undefined
        )
        usageResult = usageValue as {
          promptTokens: number
          completionTokens: number
          totalTokens: number
        }
        console.log('[completionStream] Usage received:', usageResult)
      } catch (usageError) {
        console.error('[completionStream] Error getting usage:', usageError)
      }

      // Yield finish event
      try {
        if (usageResult) {
          yield {
            type: 'finish',
            finishReason: finishReason as any,
            usage: {
              promptTokens: usageResult.promptTokens,
              completionTokens: usageResult.completionTokens,
              totalTokens: usageResult.totalTokens,
            },
          }
        } else {
          yield {
            type: 'finish',
            finishReason: finishReason as any,
          }
        }
      } catch (yieldError) {
        const errorMsg = yieldError instanceof Error ? yieldError.message : String(yieldError)
        console.error('[completionStream] Error yielding finish event:', yieldError)
        yield {
          type: 'error',
          error: `Failed to yield finish: ${errorMsg}`,
        }
      }

      console.log('[completionStream] Stream complete successfully')
    } catch (outerError) {
      const errorMsg = outerError instanceof Error ? outerError.message : String(outerError)
      console.error('[completionStream] Unexpected error:', outerError)
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
