'use client'

import * as React from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { toast } from 'sonner'
import { appLog } from '@/lib/logger'
import { getDefaultPolicyForMode, type AgentPolicy } from '@/lib/agent/automationPolicy'
import { extractOpenRouterFreeCodingModelIds } from '@/lib/llm/openrouter-free-models'
import type { ProviderCatalogEntry } from '@/lib/llm/provider-catalog'
import { normalizeModelIds } from '@/lib/llm/model-sync'
import { useFreshProviderConfigs } from '@/hooks/useFreshProviderConfigs'
import {
  buildSettingsTabHref,
  createSettingsSignature,
  getSettingsTabFromSearchParams,
  type SettingsSnapshotInput,
  type SettingsTab,
} from '@/lib/settings-navigation'

export interface ProviderConfig {
  provider?: string
  name: string
  description: string
  apiKey: string
  enabled: boolean
  defaultModel: string
  availableModels: string[]
  baseUrl?: string
  useCodingPlan?: boolean
  reasoningEnabled?: boolean
  reasoningMode?: 'auto' | 'low' | 'medium' | 'high'
  reasoningBudget?: number
  showReasoningPanel?: boolean
  testStatus?: 'idle' | 'testing' | 'success' | 'error'
  testCompletionStatus?: 'idle' | 'testing' | 'success' | 'error'
  testStatusMessage?: string
  testCompletionStatusMessage?: string
}

export interface SettingsState {
  theme: 'light' | 'dark' | 'system'
  language: string
  defaultProvider: string
  defaultModel: string
  providers: Record<string, ProviderConfig>
  overrideGlobalProvider: boolean
  overrideGlobalModel: boolean
}

export type SettingsQueryRecord = {
  theme: 'light' | 'dark' | 'system'
  language?: string | null
  defaultProvider?: string | null
  defaultModel?: string | null
  providerConfigs?: Record<string, unknown> | null
  overrideGlobalProvider?: boolean | null
  overrideGlobalModel?: boolean | null
  agentDefaults?: AgentPolicy | null
  updatedAt: number
}

type StoredProviderConfig = Partial<ProviderConfig> & Record<string, unknown>

