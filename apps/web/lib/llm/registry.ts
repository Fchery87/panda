/**
 * Provider Registry
 *
 * Manages LLM provider instances and handles provider selection.
 * Supports multiple providers with different configurations.
 */

import { appLog } from '@/lib/logger'
import type {
  LLMProvider,
  ProviderConfig,
  ModelInfo,
  ProviderType,
  KnownProviderType,
} from './types'
import { isKnownProvider } from './types'
import { OpenAICompatibleProvider } from './providers/openai-compatible'
import { AnthropicProvider } from './providers/anthropic'
import { ChutesProvider } from './providers/chutes'
import { DeepSeekProvider } from './providers/deepseek'
import { GroqProvider } from './providers/groq'
import { FireworksProvider } from './providers/fireworks'
import {
  fetchModelsDevMetadata,
  mapModelsDevToModelInfo,
  type ModelsDevResponse,
} from './models-dev'

/**
 * Registry entry for a provider instance
 */
interface ProviderEntry {
  id: string
  provider: LLMProvider
  config: ProviderConfig
  createdAt: number
}

/**
 * Provider Registry - manages LLM provider instances
 */
export class ProviderRegistry {
  private providers: Map<string, ProviderEntry> = new Map()
  private defaultProviderId: string | null = null
  private modelsDevCache: ModelsDevResponse | null = null

  /**
   * Create a new provider instance
   * @param id - Unique identifier for this provider instance
   * @param config - Provider configuration
   * @param setAsDefault - Whether to set as default provider
   */
  createProvider(id: string, config: ProviderConfig, setAsDefault = false): LLMProvider {
    let provider: LLMProvider

    if (isKnownProvider(config.provider)) {
      switch (config.provider as KnownProviderType) {
        case 'openai':
        case 'openrouter':
        case 'together':
        case 'zai':
        case 'custom':
          provider = new OpenAICompatibleProvider(config)
          break
        case 'anthropic':
          provider = new AnthropicProvider(config)
          break
        case 'chutes':
          provider = new ChutesProvider(config)
          break
        case 'deepseek':
          provider = new DeepSeekProvider(config)
          break
        case 'groq':
          provider = new GroqProvider(config)
          break
        case 'fireworks':
          provider = new FireworksProvider(config)
          break
        case 'crofai':
          provider = new OpenAICompatibleProvider({
            ...config,
            auth: {
              ...config.auth,
              baseUrl: config.auth?.baseUrl || 'https://crof.ai/v1',
            },
          })
          break
        default:
          provider = new OpenAICompatibleProvider(config)
      }
    } else {
      provider = new OpenAICompatibleProvider(config)
    }

    // Store provider instance
    this.providers.set(id, {
      id,
      provider,
      config,
      createdAt: Date.now(),
    })

    // Set as default if requested
    if (setAsDefault) {
      this.defaultProviderId = id
    }

    return provider
  }

  /**
   * Get a provider by ID
   * @param id - Provider instance ID
   */
  getProvider(id: string): LLMProvider | undefined {
    const entry = this.providers.get(id)
    return entry?.provider
  }

  /**
   * Get the default provider
   */
  getDefaultProvider(): LLMProvider | undefined {
    if (!this.defaultProviderId) {
      // Return first provider if no default set
      const first = this.providers.values().next().value
      return first?.provider
    }
    return this.getProvider(this.defaultProviderId)
  }

  /**
   * Set the default provider
   */
  setDefaultProvider(id: string): void {
    if (!this.providers.has(id)) {
      throw new Error(`Provider '${id}' not found`)
    }
    this.defaultProviderId = id
  }

  /**
   * Remove a provider
   */
  removeProvider(id: string): boolean {
    if (this.defaultProviderId === id) {
      this.defaultProviderId = null
    }
    return this.providers.delete(id)
  }

