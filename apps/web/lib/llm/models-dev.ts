/**
 * Models.dev Metadata Integration
 *
 * Fetches model metadata from models.dev to dynamically populate
 * available models across all supported providers.
 *
 * @see https://models.dev
 */

import { appLog } from '@/lib/logger'
import type { ModelInfo, ProviderType } from './types'

const MODELS_DEV_URL = 'https://models.dev/api/models.json'

export interface ModelsDevModel {
  id: string
  name: string
  context_length: number
  max_output_tokens?: number
  pricing?: {
    input: number
    output: number
    cache_read?: number
    cache_write?: number
  }
  capabilities?: string[]
  top_provider?: {
    max_completion_tokens?: number
    context_length?: number
  }
  tool_call?: boolean
  reasoning?: boolean
  structured_output?: boolean
  vision?: boolean
  attachment?: boolean
  temperature?: boolean
  knowledge?: string
  release_date?: string
  status?: 'alpha' | 'beta' | 'deprecated'
}

export interface ModelsDevProvider {
  provider_id: string
  provider_name: string
  base_url?: string
  env?: string[]
  npm?: string
  doc?: string
  models: Record<string, ModelsDevModel>
}

export interface ModelsDevResponse {
  [providerId: string]: ModelsDevProvider
}

const PROVIDER_ID_MAP: Record<string, ProviderType> = {
  openai: 'openai',
  anthropic: 'anthropic',
  openrouter: 'openrouter',
  together: 'together',
  deepseek: 'deepseek',
  groq: 'groq',
  fireworks: 'fireworks',
  chutes: 'chutes',
  zai: 'zai',
  zhipu: 'zai',
}

let cachedMetadata: ModelsDevResponse | null = null
let cacheTimestamp: number = 0
const CACHE_TTL = 1000 * 60 * 60 // 1 hour

export async function fetchModelsDevMetadata(): Promise<ModelsDevResponse> {
  const now = Date.now()

  if (cachedMetadata && now - cacheTimestamp < CACHE_TTL) {
    return cachedMetadata
  }

  try {
    const response = await fetch(MODELS_DEV_URL)
    if (!response.ok) {
      throw new Error(`Failed to fetch from models.dev: ${response.statusText}`)
    }

    cachedMetadata = await response.json()
    cacheTimestamp = now
    return cachedMetadata!
  } catch (error) {
    appLog.error('Error fetching models.dev metadata:', error)
    return cachedMetadata || {}
  }
}

export function mapModelsDevToModelInfo(providerId: string, data: ModelsDevResponse): ModelInfo[] {
  const provider = data[providerId]
  if (!provider || !provider.models) return []

  const pandaProviderId = PROVIDER_ID_MAP[providerId] || (providerId as ProviderType)

  return Object.values(provider.models).map((model) => {
    const capabilities = parseCapabilities(model.capabilities || [])

    return {
      id: model.id,
      name: model.name || model.id,
      provider: pandaProviderId,
      description: `${model.name || model.id} via ${provider.provider_name}`,
      maxTokens: model.max_output_tokens || model.top_provider?.max_completion_tokens || 4096,
      contextWindow: model.context_length || model.top_provider?.context_length || 8192,
      capabilities: {
        streaming: true,
        functionCalling: capabilities.functionCalling,
        vision: capabilities.vision,
        jsonMode: true,
        toolUse: capabilities.toolUse,
        supportsReasoning: capabilities.supportsReasoning,
      },
      pricing: model.pricing
        ? {
            inputPerToken: model.pricing.input,
            outputPerToken: model.pricing.output,
          }
        : undefined,
    }
  })
}

function parseCapabilities(capabilities: string[]): {
  functionCalling: boolean
  vision: boolean
  toolUse: boolean
  supportsReasoning: boolean
} {
  const result = {
    functionCalling: false,
    vision: false,
    toolUse: false,
    supportsReasoning: false,
  }

  for (const cap of capabilities) {
    const normalized = cap.toLowerCase().replace(/[-\s]/g, '_')
    if (normalized === 'tools' || normalized === 'function_calling') {
      result.functionCalling = true
      result.toolUse = true
    }
    if (normalized === 'tool_use') {
      result.toolUse = true
    }
    if (normalized === 'vision') {
      result.vision = true
    }
    if (normalized === 'reasoning') {
      result.supportsReasoning = true
    }
  }

  return result
}

export function getProviderBaseUrl(
  providerId: string,
  data: ModelsDevResponse
): string | undefined {
  const provider = data[providerId]
  return provider?.base_url
}

export function getSupportedProviders(data: ModelsDevResponse): string[] {
  return Object.keys(data).filter((id) => PROVIDER_ID_MAP[id] || id)
}

export function clearModelsDevCache(): void {
  cachedMetadata = null
  cacheTimestamp = 0
}

export async function getAllModels(data: ModelsDevResponse): Promise<
  {
    providerId: string
    models: ModelInfo[]
  }[]
> {
  const results: { providerId: string; models: ModelInfo[] }[] = []

  for (const providerId of Object.keys(data)) {
    const models = mapModelsDevToModelInfo(providerId, data)
    if (models.length > 0) {
      results.push({ providerId, models })
    }
  }

  return results
}
