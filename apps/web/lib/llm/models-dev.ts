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

export interface ModelsDevModel {
  id: string
  name: string
  family?: string
  attachment?: boolean
  reasoning?: boolean
  tool_call?: boolean
  release_date?: string
  last_updated?: string
  modalities?: {
    input?: string[]
    output?: string[]
  }
  open_weights?: boolean
  cost?: {
    input?: number
    output?: number
    cache_read?: number
    cache_write?: number
  }
  limit?: {
    context?: number
    output?: number
  }
  context_length?: number
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
  structured_output?: boolean
  vision?: boolean
  temperature?: boolean
  knowledge?: string
  status?: 'alpha' | 'beta' | 'deprecated'
}

export interface ModelsDevProvider {
  id: string
  name: string
  api?: string
  base_url?: string
  env?: string[]
  npm?: string
  doc?: string
  models: Record<string, ModelsDevModel>
  // Legacy field support
  provider_id?: string
  provider_name?: string
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
    const response = await fetch('/api/providers/catalog')
    if (!response.ok) {
      throw new Error(`Failed to fetch provider catalog: ${response.statusText}`)
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
  const providerName = provider.name || provider.provider_name || providerId

  return Object.values(provider.models).map((model) => {
    // Support both new API format (cost, limit) and old format (pricing, context_length)
    const contextWindow =
      model.limit?.context || model.context_length || model.top_provider?.context_length || 8192
    const maxTokens =
      model.limit?.output ||
      model.max_output_tokens ||
      model.top_provider?.max_completion_tokens ||
      4096
    const inputCost = model.cost?.input || model.pricing?.input
    const outputCost = model.cost?.output || model.pricing?.output

    // Determine capabilities from boolean flags or capabilities array
    const hasToolCall = model.tool_call || false
    const hasReasoning = model.reasoning || false
    const hasVision = model.vision || model.modalities?.input?.includes('image') || false
    const capabilities = parseCapabilities(model.capabilities || [])

    return {
      id: model.id,
      name: model.name || model.id,
      provider: pandaProviderId,
      description: `${model.name || model.id} via ${providerName}`,
      maxTokens,
      contextWindow,
      capabilities: {
        streaming: true,
        functionCalling: hasToolCall || capabilities.functionCalling,
        vision: hasVision || capabilities.vision,
        jsonMode: true,
        toolUse: hasToolCall || capabilities.toolUse,
        supportsReasoning: hasReasoning || capabilities.supportsReasoning,
      },
      pricing:
        inputCost !== undefined
          ? {
              inputPerToken: inputCost,
              outputPerToken: outputCost || 0,
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
  return provider?.api || provider?.base_url
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
