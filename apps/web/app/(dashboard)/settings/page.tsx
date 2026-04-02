'use client'

import { appLog } from '@/lib/logger'
import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { toast } from 'sonner'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ProviderCard } from '@/components/settings/ProviderCard'
import { ConnectProvider } from '@/components/settings/ConnectProvider'
import { ThemeToggleFull } from '@/components/settings/ThemeToggle'
import { AgentDefaultsEditor } from '@/components/settings/AgentDefaultsEditor'
import { MCPServerEditor } from '@/components/settings/MCPServerEditor'
import { SubagentEditor } from '@/components/settings/SubagentEditor'
import { UserLLMConfig } from '@/components/settings/UserLLMConfig'
import { ProviderCatalogModal } from '@/components/settings/ProviderCatalogModal'
import { getDefaultPolicyForMode, type AgentPolicy } from '@/lib/agent/automationPolicy'
import { User, Palette, Bot, Save, Loader2, ArrowLeft, Settings2, Plus, X } from 'lucide-react'
import { getDefaultProviderCapabilities, type ProviderType } from '@/lib/llm/types'
import { extractOpenRouterFreeCodingModelIds } from '@/lib/llm/openrouter-free-models'
import type { ProviderCatalogEntry } from '@/lib/llm/provider-catalog'
import {
  buildSettingsTabHref,
  createSettingsSignature,
  getSettingsTabFromSearchParams,
  type SettingsSnapshotInput,
  type SettingsTab,
} from '@/lib/settings-navigation'

