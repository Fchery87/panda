'use client'

import { appLog } from '@/lib/logger'
import * as React from 'react'
import { useRouter } from 'next/navigation'
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
import { PermissionsEditor } from '@/components/settings/PermissionsEditor'
import { MCPServerEditor } from '@/components/settings/MCPServerEditor'
import { SubagentEditor } from '@/components/settings/SubagentEditor'
import { UserLLMConfig } from '@/components/settings/UserLLMConfig'
import { type PermissionsConfig, DEFAULT_PERMISSIONS } from '@/lib/permissions'
import { User, Palette, Bot, Save, Loader2, ArrowLeft, Settings2 } from 'lucide-react'
import { getDefaultProviderCapabilities, type ProviderType } from '@/lib/llm/types'
import { extractOpenRouterFreeCodingModelIds } from '@/lib/llm/openrouter-free-models'

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

export default function SettingsPage() {
  const router = useRouter()
  const settings = useQuery(api.settings.get)
  const adminDefaults = useQuery(api.settings.getAdminDefaults)
  const updateSettings = useMutation(api.settings.update)
  const [isSaving, setIsSaving] = React.useState(false)

  // Convex `useQuery` results are not guaranteed to be referentially stable.
  // Use a version key so our "sync from server" effect doesn't loop.
  const settingsSyncKey =
    settings === undefined ? 'loading' : settings === null ? 'missing' : String(settings.updatedAt)

  const settingsRef = React.useRef(settings)
  settingsRef.current = settings

  const [permissions, setPermissions] = React.useState<PermissionsConfig>(DEFAULT_PERMISSIONS)

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

    if (latestSettings === null) {
      setPermissions(DEFAULT_PERMISSIONS)
      setFormState((prev) => ({
        ...prev,
        theme: 'system',
        language: 'en',
        defaultProvider: 'openai',
        defaultModel: 'gpt-4o-mini',
        providers: defaultProviders,
        overrideGlobalProvider: false,
        overrideGlobalModel: false,
      }))
      return
    }

    if ((latestSettings as Record<string, unknown>).permissions) {
      setPermissions((latestSettings as Record<string, unknown>).permissions as PermissionsConfig)
    } else {
      setPermissions(DEFAULT_PERMISSIONS)
    }

    setFormState((prev) => ({
      ...prev,
      theme: latestSettings.theme,
      language: latestSettings.language || 'en',
      defaultProvider: latestSettings.defaultProvider || 'openai',
      defaultModel: latestSettings.defaultModel || 'gpt-4o-mini',
      providers: latestSettings.providerConfigs
        ? {
            ...defaultProviders,
            ...Object.fromEntries(
              Object.entries(latestSettings.providerConfigs).map(([key, config]) => {
                const mergedConfig = {
                  ...(defaultProviders[key] ?? {}),
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
    }))
  }, [settingsSyncKey])

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
      } else {
        // Simulate API test for other providers
        await new Promise((resolve) => setTimeout(resolve, 1500))
        success = provider.apiKey.length > 10

        if (success) {
          toast.success(`${provider.name} connection successful!`)
        } else {
          toast.error(`${provider.name} connection failed`)
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
        permissions,
        overrideGlobalProvider: formState.overrideGlobalProvider,
        overrideGlobalModel: formState.overrideGlobalModel,
      } as Parameters<typeof updateSettings>[0])

      toast.success('Settings saved successfully!')
    } catch (error) {
      toast.error('Failed to save settings')
      appLog.error('[SettingsPage] Failed to save settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <div id="main-content" className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 mb-4 text-muted-foreground hover:text-foreground"
            onClick={() => router.push('/')}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Projects
          </Button>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your preferences and API configurations
          </p>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
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
                <CardTitle>Permissions</CardTitle>
                <CardDescription>
                  Configure fine-grained permissions for tools and commands.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PermissionsEditor value={permissions} onChange={setPermissions} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* LLM Providers Tab */}
          <TabsContent value="providers" className="space-y-6">
            <div className="grid gap-6">
              {Object.entries(formState.providers).map(([key, provider]) => {
                // Capability-gated controls: only render reasoning controls where supported.
                // This keeps settings consistent regardless of provider selection.
                const providerType = (provider.provider || key) as ProviderType
                const supportsReasoning =
                  getDefaultProviderCapabilities(providerType).supportsReasoning
                return (
                  <ProviderCard
                    key={key}
                    provider={provider}
                    supportsReasoning={supportsReasoning}
                    onChange={(updates) => updateProvider(key, updates)}
                    onTest={() => testProvider(key)}
                    onTestCompletion={
                      key === 'chutes' ? () => testProviderCompletion(key) : undefined
                    }
                  />
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
                <MCPServerEditor />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Custom Subagents</CardTitle>
                <CardDescription>Create specialized agents for specific tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <SubagentEditor />
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
          <Button onClick={handleSave} disabled={isSaving} size="lg" className="min-w-[140px]">
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
