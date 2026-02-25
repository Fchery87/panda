/**
 * DeepSeek Provider
 *
 * Supports DeepSeek AI platform with reasoning capabilities.
 * Uses OpenAI-compatible API with DeepSeek-specific features.
 *
 * Base URL: https://api.deepseek.com/v1/
 * Authentication: Authorization: Bearer <API_KEY>
 *
 * Key features:
 * - DeepSeek V3 with advanced reasoning
 * - R1 models with chain-of-thought
 * - Supports function calling
 */

import type {
  LLMProvider,
  ModelInfo,
  CompletionOptions,
  CompletionResponse,
  StreamChunk,
  ProviderConfig,
} from '../types'
import { OpenAICompatibleProvider } from './openai-compatible'

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1'
type DeepSeekApiModel = Record<string, unknown>

export class DeepSeekProvider implements LLMProvider {
  name = 'deepseek'
  config: ProviderConfig
  private baseProvider: OpenAICompatibleProvider

  constructor(config: ProviderConfig) {
    const deepseekConfig: ProviderConfig = {
      ...config,
      provider: 'deepseek',
      auth: {
        ...config.auth,
        baseUrl: config.auth.baseUrl || DEEPSEEK_BASE_URL,
      },
      capabilities: {
        supportsReasoning: true,
        supportsInterleavedReasoning: false,
        supportsReasoningSummary: true,
        supportsToolStreaming: true,
        reasoningControl: 'effort',
      },
    }

    this.config = deepseekConfig
    this.baseProvider = new OpenAICompatibleProvider(deepseekConfig)
  }

  async listModels(): Promise<ModelInfo[]> {
    try {
      const response = await fetch(`${this.config.auth.baseUrl || DEEPSEEK_BASE_URL}/models`, {
        headers: {
          Authorization: `Bearer ${this.config.auth.apiKey}`,
        },
      })

      if (!response.ok) {
        return this.getDefaultModels()
      }

      const data = await response.json()
      const models = data.data || []

      if (models.length === 0) {
        return this.getDefaultModels()
      }

      return (models as DeepSeekApiModel[]).map((model) => this.transformModel(model))
    } catch (error) {
      void error
      return this.getDefaultModels()
    }
  }

  private transformModel(model: DeepSeekApiModel): ModelInfo {
    const id = String(model.id ?? '')
    const isReasoning = id.includes('reasoner') || id.includes('r1')
    const hasVision = id.includes('vision')

    return {
      id,
      name: this.formatModelName(id),
      provider: 'deepseek',
      description:
        typeof model.description === 'string' && model.description.length > 0
          ? model.description
          : `DeepSeek ${id}`,
      maxTokens: typeof model.max_output_tokens === 'number' ? model.max_output_tokens : 8192,
      contextWindow: typeof model.context_length === 'number' ? model.context_length : 64000,
      capabilities: {
        streaming: true,
        functionCalling: !isReasoning,
        vision: hasVision,
        jsonMode: true,
        toolUse: !isReasoning,
        supportsReasoning: isReasoning,
      },
    }
  }

  private formatModelName(id: string): string {
    return id
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  }

  private getDefaultModels(): ModelInfo[] {
    return [
      {
        id: 'deepseek-chat',
        name: 'DeepSeek Chat',
        provider: 'deepseek',
        description: 'DeepSeek V3 - Advanced reasoning and coding',
        maxTokens: 8192,
        contextWindow: 64000,
        capabilities: {
          streaming: true,
          functionCalling: true,
          vision: false,
          jsonMode: true,
          toolUse: true,
          supportsReasoning: true,
        },
      },
      {
        id: 'deepseek-reasoner',
        name: 'DeepSeek Reasoner',
        provider: 'deepseek',
        description: 'DeepSeek R1 - Chain-of-thought reasoning',
        maxTokens: 8192,
        contextWindow: 64000,
        capabilities: {
          streaming: true,
          functionCalling: false,
          vision: false,
          jsonMode: true,
          toolUse: false,
          supportsReasoning: true,
        },
      },
    ]
  }

  async complete(options: CompletionOptions): Promise<CompletionResponse> {
    return this.baseProvider.complete(options)
  }

  async *completionStream(options: CompletionOptions): AsyncGenerator<StreamChunk> {
    yield* this.baseProvider.completionStream(options)
  }
}

export function createDeepSeekProvider(config: ProviderConfig): DeepSeekProvider {
  return new DeepSeekProvider(config)
}

export function createDeepSeekProviderFromApiKey(
  apiKey: string,
  defaultModel?: string
): DeepSeekProvider {
  return new DeepSeekProvider({
    provider: 'deepseek',
    auth: {
      apiKey,
      baseUrl: DEEPSEEK_BASE_URL,
    },
    defaultModel: defaultModel || 'deepseek-chat',
  })
}