export const defaultProviders: Record<string, ProviderConfig> = {
  openai: {
    provider: 'openai',
    name: 'OpenAI',
    description: 'Official OpenAI API for GPT models',
    apiKey: '',
    enabled: false,
    defaultModel: 'gpt-4o-mini',
    availableModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    baseUrl: 'https://api.openai.com/v1',
    testStatus: 'idle',
  },
  openrouter: {
    provider: 'openrouter',
    name: 'OpenRouter',
    description: 'Access multiple AI models through a single API',
    apiKey: '',
    enabled: false,
    defaultModel: 'qwen/qwen3-coder:free',
    availableModels: [
      'qwen/qwen3-coder:free',
      'moonshotai/kimi-dev-72b:free',
      'deepseek/deepseek-coder:free',
    ],
    baseUrl: 'https://openrouter.ai/api/v1',
    testStatus: 'idle',
  },
  together: {
    provider: 'together',
    name: 'Together.ai',
    description: 'Fast inference for open-source models',
    apiKey: '',
    enabled: false,
    defaultModel: 'meta-llama/Llama-3.1-70B-Instruct-Turbo',
    availableModels: [
      'meta-llama/Llama-3.1-70B-Instruct-Turbo',
      'meta-llama/Llama-3.1-8B-Instruct-Turbo',
      'mistralai/Mixtral-8x22B-Instruct-v0.1',
      'Qwen/Qwen2.5-72B-Instruct-Turbo',
    ],
    baseUrl: 'https://api.together.xyz/v1',
    testStatus: 'idle',
  },
  anthropic: {
    provider: 'anthropic',
    name: 'Anthropic',
    description: 'Native Anthropic Claude API',
    apiKey: '',
    enabled: false,
    defaultModel: 'claude-sonnet-4-5',
    availableModels: ['claude-opus-4-6', 'claude-sonnet-4-5'],
    baseUrl: 'https://api.anthropic.com/v1',
    reasoningEnabled: true,
    reasoningMode: 'auto',
    reasoningBudget: 6000,
    showReasoningPanel: true,
    testStatus: 'idle',
  },
  zai: {
    provider: 'zai',
    name: 'Z.ai',
    description: 'Z.ai GLM-4.7 series models for coding (supports API key or Coding Plan)',
    apiKey: '',
    enabled: false,
    defaultModel: 'glm-4.7',
    availableModels: ['glm-4.7', 'glm-4.7-flashx', 'glm-4.7-flash'],
    baseUrl: 'https://api.z.ai/api/paas/v4',
    useCodingPlan: false,
    reasoningEnabled: true,
    reasoningMode: 'auto',
    reasoningBudget: 6000,
    showReasoningPanel: true,
    testStatus: 'idle',
  },
  chutes: {
    provider: 'chutes',
    name: 'Chutes.ai',
    description: 'Decentralized AI platform with access to Llama, DeepSeek, Qwen models',
    apiKey: '',
    enabled: false,
    defaultModel: 'deepseek-ai/DeepSeek-V3',
    availableModels: [
      'deepseek-ai/DeepSeek-V3',
      'meta-llama/Llama-3.1-70B-Instruct',
      'meta-llama/Llama-3.1-8B-Instruct',
      'meta-llama/Llama-3.2-11B-Vision-Instruct',
      'Qwen/Qwen2.5-72B-Instruct',
    ],
    baseUrl: 'https://llm.chutes.ai/v1',
    testStatus: 'idle',
  },
  deepseek: {
    provider: 'deepseek',
    name: 'DeepSeek',
    description: 'DeepSeek AI models with advanced reasoning capabilities',
    apiKey: '',
    enabled: false,
    defaultModel: 'deepseek-chat',
    availableModels: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'],
    baseUrl: 'https://api.deepseek.com/v1',
    reasoningEnabled: true,
    reasoningMode: 'auto',
    reasoningBudget: 6000,
    showReasoningPanel: true,
    testStatus: 'idle',
  },
  groq: {
    provider: 'groq',
    name: 'Groq',
    description: 'Ultra-fast LLM inference with LPU technology',
    apiKey: '',
    enabled: false,
    defaultModel: 'llama-3.3-70b-versatile',
    availableModels: [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'mixtral-8x7b-32768',
      'gemma2-9b-it',
    ],
    baseUrl: 'https://api.groq.com/openai/v1',
    testStatus: 'idle',
  },
  fireworks: {
    provider: 'fireworks',
    name: 'Fireworks AI',
    description: 'Fast inference serverless platform with fine-tuning support',
    apiKey: '',
    enabled: false,
    defaultModel: 'accounts/fireworks/models/llama-v3p1-70b-instruct',
    availableModels: [
      'accounts/fireworks/models/llama-v3p1-70b-instruct',
      'accounts/fireworks/models/llama-v3p1-8b-instruct',
      'accounts/fireworks/models/qwen2p5-72b-instruct',
      'accounts/fireworks/models/deepseek-v3',
    ],
    baseUrl: 'https://api.fireworks.ai/inference/v1',
    testStatus: 'idle',
  },
  crofai: {
    provider: 'crofai',
    name: 'crof.ai',
    description: 'OpenAI-compatible inference endpoint with mixed open and frontier models',
    apiKey: '',
    enabled: false,
    defaultModel: 'kimi-k2.5',
    availableModels: [
      'kimi-k2.5',
      'kimi-k2.5-lightning',
      'glm-5.1',
      'glm-5.1-precision',
      'glm-5',
      'glm-4.7',
      'glm-4.7-flash',
      'gemma-4-31b-it',
      'minimax-m2.5',
      'qwen3.5-397b-a17b',
      'qwen3.5-9b',
      'deepseek-v3.2',
    ],
    baseUrl: 'https://crof.ai/v1',
    reasoningEnabled: true,
    reasoningMode: 'auto',
    reasoningBudget: 6000,
    showReasoningPanel: true,
    testStatus: 'idle',
  },
}

