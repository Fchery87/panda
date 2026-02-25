/**
 * Chutes AI Provider
 *
 * Supports Chutes.ai platform - a decentralized AI model serving platform.
 * Uses OpenAI-compatible API with custom model fetching.
 * Supports both API Key authentication and OAuth tokens.
 *
 * Base URL: https://llm.chutes.ai/v1/
 * Authentication: Authorization: Bearer <API_KEY> or <OAuth_ACCESS_TOKEN>
 *
 * @see https://chutes.ai/docs/sign-in-with-chutes
 */

import { appLog } from '@/lib/logger'
import type {
  LLMProvider,
  ModelInfo,
  CompletionOptions,
  CompletionResponse,
  StreamChunk,
  ProviderConfig,
} from '../types'
import { OpenAICompatibleProvider } from './openai-compatible'

const CHUTES_LLM_BASE_URL = 'https://llm.chutes.ai/v1'
type ChutesApiModel = Record<string, unknown>

export interface ChutesTokens {
  accessToken: string
  refreshToken?: string
  expiresAt?: number
  scope?: string
}

export type TokenRefreshCallback = () => Promise<ChutesTokens | null>

/**
 * Chutes Provider implementation
 * Extends OpenAI-compatible provider with Chutes-specific model fetching
 */
export class ChutesProvider implements LLMProvider {
  name = 'chutes'
  config: ProviderConfig
  private baseProvider: OpenAICompatibleProvider
  private baseUrl: string
  private tokenRefreshCallback?: TokenRefreshCallback

  private static normalizeBaseUrl(baseUrl?: string): string {
    return (baseUrl || CHUTES_LLM_BASE_URL).replace(/\/+$/, '')
  }

