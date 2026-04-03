'use client'

import { useEffect, useMemo, useState } from 'react'
import { getProviderCatalog } from '@/lib/llm/provider-catalog'
import {
  applyProviderModelSync,
  hydrateProvidersWithCatalog,
  shouldRefreshProviderModels,
  type ProviderModelConfig,
} from '@/lib/llm/model-sync'

type ProviderConfigMap = Record<string, ProviderModelConfig>

async function fetchOpenAICompatibleModels(config: ProviderModelConfig): Promise<string[]> {
  if (!config.apiKey || !config.baseUrl) return []

  const response = await fetch('/api/providers/openai-compatible/refresh-models', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
    }),
  })

  if (!response.ok) return []

  const payload = await response.json()
  return (payload.data || payload || [])
    .map((model: { id?: string }) => model.id)
    .filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0)
}

async function fetchChutesModels(config: ProviderModelConfig): Promise<string[]> {
  if (!config.apiKey) return []

  const response = await fetch('/api/providers/chutes/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      mode: 'models',
    }),
  })

  if (!response.ok) return []

  const payload = await response.json()
  return (payload.models || []).filter(
    (id: unknown): id is string => typeof id === 'string' && id.trim().length > 0
  )
}

async function fetchProviderModels(
  providerKey: string,
  config: ProviderModelConfig
): Promise<string[]> {
  if (providerKey === 'anthropic') return []
  if (providerKey === 'chutes') return fetchChutesModels(config)
  if (config.baseUrl) return fetchOpenAICompatibleModels(config)
  return []
}

export function useFreshProviderConfigs(
  providerConfigs: Record<string, unknown> | undefined
): ProviderConfigMap {
  const sourceConfigs = useMemo(
    () => (providerConfigs ?? {}) as ProviderConfigMap,
    [providerConfigs]
  )
  const [freshConfigs, setFreshConfigs] = useState<ProviderConfigMap>(sourceConfigs)

  const configSignature = useMemo(() => JSON.stringify(sourceConfigs), [sourceConfigs])

  useEffect(() => {
    setFreshConfigs(sourceConfigs)
  }, [sourceConfigs])

  useEffect(() => {
    let cancelled = false

    const sync = async () => {
      const now = Date.now()

      const catalog = await getProviderCatalog()
      if (cancelled) return

      let nextConfigs = hydrateProvidersWithCatalog(sourceConfigs, catalog, now)
      if (!cancelled) {
        setFreshConfigs(nextConfigs)
      }

      const refreshableProviders = Object.entries(nextConfigs).filter(([, config]) =>
        shouldRefreshProviderModels(config, now)
      )

      for (const [providerKey, config] of refreshableProviders) {
        const modelIds = await fetchProviderModels(providerKey, config)
        if (cancelled) return
        if (modelIds.length === 0) continue

        nextConfigs = {
          ...nextConfigs,
          [providerKey]: applyProviderModelSync(nextConfigs[providerKey]!, modelIds, {
            syncedAt: Date.now(),
            source: 'provider',
          }),
        }

        if (!cancelled) {
          setFreshConfigs(nextConfigs)
        }
      }
    }

    void sync()

    return () => {
      cancelled = true
    }
  }, [configSignature, sourceConfigs])

  return freshConfigs
}
