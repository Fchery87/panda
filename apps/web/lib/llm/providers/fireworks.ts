/**
 * Fireworks AI Provider
 *
 * Supports Fireworks AI platform - fast inference with fine-tuning support.
 * Uses OpenAI-compatible API.
 *
 * Base URL: https://api.fireworks.ai/inference/v1/
 * Authentication: Authorization: Bearer <API_KEY>
 *
 * Key features:
 * - Fast inference
 * - Fine-tuned models
 * - Multiple model families
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

const FIREWORKS_BASE_URL = 'https://api.fireworks.ai/inference/v1'
type FireworksApiModel = Record<string, unknown>

export class FireworksProvider implements LLMProvider {
  name = 'fireworks'
  config: ProviderConfig
  private baseProvider: OpenAICompatibleProvider

  constructor(config: ProviderConfig) {
    const fireworksConfig: ProviderConfig = {
      ...config,
      provider: 'fireworks',
      auth: {
        ...config.auth,
        baseUrl: config.auth.baseUrl || FIREWORKS_BASE_URL,
      },
      capabilities: {
        supportsReasoning: false,
        supportsInterleavedReasoning: false,
        supportsReasoningSummary: false,
        supportsToolStreaming: true,
        reasoningControl: 'none',
      },
    }

    this.config = fireworksConfig
    this.baseProvider = new OpenAICompatibleProvider(fireworksConfig)
  }

  async listModels(): Promise<ModelInfo[]> {
    try {
      const response = await fetch(`${this.config.auth.baseUrl || FIREWORKS_BASE_URL}/models`, {
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

      return (models as FireworksApiModel[])
        .filter((model) => model.type === 'text')
        .map((model) => this.transformModel(model))
    } catch (error) {
      void error
      return this.getDefaultModels()
    }
  }

  private transformModel(model: FireworksApiModel): ModelInfo {
    const id = String(model.id ?? '')
    const hasTools =
      id.includes('llama') || id.includes('mixtral') || id.includes('qwen') || id.includes('phi')

    return {
      id,
      name: this.formatModelName(id),
      provider: 'fireworks',
      description:
        typeof model.description === 'string' && model.description.length > 0
          ? model.description
          : `Fireworks ${id}`,
      maxTokens: typeof model.max_output_tokens === 'number' ? model.max_output_tokens : 4096,
      contextWindow: typeof model.context_length === 'number' ? model.context_length : 32768,
      capabilities: {
        streaming: true,
        functionCalling: hasTools,
        vision: false,
        jsonMode: true,
        toolUse: hasTools,
      },
    }
  }

  private formatModelName(id: string): string {
    const parts = id.split('/')
    const name = parts.length > 1 ? parts[1] : parts[0]

    return name
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  }

  private getDefaultModels(): ModelInfo[] {
    return [
      {
        id: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
        name: 'Llama 3.3 70B Instruct',
        provider: 'fireworks',
        description: 'Meta Llama 3.3 70B - High performance',
        maxTokens: 16384,
        contextWindow: 131072,
        capabilities: {
          streaming: true,
          functionCalling: true,
          vision: false,
          jsonMode: true,
          toolUse: true,
        },
      },
      {
        id: 'accounts/fireworks/models/qwen2p5-72b-instruct',
        name: 'Qwen 2.5 72B Instruct',
        provider: 'fireworks',
        description: 'Alibaba Qwen 2.5 72B - Strong multilingual',
        maxTokens: 16384,
        contextWindow: 131072,
        capabilities: {
          streaming: true,
          functionCalling: true,
          vision: false,
          jsonMode: true,
          toolUse: true,
        },
      },
      {
        id: 'accounts/fireworks/models/phi-4',
        name: 'Phi 4',
        provider: 'fireworks',
        description: 'Microsoft Phi 4 - Compact and capable',
        maxTokens: 16384,
        contextWindow: 16384,
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

  async complete(options: CompletionOptions): Promise<CompletionResponse> {
    return this.baseProvider.complete(options)
  }

  async *completionStream(options: CompletionOptions): AsyncGenerator<StreamChunk> {
    yield* this.baseProvider.completionStream(options)
  }
}

export function createFireworksProvider(config: ProviderConfig): FireworksProvider {
  return new FireworksProvider(config)
}

export function createFireworksProviderFromApiKey(
  apiKey: string,
  defaultModel?: string
): FireworksProvider {
  return new FireworksProvider({
    provider: 'fireworks',
    auth: {
      apiKey,
      baseUrl: FIREWORKS_BASE_URL,
    },
    defaultModel: defaultModel || 'accounts/fireworks/models/llama-v3p3-70b-instruct',
  })
}
