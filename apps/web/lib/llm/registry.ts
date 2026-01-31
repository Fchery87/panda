/**
 * Provider Registry
 * 
 * Manages LLM provider instances and handles provider selection.
 * Supports multiple providers with different configurations.
 */

import type { LLMProvider, ProviderConfig, ModelInfo, ProviderType } from './types';
import { OpenAICompatibleProvider } from './providers/openai-compatible';

/**
 * Registry entry for a provider instance
 */
interface ProviderEntry {
  id: string;
  provider: LLMProvider;
  config: ProviderConfig;
  createdAt: number;
}

/**
 * Provider Registry - manages LLM provider instances
 */
export class ProviderRegistry {
  private providers: Map<string, ProviderEntry> = new Map();
  private defaultProviderId: string | null = null;

  /**
   * Create a new provider instance
   * @param id - Unique identifier for this provider instance
   * @param config - Provider configuration
   * @param setAsDefault - Whether to set as default provider
   */
  createProvider(id: string, config: ProviderConfig, setAsDefault = false): LLMProvider {
    let provider: LLMProvider;

    // Create appropriate provider based on type
    switch (config.provider) {
      case 'openai':
      case 'openrouter':
      case 'together':
      case 'custom':
        provider = new OpenAICompatibleProvider(config);
        break;
      default:
        throw new Error(`Unsupported provider type: ${config.provider}`);
    }

    // Store provider instance
    this.providers.set(id, {
      id,
      provider,
      config,
      createdAt: Date.now(),
    });

    // Set as default if requested
    if (setAsDefault) {
      this.defaultProviderId = id;
    }

    return provider;
  }

  /**
   * Get a provider by ID
   * @param id - Provider instance ID
   */
  getProvider(id: string): LLMProvider | undefined {
    const entry = this.providers.get(id);
    return entry?.provider;
  }

  /**
   * Get the default provider
   */
  getDefaultProvider(): LLMProvider | undefined {
    if (!this.defaultProviderId) {
      // Return first provider if no default set
      const first = this.providers.values().next().value;
      return first?.provider;
    }
    return this.getProvider(this.defaultProviderId);
  }

  /**
   * Set the default provider
   */
  setDefaultProvider(id: string): void {
    if (!this.providers.has(id)) {
      throw new Error(`Provider '${id}' not found`);
    }
    this.defaultProviderId = id;
  }

  /**
   * Remove a provider
   */
  removeProvider(id: string): boolean {
    if (this.defaultProviderId === id) {
      this.defaultProviderId = null;
    }
    return this.providers.delete(id);
  }

  /**
   * List all registered providers
   */
  listProviders(): { id: string; type: ProviderType; createdAt: number }[] {
    return Array.from(this.providers.values()).map((entry) => ({
      id: entry.id,
      type: entry.config.provider,
      createdAt: entry.createdAt,
    }));
  }

  /**
   * Get provider configuration
   */
  getProviderConfig(id: string): ProviderConfig | undefined {
    const entry = this.providers.get(id);
    return entry?.config;
  }

  /**
   * Update provider configuration
   */
  updateProviderConfig(id: string, config: Partial<ProviderConfig>): boolean {
    const entry = this.providers.get(id);
    if (!entry) return false;

    // Create new provider with updated config
    const newConfig = { ...entry.config, ...config };
    
    // Recreate provider with new config
    this.createProvider(id, newConfig, this.defaultProviderId === id);
    return true;
  }

  /**
   * Fetch all models from all providers
   */
  async listAllModels(): Promise<(ModelInfo & { providerId: string })[]> {
    const allModels: (ModelInfo & { providerId: string })[] = [];

    for (const [id, entry] of this.providers) {
      try {
        const models = await entry.provider.listModels();
        allModels.push(...models.map((m) => ({ ...m, providerId: id })));
      } catch (error) {
        console.error(`Failed to list models for provider '${id}':`, error);
      }
    }

    return allModels;
  }

  /**
   * Clear all providers
   */
  clear(): void {
    this.providers.clear();
    this.defaultProviderId = null;
  }
}

/**
 * Singleton instance for global use
 */
let globalRegistry: ProviderRegistry | null = null;

/**
 * Get or create global provider registry
 */
export function getGlobalRegistry(): ProviderRegistry {
  if (!globalRegistry) {
    globalRegistry = new ProviderRegistry();
  }
  return globalRegistry;
}

/**
 * Reset global registry (useful for testing)
 */
export function resetGlobalRegistry(): void {
  globalRegistry = null;
}

/**
 * Helper to create a provider from environment variables
 */
export function createProviderFromEnv(): LLMProvider | null {
  const registry = getGlobalRegistry();
  
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
    );
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
    );
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
    );
  }

  return null;
}