interface ProviderConfig {
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

interface SettingsState {
  theme: 'light' | 'dark' | 'system'
  language: string
  defaultProvider: string
  defaultModel: string
  providers: Record<string, ProviderConfig>
  // Admin override tracking
  overrideGlobalProvider: boolean
  overrideGlobalModel: boolean
}

type SettingsQueryRecord = {
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

const defaultProviders: Record<string, ProviderConfig> = {
  openai: {
    provider: 'openai',
    name: 'OpenAI',
    description: 'Official OpenAI API for GPT models',
    apiKey: '',
    enabled: false,
    defaultModel: 'gpt-4o-mini',
    availableModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
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
}

const languages = [
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

export default function SettingsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const settings = useQuery(api.settings.get) as SettingsQueryRecord | null | undefined
  const adminDefaults = useQuery(api.settings.getAdminDefaults)
  const updateSettings = useMutation(api.settings.update)
  const [isSaving, setIsSaving] = React.useState(false)
  const initialSettingsSignatureRef = React.useRef<string | null>(null)

  // Convex `useQuery` results are not guaranteed to be referentially stable.
  // Use a version key so our "sync from server" effect doesn't loop.
  const settingsSyncKey =
    settings === undefined ? 'loading' : settings === null ? 'missing' : String(settings.updatedAt)

  const settingsRef = React.useRef(settings)
  settingsRef.current = settings

  const [agentDefaults, setAgentDefaults] = React.useState<AgentPolicy>(
    getDefaultPolicyForMode('code')
  )
  const allowUserMcp = adminDefaults?.allowUserMCP !== false
  const allowUserSubagents = adminDefaults?.allowUserSubagents !== false
  const [catalogModalOpen, setCatalogModalOpen] = React.useState(false)
  const [refreshingModels, setRefreshingModels] = React.useState<string | null>(null)

  // Local state for form
  const [formState, setFormState] = React.useState<SettingsState>({
    theme: 'system',
    language: 'en',
    defaultProvider: 'openai',
    defaultModel: 'gpt-4o-mini',
    providers: defaultProviders,
    overrideGlobalProvider: false,
    overrideGlobalModel: false,
  })

  // Sync with Convex data
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
  const activeTab = React.useMemo(
    () => getSettingsTabFromSearchParams(new URLSearchParams(searchParams.toString())),
    [searchParams]
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

  // Handle provider updates
  const updateProvider = (providerKey: string, updates: Partial<ProviderConfig>) => {
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
  }

  const addProviderFromCatalog = (entry: ProviderCatalogEntry) => {
    setFormState((prev) => {
      if (prev.providers[entry.id]) {
        return prev
      }

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
  }

  const removeProvider = (providerKey: string) => {
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
  }

  const refreshModelsFromApi = async (providerKey: string) => {
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
        const existingSet = new Set(provider.availableModels)
        const merged = [
          ...provider.availableModels,
          ...modelIds.filter((id) => !existingSet.has(id)),
        ]
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
  }

  // Test provider connection
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

  const testProvider = async (providerKey: string) => {
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
  }

  const testProviderCompletion = async (providerKey: string) => {
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
  }

  // Save settings
  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Strip testStatus before saving to Convex
      const providersForSave = Object.fromEntries(
        Object.entries(formState.providers).map(([key, config]) => [
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
  }

  const handleBackToProjects = () => {
    if (isDirty) {
      const shouldLeave = window.confirm('You have unsaved changes. Leave without saving?')
      if (!shouldLeave) return
    }

    router.push('/projects')
  }

  return (
    <>
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 mb-4 text-muted-foreground hover:text-foreground"
            onClick={handleBackToProjects}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Projects
          </Button>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your preferences and API configurations
          </p>
        </div>

        {isDirty ? (
          <div className="mb-4 border border-border bg-muted/20 px-3 py-2 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Unsaved changes
          </div>
        ) : null}

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            router.replace(
              buildSettingsTabHref(
                pathname,
                new URLSearchParams(searchParams.toString()),
                value as SettingsTab
              ),
              { scroll: false }
            )
          }}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-4 lg:w-[520px]">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="providers" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              LLM Providers
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Advanced
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Appearance
            </TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>Configure your basic preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Language Selection */}
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select
                    value={formState.language}
                    onValueChange={(value) =>
                      setFormState((prev) => ({ ...prev, language: value }))
                    }
                  >
                    <SelectTrigger id="language" className="w-full max-w-sm">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* User LLM Configuration with Admin Override Support */}
                <UserLLMConfig
                  adminDefaults={adminDefaults}
                  userSettings={{
                    defaultProvider: formState.defaultProvider,
                    defaultModel: formState.defaultModel,
                    overrideGlobalProvider: formState.overrideGlobalProvider,
                    overrideGlobalModel: formState.overrideGlobalModel,
                    providers: formState.providers,
                  }}
                  onUpdate={(config) => {
                    setFormState((prev) => ({
                      ...prev,
                      ...config,
                    }))
                  }}
                  availableProviders={Object.fromEntries(
                    Object.entries(formState.providers).map(([key, p]) => [
                      key,
                      { name: p.name, availableModels: p.availableModels, enabled: p.enabled },
                    ])
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Automation Defaults</CardTitle>
                <CardDescription>
                  Configure the browser automation defaults Panda uses for new projects.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AgentDefaultsEditor value={agentDefaults} onChange={setAgentDefaults} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* LLM Providers Tab */}
          <TabsContent value="providers" className="space-y-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">LLM Providers</h3>
                <p className="text-sm text-muted-foreground">
                  Configure API keys for your preferred providers
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setCatalogModalOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add Provider
              </Button>
            </div>

            <ProviderCatalogModal
              open={catalogModalOpen}
              onOpenChange={setCatalogModalOpen}
              configuredProviderIds={Object.keys(formState.providers)}
              onSelectProvider={addProviderFromCatalog}
            />

            <div className="grid gap-6">
              {Object.entries(formState.providers).map(([key, provider]) => {
                const providerType = (provider.provider || key) as ProviderType
                const supportsReasoning =
                  getDefaultProviderCapabilities(providerType).supportsReasoning
                return (
                  <div key={key} className="relative">
                    <ProviderCard
                      provider={provider}
                      supportsReasoning={supportsReasoning}
                      onChange={(updates) => updateProvider(key, updates)}
                      onTest={() => testProvider(key)}
                      onTestCompletion={
                        key === 'chutes' ? () => testProviderCompletion(key) : undefined
                      }
                      onRefreshModels={
                        provider.baseUrl ? () => refreshModelsFromApi(key) : undefined
                      }
                      refreshingModels={refreshingModels === key}
                    />
                    {!defaultProviders[key] && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-2"
                        onClick={() => removeProvider(key)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>OAuth Connections</CardTitle>
                <CardDescription>
                  Connect providers using OAuth for seamless authentication (no API key needed)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ConnectProvider provider="chutes" />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>MCP Servers</CardTitle>
                <CardDescription>
                  Configure Model Context Protocol servers for extended capabilities
                </CardDescription>
              </CardHeader>
              <CardContent>
                {allowUserMcp ? (
                  <MCPServerEditor />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    MCP access is disabled by your admin.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Custom Subagents</CardTitle>
                <CardDescription>Create specialized agents for specific tasks</CardDescription>
              </CardHeader>
              <CardContent>
                {allowUserSubagents ? (
                  <SubagentEditor />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Custom subagents are disabled by your admin.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Customize how Panda.ai looks for you</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>Theme</Label>
                  <ThemeToggleFull
                    value={formState.theme}
                    onChange={(theme) => setFormState((prev) => ({ ...prev, theme }))}
                  />
                  <p className="text-sm text-muted-foreground">
                    Choose your preferred color scheme. System will follow your OS preference.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="mt-8 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            size="lg"
            className="min-w-[140px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  )
}
