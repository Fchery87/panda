/**
 * Groq Provider
 *
 * Supports Groq platform - ultra-fast LLM inference.
 * Uses OpenAI-compatible API.
 *
 * Base URL: https://api.groq.com/openai/v1/
 * Authentication: Authorization: Bearer <API_KEY>
 *
 * Key features:
 * - Ultra-fast inference
 * - Llama, Mixtral, Gemma models
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

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1'

export class GroqProvider implements LLMProvider {
  name = 'groq'
  config: ProviderConfig
  private baseProvider: OpenAICompatibleProvider

  constructor(config: ProviderConfig) {
    const groqConfig: ProviderConfig = {
      ...config,
      provider: 'groq',
      auth: {
        ...config.auth,
        baseUrl: config.auth.baseUrl || GROQ_BASE_URL,
      },
      capabilities: {
        supportsReasoning: false,
        supportsInterleavedReasoning: false,
        supportsReasoningSummary: false,
        supportsToolStreaming: true,
        reasoningControl: 'none',
      },
    }

    this.config = groqConfig
    this.baseProvider = new OpenAICompatibleProvider(groqConfig)
  }

  async listModels(): Promise<ModelInfo[]> {
    try {
      const response = await fetch(`${this.config.auth.baseUrl || GROQ_BASE_URL}/models`, {
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

      return models.map((model: any) => this.transformModel(model))
    } catch {
      return this.getDefaultModels()
    }
  }

  private transformModel(model: any): ModelInfo {
    const id = model.id
    const hasTools = id.includes('llama') || id.includes('mixtral') || id.includes('gemma2')

    return {
      id,
      name: this.formatModelName(id),
      provider: 'groq',
      description: model.description || `Groq ${id}`,
      maxTokens: 8192,
      contextWindow: model.context_window || 131072,
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
    return id
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  }

  private getDefaultModels(): ModelInfo[] {
    return [
      {
        id: 'llama-3.3-70b-versatile',
        name: 'Llama 3.3 70B Versatile',
        provider: 'groq',
        description: 'Meta Llama 3.3 70B - Versatile and fast',
        maxTokens: 8192,
        contextWindow: 128000,
        capabilities: {
          streaming: true,
          functionCalling: true,
          vision: false,
          jsonMode: true,
          toolUse: true,
        },
      },
      {
        id: 'llama-3.1-8b-instant',
        name: 'Llama 3.1 8B Instant',
        provider: 'groq',
        description: 'Meta Llama 3.1 8B - Ultra fast',
        maxTokens: 8192,
        contextWindow: 128000,
        capabilities: {
          streaming: true,
          functionCalling: true,
          vision: false,
          jsonMode: true,
          toolUse: true,
        },
      },
      {
        id: 'mixtral-8x7b-32768',
        name: 'Mixtral 8x7B',
        provider: 'groq',
        description: 'Mistral Mixtral 8x7B - Efficient MoE',
        maxTokens: 32768,
        contextWindow: 32768,
        capabilities: {
          streaming: true,
          functionCalling: true,
          vision: false,
          jsonMode: true,
          toolUse: true,
        },
      },
      {
        id: 'gemma2-9b-it',
        name: 'Gemma 2 9B IT',
        provider: 'groq',
        description: 'Google Gemma 2 9B - Instruction tuned',
        maxTokens: 8192,
        contextWindow: 8192,
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

export function createGroqProvider(config: ProviderConfig): GroqProvider {
  return new GroqProvider(config)
}

export function createGroqProviderFromApiKey(apiKey: string, defaultModel?: string): GroqProvider {
  return new GroqProvider({
    provider: 'groq',
    auth: {
      apiKey,
      baseUrl: GROQ_BASE_URL,
    },
    defaultModel: defaultModel || 'llama-3.3-70b-versatile',
  })
}