export const languages = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
]

function buildSettingsStateFromQuery(latestSettings: SettingsQueryRecord | null): {
  agentDefaults: AgentPolicy
  formState: SettingsState
} {
  if (latestSettings === null) {
    return {
      agentDefaults: getDefaultPolicyForMode('code'),
      formState: {
        theme: 'system',
        language: 'en',
        defaultProvider: 'openai',
        defaultModel: 'gpt-4o-mini',
        providers: defaultProviders,
        overrideGlobalProvider: false,
        overrideGlobalModel: false,
      },
    }
  }

  return {
    agentDefaults: latestSettings.agentDefaults ?? getDefaultPolicyForMode('code'),
    formState: {
      theme: latestSettings.theme,
      language: latestSettings.language || 'en',
      defaultProvider: latestSettings.defaultProvider || 'openai',
      defaultModel: latestSettings.defaultModel || 'gpt-4o-mini',
      providers: latestSettings.providerConfigs
        ? {
            ...defaultProviders,
            ...Object.fromEntries(
              Object.entries(latestSettings.providerConfigs).map(([key, config]) => {
                const base = defaultProviders[key] ?? {
                  provider: key,
                  name: (config as StoredProviderConfig).name || key,
                  description: (config as StoredProviderConfig).description || '',
                  apiKey: '',
                  enabled: false,
                  defaultModel: '',
                  availableModels: [],
                  testStatus: 'idle' as const,
                }
                const mergedConfig = {
                  ...base,
                  ...(config as StoredProviderConfig),
                  testStatus: 'idle' as const,
                }
                return [key, mergedConfig]
              })
            ),
          }
        : defaultProviders,
      overrideGlobalProvider: latestSettings.overrideGlobalProvider ?? false,
      overrideGlobalModel: latestSettings.overrideGlobalModel ?? false,
    },
  }
}

function buildSettingsSignatureInput(
  formState: SettingsState,
  agentDefaults: AgentPolicy
): SettingsSnapshotInput {
  return {
    theme: formState.theme,
    language: formState.language,
    defaultProvider: formState.defaultProvider,
    defaultModel: formState.defaultModel,
    providers: Object.fromEntries(
      Object.entries(formState.providers).map(([key, provider]) => [
        key,
        {
          apiKey: provider.apiKey,
          enabled: provider.enabled,
          defaultModel: provider.defaultModel,
          baseUrl: provider.baseUrl,
          useCodingPlan: provider.useCodingPlan,
          reasoningEnabled: provider.reasoningEnabled,
          reasoningMode: provider.reasoningMode,
          reasoningBudget: provider.reasoningBudget,
          showReasoningPanel: provider.showReasoningPanel,
        },
      ])
    ),
    overrideGlobalProvider: formState.overrideGlobalProvider,
    overrideGlobalModel: formState.overrideGlobalModel,
    agentDefaults,
  }
}

export interface UseSettingsFormReturn {
  formState: SettingsState
  agentDefaults: AgentPolicy
  setAgentDefaults: React.Dispatch<React.SetStateAction<AgentPolicy>>
  freshProviders: Record<string, ProviderConfig>
  isDirty: boolean
  isSaving: boolean
  activeTab: SettingsTab
  setActiveTab: (tab: SettingsTab) => void
  settings: SettingsQueryRecord | null | undefined
  adminDefaults:
    | {
        globalDefaultProvider?: string | null
        globalDefaultModel?: string | null
        allowUserOverrides?: boolean
        allowUserMCP?: boolean
        allowUserSubagents?: boolean
        allowUserSkills?: boolean
      }
    | undefined
  catalogModalOpen: boolean
  setCatalogModalOpen: React.Dispatch<React.SetStateAction<boolean>>
  refreshingModels: string | null
  updateProvider: (providerKey: string, updates: Partial<ProviderConfig>) => void
  addProviderFromCatalog: (entry: ProviderCatalogEntry) => void
  removeProvider: (providerKey: string) => void
  refreshModelsFromApi: (providerKey: string) => Promise<void>
  testProvider: (providerKey: string) => Promise<void>
  testProviderCompletion: (providerKey: string) => Promise<void>
  handleSave: () => Promise<void>
  handleDiscard: () => void
  updateFormState: (updates: Partial<SettingsState>) => void
}

