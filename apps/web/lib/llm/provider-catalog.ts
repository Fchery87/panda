/**
 * Provider Catalog — dynamic provider registry powered by models.dev
 *
 * Merges models.dev data with Panda's known provider implementations
 * to offer a browsable catalog of 130+ LLM providers.
 */

import type { ModelInfo, ProviderType, KnownProviderType } from './types'
import { isKnownProvider } from './types'
import {
  fetchModelsDevMetadata,
  mapModelsDevToModelInfo,
  type ModelsDevProvider,
  type ModelsDevResponse,
} from './models-dev'
import { appLog } from '@/lib/logger'

/**
 * A catalog entry for a single provider, combining models.dev metadata
 * with Panda-specific flags.
 */
export interface ProviderCatalogEntry {
  /** models.dev provider ID (e.g., "mistral", "openai") */
  id: string
  /** Human-readable name (e.g., "Mistral AI") */
  name: string
  /** Short description */
  description: string
  /** API base URL from models.dev */
  baseUrl?: string
  /** Expected environment variable names for API keys */
  envVars?: string[]
  /** Documentation URL */
  docUrl?: string
  /** AI SDK npm package identifier */
  npmPackage?: string
  /** Provider logo URL */
  logoUrl: string
  /** Pre-mapped model list from models.dev */
  models: ModelInfo[]
  /** Default model ID (first model in list) */
  defaultModel?: string
  /** Whether this provider has a specialized Panda implementation */
  hasSpecialImplementation: boolean
  /** The Panda provider type to use for instantiation */
  providerType: ProviderType
}

/**
 * Map of known providers that have specialized implementations in Panda.
 * These use their dedicated provider classes instead of OpenAICompatibleProvider.
 */
const SPECIAL_PROVIDER_IDS: Set<KnownProviderType> = new Set([
  'openai',
  'openrouter',
  'together',
  'anthropic',
  'zai',
  'chutes',
  'deepseek',
  'groq',
  'fireworks',
])

/**
 * Map models.dev provider IDs to Panda known provider IDs where they differ.
 */
const PROVIDER_ID_ALIASES: Record<string, KnownProviderType> = {
  zhipu: 'zai',
  'zhipu-ai': 'zai',
  'together-ai': 'together',
  'fireworks-ai': 'fireworks',
}

/** In-memory catalog cache */
let catalogCache: ProviderCatalogEntry[] | null = null
let catalogCacheTimestamp = 0
const CATALOG_CACHE_TTL = 1000 * 60 * 60 // 1 hour

/**
 * Build the full provider catalog from models.dev data.
 * Results are cached for 1 hour.
 */
export async function getProviderCatalog(): Promise<ProviderCatalogEntry[]> {
  const now = Date.now()
  if (catalogCache && now - catalogCacheTimestamp < CATALOG_CACHE_TTL) {
    return catalogCache
  }

  try {
    const data = await fetchModelsDevMetadata()
    catalogCache = buildCatalogFromResponse(data)
    catalogCacheTimestamp = now
    return catalogCache
  } catch (error) {
    appLog.error('Failed to build provider catalog:', error)
    return catalogCache || []
  }
}

/**
 * Build catalog entries from a models.dev API response.
 */
export function buildCatalogFromResponse(data: ModelsDevResponse): ProviderCatalogEntry[] {
  const entries: ProviderCatalogEntry[] = []

  for (const [rawId, providerData] of Object.entries(data)) {
    if (!providerData || !providerData.models) continue

    const resolvedId = PROVIDER_ID_ALIASES[rawId] || rawId
    const isSpecial = isKnownProvider(resolvedId) && SPECIAL_PROVIDER_IDS.has(resolvedId)
    const models = mapModelsDevToModelInfo(rawId, data)

    if (models.length === 0) continue

    const providerName = providerData.name || providerData.provider_name || rawId
    const baseUrl = providerData.api || providerData.base_url

    const entry: ProviderCatalogEntry = {
      id: resolvedId,
      name: providerName,
      description: `${providerName} — ${models.length} model${models.length !== 1 ? 's' : ''} available`,
      baseUrl,
      envVars: providerData.env,
      docUrl: providerData.doc,
      npmPackage: providerData.npm,
      logoUrl: `https://models.dev/logos/${rawId}.svg`,
      models,
      defaultModel: models[0]?.id,
      hasSpecialImplementation: isSpecial,
      providerType: resolvedId,
    }

    entries.push(entry)
  }

  entries.sort((a, b) => {
    if (a.hasSpecialImplementation && !b.hasSpecialImplementation) return -1
    if (!a.hasSpecialImplementation && b.hasSpecialImplementation) return 1
    return a.name.localeCompare(b.name)
  })

  return entries
}

/**
 * Search the catalog by name or ID.
 */
export function searchCatalog(
  catalog: ProviderCatalogEntry[],
  query: string
): ProviderCatalogEntry[] {
  if (!query.trim()) return catalog
  const q = query.toLowerCase().trim()
  return catalog.filter(
    (entry) => entry.id.toLowerCase().includes(q) || entry.name.toLowerCase().includes(q)
  )
}

/**
 * Get a single catalog entry by provider ID.
 */
export function getCatalogEntry(
  catalog: ProviderCatalogEntry[],
  providerId: string
): ProviderCatalogEntry | undefined {
  const resolved = PROVIDER_ID_ALIASES[providerId] || providerId
  return catalog.find((e) => e.id === resolved)
}

/**
 * Clear the catalog cache (useful for testing or forced refresh).
 */
export function clearCatalogCache(): void {
  catalogCache = null
  catalogCacheTimestamp = 0
}
