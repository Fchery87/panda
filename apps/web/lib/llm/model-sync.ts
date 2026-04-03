import type { ProviderCatalogEntry } from './provider-catalog'
import type { AvailableModel } from '@/components/chat/ModelSelector'

export const MODEL_SYNC_TTL_MS = 1000 * 60 * 60 * 6

export interface ProviderModelConfig extends Record<string, unknown> {
  provider?: string
  enabled?: boolean
  apiKey?: string
  name?: string
  description?: string
  baseUrl?: string
  defaultModel?: string
  availableModels?: string[]
  useCodingPlan?: boolean
  reasoningEnabled?: boolean
  reasoningMode?: 'auto' | 'low' | 'medium' | 'high'
  reasoningBudget?: number
  showReasoningPanel?: boolean
  modelsLastSyncedAt?: number
  modelsSource?: 'catalog' | 'provider'
}

export function normalizeModelIds(modelIds: string[]): string[] {
  const seen = new Set<string>()
  const normalized: string[] = []

  for (const id of modelIds) {
    if (typeof id !== 'string') continue
    const trimmed = id.trim()
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)
    normalized.push(trimmed)
  }

  return normalized
}

function getPreferredDefaultModel(
  currentDefaultModel: string | undefined,
  availableModels: string[]
): string | undefined {
  if (currentDefaultModel && availableModels.includes(currentDefaultModel)) {
    return currentDefaultModel
  }

  return availableModels[0]
}

export function applyProviderModelSync<T extends ProviderModelConfig>(
  config: T,
  modelIds: string[],
  metadata: {
    syncedAt: number
    source: 'catalog' | 'provider'
  }
): T {
  const availableModels = normalizeModelIds(modelIds)
  if (availableModels.length === 0) return config

  return {
    ...config,
    availableModels,
    defaultModel: getPreferredDefaultModel(config.defaultModel, availableModels),
    modelsLastSyncedAt: metadata.syncedAt,
    modelsSource: metadata.source,
  }
}

export function hydrateProvidersWithCatalog<T extends ProviderModelConfig>(
  providers: Record<string, T>,
  catalog: ProviderCatalogEntry[],
  syncedAt: number
): Record<string, T> {
  const catalogById = new Map(catalog.map((entry) => [entry.id, entry]))
  let changed = false
  const nextProviders: Record<string, T> = {}

  for (const [providerKey, config] of Object.entries(providers)) {
    const catalogEntry = catalogById.get(providerKey)
    if (!catalogEntry) {
      nextProviders[providerKey] = config
      continue
    }

    const nextConfig = applyProviderModelSync(
      config,
      catalogEntry.models.map((model) => model.id),
      { syncedAt, source: 'catalog' }
    )

    if (
      nextConfig.availableModels !== config.availableModels ||
      nextConfig.defaultModel !== config.defaultModel ||
      nextConfig.modelsLastSyncedAt !== config.modelsLastSyncedAt ||
      nextConfig.modelsSource !== config.modelsSource
    ) {
      changed = true
    }

    nextProviders[providerKey] = nextConfig
  }

  return changed ? nextProviders : providers
}

export function shouldRefreshProviderModels(
  config: Pick<ProviderModelConfig, 'enabled' | 'apiKey' | 'modelsLastSyncedAt'>,
  now: number,
  ttlMs: number = MODEL_SYNC_TTL_MS
): boolean {
  if (!config.enabled) return false
  if (!config.apiKey || !config.apiKey.trim()) return false
  if (!config.modelsLastSyncedAt) return true
  return now - config.modelsLastSyncedAt >= ttlMs
}

export function buildAvailableModelsFromProviderConfigs(
  providerConfigs: Record<string, unknown> | undefined
): AvailableModel[] {
  if (!providerConfigs) return []

  const models: AvailableModel[] = []
  for (const [key, rawConfig] of Object.entries(providerConfigs)) {
    const config = rawConfig as ProviderModelConfig
    if (!config.enabled) continue
    const providerName = config.name || key
    for (const modelId of normalizeModelIds(config.availableModels ?? [])) {
      const withoutOrg = modelId.includes('/') ? modelId.split('/').slice(1).join('/') : modelId
      const displayName = withoutOrg.split(':')[0]
      models.push({ id: modelId, name: displayName, provider: providerName, providerKey: key })
    }
  }

  return models
}
