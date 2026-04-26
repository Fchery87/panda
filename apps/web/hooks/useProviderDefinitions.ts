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
 * Returns a dynamic provider+model list fetched from models.dev via
 * getProviderCatalog(). Falls back to the static SHARED_PROVIDER_DEFINITIONS
 * while the catalog is loading or on error.
 */
export function useProviderDefinitions(): ProviderDefinition[] {
  const [definitions, setDefinitions] = useState<ProviderDefinition[]>(getSharedProviderDefinitions)

  useEffect(() => {
    let cancelled = false

    const sync = async () => {
      try {
        const catalog = await getProviderCatalog()
        if (cancelled || catalog.length === 0) return
        setDefinitions(catalogToDefinitions(catalog))
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