export function useSettingsForm(
  pathname: string,
  searchParams: URLSearchParams,
  router: { replace: (href: string, options?: { scroll?: boolean }) => void }
): UseSettingsFormReturn {
  const settings = useQuery(api.settings.get) as SettingsQueryRecord | null | undefined
  const adminDefaults = useQuery(api.settings.getAdminDefaults)
  const updateSettings = useMutation(api.settings.update)
  const [isSaving, setIsSaving] = React.useState(false)
  const initialSettingsSignatureRef = React.useRef<string | null>(null)

  const settingsSyncKey =
    settings === undefined ? 'loading' : settings === null ? 'missing' : String(settings.updatedAt)

  const settingsRef = React.useRef(settings)
  settingsRef.current = settings

  const [agentDefaults, setAgentDefaults] = React.useState<AgentPolicy>(
    getDefaultPolicyForMode('code')
  )
  const [catalogModalOpen, setCatalogModalOpen] = React.useState(false)
  const [refreshingModels, setRefreshingModels] = React.useState<string | null>(null)

  const [formState, setFormState] = React.useState<SettingsState>({
    theme: 'system',
    language: 'en',
    defaultProvider: 'openai',
    defaultModel: 'gpt-4o-mini',
    providers: defaultProviders,
    overrideGlobalProvider: false,
    overrideGlobalModel: false,
  })
  const freshProviders = useFreshProviderConfigs(formState.providers)

  const activeTab = React.useMemo(
    () => getSettingsTabFromSearchParams(new URLSearchParams(searchParams.toString())),
    [searchParams]
  )

  const setActiveTab = React.useCallback(
    (tab: SettingsTab) => {
      router.replace(
        buildSettingsTabHref(pathname, new URLSearchParams(searchParams.toString()), tab),
        { scroll: false }
      )
    },
    [pathname, searchParams, router]
  )

  React.useEffect(() => {
    const selectedProvider = freshProviders[formState.defaultProvider]
    const availableModels = selectedProvider?.availableModels ?? []
    if (availableModels.length === 0 || availableModels.includes(formState.defaultModel)) {
      return
    }

    setFormState((prev) => {
      if (prev.defaultProvider !== formState.defaultProvider) return prev
      if (availableModels.includes(prev.defaultModel)) return prev
      return {
        ...prev,
        defaultModel: availableModels[0] ?? prev.defaultModel,
      }
    })
  }, [freshProviders, formState.defaultProvider, formState.defaultModel])

  React.useEffect(() => {
    const latestSettings = settingsRef.current
    if (latestSettings === undefined) return

    const nextSettings = buildSettingsStateFromQuery(latestSettings)
    setAgentDefaults(nextSettings.agentDefaults)
    setFormState(nextSettings.formState)
    initialSettingsSignatureRef.current = createSettingsSignature(
      buildSettingsSignatureInput(nextSettings.formState, nextSettings.agentDefaults)
    )
  }, [settingsSyncKey])

  const currentSettingsSignature = React.useMemo(
    () => createSettingsSignature(buildSettingsSignatureInput(formState, agentDefaults)),
    [agentDefaults, formState]
  )

  const isDirty =
    settings !== undefined &&
    initialSettingsSignatureRef.current !== null &&
    currentSettingsSignature !== initialSettingsSignatureRef.current

  React.useEffect(() => {
    if (!isDirty) return

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isDirty])

  const openRouterApiKey = formState.providers.openrouter?.apiKey ?? ''

  React.useEffect(() => {
    let cancelled = false

    const loadOpenRouterFreeModels = async () => {
      try {
        const headers: HeadersInit = {}
        if (openRouterApiKey.trim()) {
          headers.Authorization = `Bearer ${openRouterApiKey.trim()}`
        }

        const response = await fetch('https://openrouter.ai/api/v1/models', { headers })
        if (!response.ok) return

        const payload = await response.json()
        const freeModels = extractOpenRouterFreeCodingModelIds(payload)
        if (freeModels.length === 0 || cancelled) return

        setFormState((prev) => {
          const openrouter = prev.providers.openrouter
          if (!openrouter) return prev

          const openRouterDefault = freeModels.includes(openrouter.defaultModel)
            ? openrouter.defaultModel
            : freeModels[0]
          const globalDefault =
            prev.defaultProvider === 'openrouter' && !freeModels.includes(prev.defaultModel)
              ? openRouterDefault
              : prev.defaultModel

          return {
            ...prev,
            defaultModel: globalDefault,
            providers: {
              ...prev.providers,
              openrouter: {
                ...openrouter,
                availableModels: freeModels,
                defaultModel: openRouterDefault,
              },
            },
          }
        })
      } catch (error) {
        appLog.error('[SettingsPage] Failed to load OpenRouter free models:', error)
      }
    }

    void loadOpenRouterFreeModels()
    return () => {
      cancelled = true
    }
  }, [openRouterApiKey])

  const updateProvider = React.useCallback(
    (providerKey: string, updates: Partial<ProviderConfig>) => {
      setFormState((prev) => {
        const nextProviders = {
          ...prev.providers,
          [providerKey]: {
            ...prev.providers[providerKey],
            ...updates,
          },
        }

        const nextState: SettingsState = {
          ...prev,
          providers: nextProviders,
        }

        if (providerKey === prev.defaultProvider && typeof updates.defaultModel === 'string') {
          nextState.defaultModel = updates.defaultModel
        }

        return nextState
      })
    },
    []
  )

  const addProviderFromCatalog = React.useCallback((entry: ProviderCatalogEntry) => {
    setFormState((prev) => {
      if (prev.providers[entry.id]) return prev

      const newProvider: ProviderConfig = {
        provider: entry.id,
        name: entry.name,
        description: entry.description,
        apiKey: '',
        enabled: false,
        defaultModel: entry.defaultModel || entry.models[0]?.id || '',
        availableModels: entry.models.map((m) => m.id),
        baseUrl: entry.baseUrl,
        testStatus: 'idle',
      }

      return {
        ...prev,
        providers: {
          ...prev.providers,
          [entry.id]: newProvider,
        },
      }
    })
  }, [])

  const removeProvider = React.useCallback((providerKey: string) => {
    if (defaultProviders[providerKey]) return

    setFormState((prev) => {
      const remainingProviders = { ...prev.providers }
      delete remainingProviders[providerKey]
      const nextState = { ...prev, providers: remainingProviders }

      if (prev.defaultProvider === providerKey) {
        const firstEnabled = Object.entries(remainingProviders).find(([, p]) => p.enabled)
        nextState.defaultProvider = firstEnabled?.[0] || 'openai'
        nextState.defaultModel = firstEnabled?.[1]?.defaultModel || 'gpt-4o-mini'
      }

      return nextState
    })
  }, [])

  const refreshModelsFromApi = React.useCallback(
    async (providerKey: string) => {
      const provider = formState.providers[providerKey]
      if (!provider?.apiKey || !provider?.baseUrl) return

      setRefreshingModels(providerKey)
      try {
        const response = await fetch('/api/providers/openai-compatible/refresh-models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: provider.apiKey,
            baseUrl: provider.baseUrl,
          }),
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)

        const payload = await response.json()
        const modelIds: string[] = (payload.data || payload || [])
          .map((m: { id?: string }) => m.id)
          .filter(Boolean)

        if (modelIds.length > 0) {
          const merged = normalizeModelIds([...provider.availableModels, ...modelIds])
          updateProvider(providerKey, { availableModels: merged })
          toast.success(`Found ${modelIds.length} models from API (${merged.length} total)`)
        } else {
          toast.info('No additional models found from API')
        }
      } catch (error) {
        const detail = error instanceof Error ? error.message : 'Unknown error'
        toast.error('Failed to refresh models', { description: detail })
      } finally {
        setRefreshingModels(null)
      }
    },
    [formState.providers, updateProvider]
  )

  const testChutesViaApi = async (params: {
    apiKey: string
    baseUrl?: string
    model?: string
    mode: 'models' | 'completion'
  }): Promise<{ models?: string[]; model?: string; completionPreview?: string }> => {
    const response = await fetch('/api/providers/chutes/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })

    const payload = await response.json()
    if (!response.ok) {
      const parts = [
        payload?.error,
        payload?.guidance,
        payload?.detail,
        payload?.retryAfter ? `retry-after=${payload.retryAfter}s` : null,
      ]
        .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
        .join(' | ')

      throw new Error(parts || `Chutes test failed (${response.status})`)
    }
    return payload
  }

  const testProvider = React.useCallback(
    async (providerKey: string) => {
      const provider = formState.providers[providerKey]
      if (!provider.apiKey) {
        toast.error('Please enter an API key first')
        return
      }

      updateProvider(providerKey, { testStatus: 'testing', testStatusMessage: undefined })

      try {
        let success = false

        if (providerKey === 'chutes') {
          const payload = await testChutesViaApi({
            apiKey: provider.apiKey,
            baseUrl: provider.baseUrl,
            mode: 'models',
          })
          const models = payload.models ?? []
          success = true

          if (models.length > 0) {
            updateProvider(providerKey, {
              availableModels: models,
              defaultModel: models.includes(provider.defaultModel)
                ? provider.defaultModel
                : models[0],
              testStatusMessage: undefined,
            })
            toast.success(`${provider.name} connection successful! Found ${models.length} models.`)
          } else {
            toast.success(`${provider.name} connection successful!`)
          }
        } else if (providerKey === 'anthropic') {
          success = provider.apiKey.startsWith('sk-ant-') && provider.apiKey.length > 20
          if (success) {
            toast.success(`${provider.name} API key looks valid`)
          } else {
            toast.error(`${provider.name}: API key format looks incorrect`)
          }
        } else if (provider.baseUrl) {
          const response = await fetch('/api/providers/openai-compatible/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              apiKey: provider.apiKey,
              baseUrl: provider.baseUrl,
            }),
          })
          success = response.ok
          if (success) {
            const payload = await response.json()
            const modelIds: string[] = (payload.data || [])
              .map((m: { id?: string }) => m.id)
              .filter(Boolean)
            if (modelIds.length > 0) {
              const existingSet = new Set(provider.availableModels)
              const merged = [
                ...provider.availableModels,
                ...modelIds.filter((id) => !existingSet.has(id)),
              ]
              updateProvider(providerKey, { availableModels: merged })
              toast.success(`${provider.name} connected! Found ${modelIds.length} models.`)
            } else {
              toast.success(`${provider.name} connection successful!`)
            }
          } else {
            const errBody = await response.text().catch(() => '')
            throw new Error(`HTTP ${response.status}: ${errBody.slice(0, 200)}`)
          }
        } else {
          success = provider.apiKey.length > 10
          if (success) {
            toast.success(`${provider.name} API key saved (no endpoint to test)`)
          } else {
            toast.error(`${provider.name}: API key looks too short`)
          }
        }

        updateProvider(providerKey, {
          testStatus: success ? 'success' : 'error',
          ...(success ? { testStatusMessage: undefined } : {}),
        })
      } catch (error) {
        const detail = error instanceof Error ? error.message : 'Unknown error'
        updateProvider(providerKey, { testStatus: 'error', testStatusMessage: detail })
        toast.error(`${provider.name} connection failed`, { description: detail })
      }
    },
    [formState.providers, updateProvider]
  )

  const testProviderCompletion = React.useCallback(
    async (providerKey: string) => {
      const provider = formState.providers[providerKey]
      if (!provider.apiKey) {
        toast.error('Please enter an API key first')
        return
      }

      updateProvider(providerKey, {
        testCompletionStatus: 'testing',
        testCompletionStatusMessage: undefined,
      })

      try {
        if (providerKey === 'chutes') {
          const payload = await testChutesViaApi({
            apiKey: provider.apiKey,
            baseUrl: provider.baseUrl,
            model: provider.defaultModel,
            mode: 'completion',
          })

          updateProvider(providerKey, {
            testCompletionStatus: 'success',
            testCompletionStatusMessage: undefined,
            ...(payload.model ? { defaultModel: payload.model } : {}),
          })
          toast.success(`${provider.name} completion test successful`, {
            description: payload.model ? `Model: ${payload.model}` : undefined,
          })
          return
        }

        const detail = 'Completion test is currently implemented for Chutes only'
        updateProvider(providerKey, {
          testCompletionStatus: 'error',
          testCompletionStatusMessage: detail,
        })
        toast.error(detail)
      } catch (error) {
        const detail = error instanceof Error ? error.message : 'Unknown error'
        updateProvider(providerKey, {
          testCompletionStatus: 'error',
          testCompletionStatusMessage: detail,
        })
        toast.error(`${provider.name} completion test failed`, {
          description: detail,
        })
      }
    },
    [formState.providers, updateProvider]
  )

  const handleSave = React.useCallback(async () => {
    setIsSaving(true)
    try {
      const providersForSave = Object.fromEntries(
        Object.entries(freshProviders).map(([key, config]) => [
          key,
          {
            provider: config.provider || key,
            name: config.name,
            description: config.description,
            apiKey: config.apiKey,
            enabled: config.enabled,
            defaultModel: config.defaultModel,
            availableModels: config.availableModels,
            baseUrl:
              key === 'zai' && config.useCodingPlan
                ? 'https://api.z.ai/api/coding/paas/v4'
                : config.baseUrl || defaultProviders[key]?.baseUrl,
            useCodingPlan: config.useCodingPlan,
            reasoningEnabled: config.reasoningEnabled,
            reasoningMode: config.reasoningMode,
            reasoningBudget: config.reasoningBudget,
            showReasoningPanel: config.showReasoningPanel,
          },
        ])
      )

      await updateSettings({
        theme: formState.theme,
        language: formState.language,
        defaultProvider: formState.defaultProvider,
        defaultModel: formState.defaultModel,
        providerConfigs: providersForSave,
        agentDefaults,
        overrideGlobalProvider: formState.overrideGlobalProvider,
        overrideGlobalModel: formState.overrideGlobalModel,
      } as Parameters<typeof updateSettings>[0])

      initialSettingsSignatureRef.current = currentSettingsSignature
      toast.success('Settings saved successfully!')
    } catch (error) {
      toast.error('Failed to save settings')
      appLog.error('[SettingsPage] Failed to save settings:', error)
    } finally {
      setIsSaving(false)
    }
  }, [freshProviders, formState, agentDefaults, currentSettingsSignature, updateSettings])

  const handleDiscard = React.useCallback(() => {
    const latestSettings = settingsRef.current
    if (latestSettings === undefined) return
    const nextSettings = buildSettingsStateFromQuery(latestSettings)
    setAgentDefaults(nextSettings.agentDefaults)
    setFormState(nextSettings.formState)
    initialSettingsSignatureRef.current = createSettingsSignature(
      buildSettingsSignatureInput(nextSettings.formState, nextSettings.agentDefaults)
    )
    toast('Changes discarded')
  }, [])

  const updateFormState = React.useCallback((updates: Partial<SettingsState>) => {
    setFormState((prev) => ({ ...prev, ...updates }))
  }, [])

  return {
    formState,
    agentDefaults,
    setAgentDefaults,
    freshProviders: freshProviders as unknown as Record<string, ProviderConfig>,
    isDirty,
    isSaving,
    activeTab,
    setActiveTab,
    settings,
    adminDefaults,
    catalogModalOpen,
    setCatalogModalOpen,
    refreshingModels,
    updateProvider,
    addProviderFromCatalog,
    removeProvider,
    refreshModelsFromApi,
    testProvider,
    testProviderCompletion,
    handleSave,
    handleDiscard,
    updateFormState,
  }
}
