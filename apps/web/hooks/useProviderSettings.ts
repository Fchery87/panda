'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import type { LLMProvider, ModelInfo, ReasoningOptions } from '../lib/llm/types'
import { getDefaultProviderCapabilities, type ProviderType } from '../lib/llm/types'
import { resolveContextWindow, type ContextWindowResult } from '../lib/llm/model-metadata'

interface ReasoningProviderConfig {
  showReasoningPanel?: boolean
  reasoningEnabled?: boolean
  reasoningBudget?: number
  reasoningMode?: 'auto' | 'low' | 'medium' | 'high'
}

export interface ProviderSettingsResult {
  providerModels: ModelInfo[]
  contextWindowResolution: ContextWindowResult
  getReasoningRuntimeSettings: () => {
    showReasoningPanel: boolean
    reasoning?: ReasoningOptions
  }
}

function resolveReasoningProviderConfig(args: {
  provider: LLMProvider | null
  settings: Record<string, unknown> | undefined
}): {
  providerType: ProviderType
  capabilities: ReturnType<typeof getDefaultProviderCapabilities>
  providerConfig: ReasoningProviderConfig
} {
  const providerType = (args.provider?.config?.provider || 'openai') as ProviderType
  const capabilities =
    args.provider?.config?.capabilities ?? getDefaultProviderCapabilities(providerType)

  const providerKey = (args.settings?.defaultProvider as string) || providerType
  const providerConfigs = args.settings?.providerConfigs as Record<string, unknown> | undefined

  return {
    providerType,
    capabilities,
    providerConfig: (providerConfigs?.[providerKey] ?? {}) as ReasoningProviderConfig,
  }
}

export function resolveReasoningRuntimeSettings(args: {
  provider: LLMProvider | null
  settings: Record<string, unknown> | undefined
}): {
  showReasoningPanel: boolean
  reasoning?: ReasoningOptions
} {
  const { capabilities, providerConfig } = resolveReasoningProviderConfig(args)

  const showReasoningPanel = providerConfig.showReasoningPanel !== false
  const reasoningEnabled = Boolean(providerConfig.reasoningEnabled)
  const reasoningBudget = Number(providerConfig.reasoningBudget ?? 6000)
  const reasoningMode = String(providerConfig.reasoningMode ?? 'auto')

  let reasoning: ReasoningOptions | undefined
  if (capabilities.supportsReasoning && reasoningEnabled) {
    reasoning = {
      enabled: true,
      ...(Number.isFinite(reasoningBudget) && reasoningBudget > 0
        ? { budgetTokens: reasoningBudget }
        : {}),
    }
    if (reasoningMode === 'low' || reasoningMode === 'medium' || reasoningMode === 'high') {
      reasoning.effort = reasoningMode
    }
  }

  return {
    showReasoningPanel,
    reasoning,
  }
}

export function useProviderSettings(
  provider: LLMProvider | null,
  model: string,
  settings: Record<string, unknown> | undefined
): ProviderSettingsResult {
  const [providerModels, setProviderModels] = useState<ModelInfo[]>([])

  const getReasoningRuntimeSettings = useCallback(
    () => resolveReasoningRuntimeSettings({ provider, settings }),
    [provider, settings]
  )

  useEffect(() => {
    let cancelled = false

    const loadProviderModels = async () => {
      if (!provider || typeof provider.listModels !== 'function') {
        setProviderModels([])
        return
      }
      try {
        const models = await provider.listModels()
        if (!cancelled) {
          setProviderModels(Array.isArray(models) ? models : [])
        }
      } catch (error) {
        void error
        if (!cancelled) {
          setProviderModels([])
        }
      }
    }

    void loadProviderModels()

    return () => {
      cancelled = true
    }
  }, [provider])

  const providerType = (provider?.config?.provider || 'openai') as ProviderType
  const contextWindowResolution = useMemo(
    () => resolveContextWindow({ providerType, model, providerModels }),
    [providerType, model, providerModels]
  )

  return { providerModels, contextWindowResolution, getReasoningRuntimeSettings }
}
