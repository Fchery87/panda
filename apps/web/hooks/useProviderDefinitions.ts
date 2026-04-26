'use client'

import { useEffect, useState } from 'react'
import { getProviderCatalog, type ProviderCatalogEntry } from '@/lib/llm/provider-catalog'
import {
  buildProviderDefinitionsFromConfigs,
  getSharedProviderDefinitions,
  type ProviderDefinitionConfig,
  type ProviderDefinition,
} from '@/lib/llm/provider-definitions'

/**
 * Maps ProviderCatalogEntry[] (from models.dev) to the ProviderDefinition[]
 * shape expected by admin UI dropdowns.
 */
function catalogToDefinitions(catalog: ProviderCatalogEntry[]): ProviderDefinition[] {
  return catalog.map((entry) => ({
    value: entry.id,
    label: entry.name,
    models: entry.models.map((m) => m.id),
  }))
}

/**
 * Merge dynamic catalog definitions with static SHARED_PROVIDER_DEFINITIONS.
 * Catalog entries win when both exist for the same provider ID, but static
 * entries that aren't in the catalog (e.g. crof.ai) are preserved.
 */
function mergeDefinitions(
  catalogDefs: ProviderDefinition[],
  staticDefs: ProviderDefinition[]
): ProviderDefinition[] {
  const catalogIds = new Set(catalogDefs.map((d) => d.value))
  const missingFromCatalog = staticDefs.filter((s) => !catalogIds.has(s.value))
  return [...catalogDefs, ...missingFromCatalog]
}

/**
 * Returns a dynamic provider+model list fetched from models.dev via
 * getProviderCatalog(), merged with static SHARED_PROVIDER_DEFINITIONS
 * to ensure Panda-specific providers (crof.ai, etc.) are always included.
 * Falls back to static definitions while loading or on error.
 */
export function useProviderDefinitions(
  providerConfigs?: Record<string, ProviderDefinitionConfig>
): ProviderDefinition[] {
  const [definitions, setDefinitions] = useState<ProviderDefinition[]>(getSharedProviderDefinitions)

  useEffect(() => {
    let cancelled = false

    const sync = async () => {
      try {
        const [catalog, knownModels] = await Promise.all([
          getProviderCatalog(),
          fetch('/api/providers/known-models')
            .then((res) => (res.ok ? (res.json() as Promise<Record<string, string[]>>) : {}))
            .catch(() => ({}) as Record<string, string[]>),
        ])

        if (cancelled) return

        let merged = getSharedProviderDefinitions()

        if (catalog.length > 0) {
          const catalogDefs = catalogToDefinitions(catalog)
          merged = mergeDefinitions(catalogDefs, merged)
        }

        // Apply fresh models for known providers if available
        const modelsMap = knownModels as Record<string, string[]>
        if (Object.keys(modelsMap).length > 0) {
          merged = merged.map((def) => {
            if (modelsMap[def.value]) {
              return {
                ...def,
                models: Array.from(new Set([...modelsMap[def.value], ...def.models])),
              }
            }
            return def
          })
        }

        setDefinitions(buildProviderDefinitionsFromConfigs(merged, providerConfigs))
      } catch {
        // Keep static fallback on error
      }
    }

    void sync()
    return () => {
      cancelled = true
    }
  }, [providerConfigs])

  return buildProviderDefinitionsFromConfigs(definitions, providerConfigs)
}