  private getAuthHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.auth.apiKey}`,
      'Content-Type': 'application/json',
    }
  }

  constructor(config: ProviderConfig, tokenRefreshCallback?: TokenRefreshCallback) {
    const normalizedBaseUrl = ChutesProvider.normalizeBaseUrl(config.auth.baseUrl)
    this.baseUrl = normalizedBaseUrl
    this.tokenRefreshCallback = tokenRefreshCallback

    const chutesConfig: ProviderConfig = {
      ...config,
      provider: 'chutes',
      auth: {
        ...config.auth,
        baseUrl: normalizedBaseUrl,
      },
      customHeaders: {
        ...config.customHeaders,
        Authorization: `Bearer ${config.auth.apiKey}`,
      },
    }

    this.config = chutesConfig
    this.baseProvider = new OpenAICompatibleProvider(chutesConfig)
  }

  setTokenRefreshCallback(callback: TokenRefreshCallback) {
    this.tokenRefreshCallback = callback
  }

  async updateAccessToken(accessToken: string) {
    this.config = {
      ...this.config,
      auth: {
        ...this.config.auth,
        apiKey: accessToken,
      },
      customHeaders: {
        ...this.config.customHeaders,
        Authorization: `Bearer ${accessToken}`,
      },
    }
    this.baseProvider = new OpenAICompatibleProvider(this.config)
  }

  private async ensureValidToken(): Promise<void> {
    if (!this.tokenRefreshCallback) return

    try {
      const tokens = await this.tokenRefreshCallback()
      if (tokens?.accessToken && tokens.accessToken !== this.config.auth.apiKey) {
        await this.updateAccessToken(tokens.accessToken)
      }
    } catch (error) {
      appLog.error('Failed to refresh Chutes token:', error)
    }
  }

  /**
   * Fetch available models from Chutes LLM endpoint
   * Uses the OpenAI-compatible /v1/models endpoint
   */
  async listModels(): Promise<ModelInfo[]> {
    await this.ensureValidToken()

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: this.getAuthHeaders(),
      })

      if (!response.ok) {
        const errorText = await response.text()
        appLog.error('Chutes API error:', response.status, errorText)
        throw new Error(`Failed to fetch Chutes models: ${response.statusText}`)
      }

      const data = await response.json()

      const models = data.data || data || []

      if (models.length === 0) {
        appLog.warn('No models returned from Chutes API, using fallback')
        return this.getFallbackModels()
      }

      const modelInfos = (models as ChutesApiModel[]).map((model) =>
        this.transformModelToModelInfo(model)
      )

      return modelInfos.sort((a: ModelInfo, b: ModelInfo) => a.name.localeCompare(b.name))
    } catch (error) {
      appLog.error('Error fetching Chutes models:', error)
      return this.getFallbackModels()
    }
  }

  /**
   * Transform OpenAI model format to ModelInfo
   */
  private transformModelToModelInfo(model: ChutesApiModel): ModelInfo {
    const modelId = String(model.id ?? model.name ?? '')
    const displayName = this.formatModelName(modelId)

    // Get context window from model id patterns
    const contextWindow = this.getDefaultContextLength(modelId)
    const maxTokens = Math.min(Math.floor(contextWindow / 2), 16384)

    // Determine capabilities based on model name patterns
    const name = modelId.toLowerCase()
    const hasVision = name.includes('vision') || name.includes('vl') || name.includes('llava')
    const hasTools =
      name.includes('llama-3') ||
      name.includes('qwen2.5') ||
      name.includes('qwen3') ||
      name.includes('deepseek') ||
      name.includes('gpt') ||
      name.includes('claude')

    return {
      id: modelId,
      name: displayName,
      provider: 'chutes',
      description:
        typeof model.description === 'string' && model.description.length > 0
          ? model.description
          : `Chutes model: ${displayName}`,
      maxTokens: maxTokens,
      contextWindow: contextWindow,
      capabilities: {
        streaming: true,
        functionCalling: hasTools,
        vision: hasVision,
        jsonMode: true,
        toolUse: hasTools,
      },
    }
  }

  /**
   * Format model ID to readable name
   */
  private formatModelName(modelId: string): string {
    // Extract model name from path like "meta-llama/Llama-3.1-8B-Instruct"
    const parts = modelId.split('/')
    const name = parts.length > 1 ? parts[1] : parts[0]

    // Add spaces before capitals and clean up
    return name
      .replace(/-/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Get default context length based on model name patterns
   */
  private getDefaultContextLength(modelName: string): number {
    const name = modelName.toLowerCase()

    if (name.includes('llama-3.1') || name.includes('llama-3.2') || name.includes('llama-3.3')) {
      return 128000
    }
    if (name.includes('llama-3')) {
      return 8192
    }
    if (name.includes('qwen2.5-72b') || name.includes('qwen2.5-32b')) {
      return 131072
    }
    if (name.includes('qwen')) {
      return 32768
    }
    if (name.includes('deepseek-v3')) {
      return 64000
    }
    if (name.includes('deepseek')) {
      return 32768
    }
    if (name.includes('mistral') || name.includes('mixtral')) {
      return 32768
    }

    return 8192
  }

  /**
   * Get fallback models when API fetch fails
   */
  private getFallbackModels(): ModelInfo[] {
    return [
      {
        id: 'deepseek-ai/DeepSeek-V3',
        name: 'DeepSeek V3',
        provider: 'chutes',
        description: 'DeepSeek V3 - Advanced reasoning model',
        maxTokens: 8192,
        contextWindow: 64000,
        capabilities: {
          streaming: true,
          functionCalling: true,
          vision: false,
          jsonMode: true,
          toolUse: true,
        },
      },
      {
        id: 'meta-llama/Llama-3.1-70B-Instruct',
        name: 'Llama 3.1 70B Instruct',
        provider: 'chutes',
        description: 'Meta Llama 3.1 70B - High performance',
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
      {
        id: 'meta-llama/Llama-3.1-8B-Instruct',
        name: 'Llama 3.1 8B Instruct',
        provider: 'chutes',
        description: 'Meta Llama 3.1 8B - Fast and efficient',
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
      {
        id: 'meta-llama/Llama-3.2-11B-Vision-Instruct',
        name: 'Llama 3.2 11B Vision',
        provider: 'chutes',
        description: 'Meta Llama 3.2 11B with vision capabilities',
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
        id: 'Qwen/Qwen2.5-72B-Instruct',
        name: 'Qwen 2.5 72B',
        provider: 'chutes',
        description: 'Qwen 2.5 72B - Strong multilingual model',
        maxTokens: 4096,
        contextWindow: 131072,
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
   * Create a non-streaming completion
   * Delegates to OpenAI-compatible provider
   */
  async complete(options: CompletionOptions): Promise<CompletionResponse> {
    await this.ensureValidToken()
    return this.baseProvider.complete(options)
  }

  /**
   * Create a streaming completion
   * Delegates to OpenAI-compatible provider
   */
  async *completionStream(options: CompletionOptions): AsyncGenerator<StreamChunk> {
    await this.ensureValidToken()
    yield* this.baseProvider.completionStream(options)
  }

  /**
   * Validate API key by making a test request to the LLM endpoint
   */
  async validateApiKey(): Promise<boolean> {
    await this.ensureValidToken()
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: this.getAuthHeaders(),
      })

      return response.ok
    } catch (error) {
      void error
      return false
    }
  }
}

/**
 * Factory function to create a Chutes provider instance
 */
export function createChutesProvider(
  config: ProviderConfig,
  tokenRefreshCallback?: TokenRefreshCallback
): ChutesProvider {
  return new ChutesProvider(config, tokenRefreshCallback)
}

/**
 * Create Chutes provider from API key
 * Convenience function for quick setup
 */
export function createChutesProviderFromApiKey(
  apiKey: string,
  defaultModel?: string
): ChutesProvider {
  return new ChutesProvider({
    provider: 'chutes',
    auth: {
      apiKey,
      baseUrl: CHUTES_LLM_BASE_URL,
    },
    defaultModel: defaultModel || 'meta-llama/Llama-3.1-8B-Instruct',
  })
}

/**
 * Create Chutes provider from OAuth tokens
 * For use with "Sign in with Chutes" OAuth flow
 */
export function createChutesProviderFromTokens(
  tokens: ChutesTokens,
  tokenRefreshCallback?: TokenRefreshCallback,
  defaultModel?: string
): ChutesProvider {
  return new ChutesProvider(
    {
      provider: 'chutes',
      auth: {
        apiKey: tokens.accessToken,
        baseUrl: CHUTES_LLM_BASE_URL,
      },
      defaultModel: defaultModel || 'meta-llama/Llama-3.1-8B-Instruct',
    },
    tokenRefreshCallback
  )
}
