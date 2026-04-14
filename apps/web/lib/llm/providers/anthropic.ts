/**
 * Anthropic Provider
 *
 * Native Anthropic provider with reasoning-aware stream mapping.
 */

import { createAnthropic } from '@ai-sdk/anthropic'
import { generateText, jsonSchema, streamText, NoSuchToolError, type CoreMessage, type ToolSet } from 'ai'
import { formatProviderError, repairHallucinatedToolName } from './error-utils'
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
      maxRetries: this.config.maxRetries ?? 0,
      topP: options.topP,
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
      maxRetries: this.config.maxRetries ?? 0,
      topP: options.topP,
      ...(tools ? { tools } : {}),
      providerOptions: {
        anthropic: anthropicOptions,
      },
      // Gracefully handle hallucinated tool names (e.g. "write_to_file", "create_file").
      // Try to map the call to the closest available tool so the harness can respond
      // with a proper denial instead of crashing the stream with NoSuchToolError.
      experimental_repairToolCall: async ({ toolCall, tools: availableTools, error }) => {
        if (!(error instanceof NoSuchToolError)) throw error
        const knownNames = Object.keys(availableTools ?? {})
        const repaired = repairHallucinatedToolName(toolCall.toolName, knownNames)
        if (!repaired) return null
        return { ...toolCall, toolName: repaired }
      },
    } as StreamTextArgs)

    try {
      for await (const part of result.fullStream as AsyncIterable<AiStreamPart>) {
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
              error: formatProviderError(part.error ?? 'Unknown Anthropic stream error'),
            }
            return
          case 'finish': {
            // Extract usage data including Anthropic-specific cache tokens
            const usage = part.totalUsage
            const inputTokens = usage?.inputTokens ?? 0
            const outputTokens = usage?.outputTokens ?? 0

            // Type assertion for Anthropic-specific usage fields
            const anthropicUsage = usage as {
              cacheCreationInputTokens?: number
              cacheReadInputTokens?: number
            }

            yield {
              type: 'finish',
              finishReason: normalizeFinishReason(part.finishReason),
              usage: usage
                ? {
                    promptTokens: inputTokens,
                    completionTokens: outputTokens,
                    totalTokens: inputTokens + outputTokens,
                    reasoningTokens: (usage as { reasoningTokens?: number }).reasoningTokens,
                    cacheWriteTokens: anthropicUsage.cacheCreationInputTokens,
                    cacheReadTokens: anthropicUsage.cacheReadInputTokens,
                  }
                : undefined,
            }
            break
          }
          default:
            break
        }
      }
    } catch (error) {
      yield {
        type: 'error',
        error: formatProviderError(error),
      }
    }
  }

  private convertMessages(messages: CompletionMessage[]): CoreMessage[] {
    return messages.map((msg) => {
      const baseMessage = {
        role: msg.role,
        content: msg.content,
      } as CoreMessageWithExtras

      if (msg.name) {
        baseMessage.name = msg.name
      }
      if (msg.tool_calls) {
        baseMessage.tool_calls = msg.tool_calls
      }
      if (msg.tool_call_id) {
        baseMessage.tool_call_id = msg.tool_call_id
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
        parameters: jsonSchema(tool.function.parameters as JsonSchemaInput),
      }
    })
    return toolSet
  }
}

export function createAnthropicProvider(config: ProviderConfig): AnthropicProvider {
  return new AnthropicProvider(config)
}