  /**
   * List all registered providers
   */
  listProviders(): { id: string; type: ProviderType; createdAt: number }[] {
    return Array.from(this.providers.values()).map((entry) => ({
      id: entry.id,
      type: entry.config.provider,
      createdAt: entry.createdAt,
    }))
  }

  /**
   * Get provider configuration
   */
  getProviderConfig(id: string): ProviderConfig | undefined {
    const entry = this.providers.get(id)
    return entry?.config
  }

  /**
   * Update provider configuration
   */
  updateProviderConfig(id: string, config: Partial<ProviderConfig>): boolean {
    const entry = this.providers.get(id)
    if (!entry) return false

    // Create new provider with updated config
    const newConfig = { ...entry.config, ...config }

    // Recreate provider with new config
    this.createProvider(id, newConfig, this.defaultProviderId === id)
    return true
  }

  /**
   * Fetch all models from all providers
   */
  async listAllModels(): Promise<(ModelInfo & { providerId: string })[]> {
    const allModels: (ModelInfo & { providerId: string })[] = []

    for (const [id, entry] of this.providers) {
      try {
        const models = await entry.provider.listModels()
        allModels.push(...models.map((m) => ({ ...m, providerId: id })))
      } catch (error) {
        appLog.error(`Failed to list models for provider '${id}':`, error)
      }
    }

    return allModels
  }

  /**
   * Refresh models from Models.dev
   */
  async refreshModelsFromModelsDev(): Promise<void> {
    try {
      this.modelsDevCache = await fetchModelsDevMetadata()
    } catch (error) {
      appLog.error('Failed to fetch Models.dev metadata:', error)
    }
  }

  /**
   * Get models from Models.dev for a specific provider
   */
  getModelsFromModelsDev(providerId: string): ModelInfo[] {
    if (!this.modelsDevCache) return []
    return mapModelsDevToModelInfo(providerId, this.modelsDevCache)
  }

  /**
   * Get all models from Models.dev
   */
  async getAllModelsFromModelsDev(): Promise<{ providerId: string; models: ModelInfo[] }[]> {
    if (!this.modelsDevCache) {
      await this.refreshModelsFromModelsDev()
    }

    if (!this.modelsDevCache) return []

    return Object.keys(this.modelsDevCache).map((providerId) => ({
      providerId,
      models: mapModelsDevToModelInfo(providerId, this.modelsDevCache!),
    }))
  }

  /**
   * Clear all providers
   */
  clear(): void {
    this.providers.clear()
    this.defaultProviderId = null
    this.modelsDevCache = null
  }
}

/**
 * Singleton instance for global use
 */
let globalRegistry: ProviderRegistry | null = null

/**
 * Get or create global provider registry
 */
export function getGlobalRegistry(): ProviderRegistry {
  if (!globalRegistry) {
    globalRegistry = new ProviderRegistry()
  }
  return globalRegistry
}

/**
 * Reset global registry (useful for testing)
 */
export function resetGlobalRegistry(): void {
  globalRegistry = null
}

/**
 * Helper to create a provider from environment variables
 */
