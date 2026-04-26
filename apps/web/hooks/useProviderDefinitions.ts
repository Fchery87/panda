'use client'

import { useEffect, useState } from 'react'
import { getProviderCatalog, type ProviderCatalogEntry } from '@/lib/llm/provider-catalog'
import {
  getSharedProviderDefinitions,
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
export function useProviderDefinitions(): ProviderDefinition[] {
  const [definitions, setDefinitions] = useState<ProviderDefinition[]>(getSharedProviderDefinitions)

  useEffect(() => {
    let cancelled = false

    const sync = async () => {
      try {
        const catalog = await getProviderCatalog()
        if (cancelled || catalog.length === 0) return
        const catalogDefs = catalogToDefinitions(catalog)
        const merged = mergeDefinitions(catalogDefs, getSharedProviderDefinitions())
        setDefinitions(merged)
      } catch {
        // Keep static fallback on error
      }
    }

    void sync()
    return () => {
      cancelled = true
    }
  }, [])

  return definitions
}
