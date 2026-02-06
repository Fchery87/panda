/**
 * Anthropic Provider
 *
 * Native Anthropic provider with reasoning-aware stream mapping.
 */

import { createAnthropic } from '@ai-sdk/anthropic'
import { generateText, streamText, type CoreMessage, type ToolSet } from 'ai'
import type {
  CompletionMessage,
  CompletionOptions,
  CompletionResponse,
  LLMProvider,
  ModelInfo,
  ProviderConfig,
  StreamChunk,
  ToolCall,
  ToolDefinition,
} from '../types'

export class AnthropicProvider implements LLMProvider {
  name = 'anthropic'
  config: ProviderConfig
  private client: ReturnType<typeof createAnthropic>

  constructor(config: ProviderConfig) {
    this.config = config
    this.client = createAnthropic({
      apiKey: config.auth.apiKey,
      baseURL: config.auth.baseUrl,
      headers: config.customHeaders,
    })
  }

  async listModels(): Promise<ModelInfo[]> {
    return [
      {
        id: 'claude-opus-4-6',
        name: 'Claude Opus 4.6',
        provider: 'anthropic',
        maxTokens: 8192,
        contextWindow: 1_000_000,
        capabilities: {
          streaming: true,
          functionCalling: true,
          vision: true,
          jsonMode: true,
          toolUse: true,
          supportsReasoning: true,
          supportsInterleavedReasoning: true,
          supportsReasoningSummary: true,
          supportsToolStreaming: true,
          reasoningControl: 'budget',
        },
      },
      {
        id: 'claude-sonnet-4-5',
        name: 'Claude Sonnet 4.5',
        provider: 'anthropic',
        maxTokens: 8192,
        contextWindow: 200_000,
        capabilities: {
          streaming: true,
          functionCalling: true,
          vision: true,
          jsonMode: true,
          toolUse: true,
          supportsReasoning: true,
          supportsInterleavedReasoning: true,
          supportsReasoningSummary: true,
          supportsToolStreaming: true,
          reasoningControl: 'budget',
        },
      },
    ]
  }

  async complete(options: CompletionOptions): Promise<CompletionResponse> {
    const result = await generateText({
      model: this.client(options.model),
      messages: this.convertMessages(options.messages),
      temperature: options.temperature ?? 0.7,
      maxTokens: options.maxTokens,
      topP: options.topP,
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

  async *completionStream(options: CompletionOptions): AsyncGenerator<StreamChunk> {
    const tools = this.convertTools(options.tools)
    const anthropicOptions: Record<string, unknown> = {}

    if (options.reasoning?.enabled) {
      anthropicOptions.thinking = {
        type: 'enabled',
        ...(options.reasoning.budgetTokens ? { budgetTokens: options.reasoning.budgetTokens } : {}),
        ...(options.reasoning.effort ? { effort: options.reasoning.effort } : {}),
      }
    }

    const result = streamText({
      model: this.client(options.model),
      messages: this.convertMessages(options.messages),
      temperature: options.temperature ?? 0.7,
      maxTokens: options.maxTokens,
      topP: options.topP,
      ...(tools ? { tools } : {}),
      providerOptions: {
        anthropic: anthropicOptions,
      },
    } as any)

    try {
      for await (const part of result.fullStream as AsyncIterable<any>) {
        switch (part.type) {
          case 'text-delta':
            if (part.textDelta || part.text) {
              yield { type: 'text', content: part.textDelta ?? part.text }
            }
            break
          case 'reasoning-delta':
            if (part.textDelta || part.text) {
              yield {
                type: 'reasoning',
                reasoningContent: part.textDelta ?? part.text,
              }
            }
            break
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
              error: part.error?.message ?? String(part.error ?? 'Unknown Anthropic stream error'),
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
    } catch (error) {
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  private convertMessages(messages: CompletionMessage[]): CoreMessage[] {
    return messages.map((msg) => {
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

  private convertTools(tools?: ToolDefinition[]): ToolSet | undefined {
    if (!tools || tools.length === 0) return undefined

    const toolSet: ToolSet = {}
    tools.forEach((tool) => {
      toolSet[tool.function.name] = {
        description: tool.function.description,
        parameters: tool.function.parameters as any,
      }
    })
    return toolSet
  }
}

export function createAnthropicProvider(config: ProviderConfig): AnthropicProvider {
  return new AnthropicProvider(config)
}