export function createProviderFromEnv(): LLMProvider | null {
  const registry = getGlobalRegistry()

  // Try OpenRouter
  if (process.env.OPENROUTER_API_KEY) {
    return registry.createProvider(
      'openrouter',
      {
        provider: 'openrouter',
        auth: {
          apiKey: process.env.OPENROUTER_API_KEY,
          baseUrl: 'https://openrouter.ai/api/v1',
        },
        defaultModel: process.env.OPENROUTER_DEFAULT_MODEL || 'anthropic/claude-3.5-sonnet',
      },
      true
    )
  }

  // Try Together.ai
  if (process.env.TOGETHER_API_KEY) {
    return registry.createProvider(
      'together',
      {
        provider: 'together',
        auth: {
          apiKey: process.env.TOGETHER_API_KEY,
          baseUrl: 'https://api.together.xyz/v1',
        },
        defaultModel: process.env.TOGETHER_DEFAULT_MODEL || 'togethercomputer/llama-3.1-70b',
      },
      true
    )
  }

  // Try Anthropic
  if (process.env.ANTHROPIC_API_KEY) {
    return registry.createProvider(
      'anthropic',
      {
        provider: 'anthropic',
        auth: {
          apiKey: process.env.ANTHROPIC_API_KEY,
          baseUrl: process.env.ANTHROPIC_BASE_URL,
        },
        defaultModel: process.env.ANTHROPIC_DEFAULT_MODEL || 'claude-sonnet-4-5',
      },
      true
    )
  }

  // Try OpenAI
  if (process.env.OPENAI_API_KEY) {
    return registry.createProvider(
      'openai',
      {
        provider: 'openai',
        auth: {
          apiKey: process.env.OPENAI_API_KEY,
          baseUrl: process.env.OPENAI_BASE_URL,
        },
        defaultModel: process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o',
      },
      true
    )
  }

  // Try Z.ai - supports both API key and coding plan
  const zaiApiKey = process.env.ZAI_API_KEY || process.env.ZAI_CODING_PLAN_KEY
  if (zaiApiKey) {
    return registry.createProvider(
      'zai',
      {
        provider: 'zai',
        auth: {
          apiKey: zaiApiKey,
          baseUrl: process.env.ZAI_BASE_URL || 'https://api.z.ai/api/paas/v4',
        },
        defaultModel: process.env.ZAI_DEFAULT_MODEL || 'glm-4.7',
      },
      true
    )
  }

  // Try Chutes.ai
  if (process.env.CHUTES_API_KEY) {
    return registry.createProvider(
      'chutes',
      {
        provider: 'chutes',
        auth: {
          apiKey: process.env.CHUTES_API_KEY,
          baseUrl: process.env.CHUTES_BASE_URL || 'https://llm.chutes.ai/v1',
        },
        defaultModel: process.env.CHUTES_DEFAULT_MODEL || 'meta-llama/Llama-3.1-8B-Instruct',
      },
      true
    )
  }

  // Try DeepSeek
  if (process.env.DEEPSEEK_API_KEY) {
    return registry.createProvider(
      'deepseek',
      {
        provider: 'deepseek',
        auth: {
          apiKey: process.env.DEEPSEEK_API_KEY,
          baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
        },
        defaultModel: process.env.DEEPSEEK_DEFAULT_MODEL || 'deepseek-chat',
      },
      true
    )
  }

  // Try Groq
  if (process.env.GROQ_API_KEY) {
    return registry.createProvider(
      'groq',
      {
        provider: 'groq',
        auth: {
          apiKey: process.env.GROQ_API_KEY,
          baseUrl: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
        },
        defaultModel: process.env.GROQ_DEFAULT_MODEL || 'llama-3.3-70b-versatile',
      },
      true
    )
  }

  // Try Fireworks AI
  if (process.env.FIREWORKS_API_KEY) {
    return registry.createProvider(
      'fireworks',
      {
        provider: 'fireworks',
        auth: {
          apiKey: process.env.FIREWORKS_API_KEY,
          baseUrl: process.env.FIREWORKS_BASE_URL || 'https://api.fireworks.ai/inference/v1',
        },
        defaultModel:
          process.env.FIREWORKS_DEFAULT_MODEL ||
          'accounts/fireworks/models/llama-v3p3-70b-instruct',
      },
      true
    )
  }

  // Try crof.ai
  if (process.env.CROFAI_API_KEY) {
    return registry.createProvider(
      'crofai',
      {
        provider: 'crofai',
        auth: {
          apiKey: process.env.CROFAI_API_KEY,
          baseUrl: process.env.CROFAI_BASE_URL || 'https://crof.ai/v1',
        },
        defaultModel: process.env.CROFAI_DEFAULT_MODEL || 'default',
      },
      true
    )
  }

  return null
}
