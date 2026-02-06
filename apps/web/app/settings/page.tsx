'use client'

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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { ProviderCard } from '@/components/settings/ProviderCard'
import { ThemeToggleFull } from '@/components/settings/ThemeToggle'
import { User, Palette, Bot, Save, Loader2, ArrowLeft } from 'lucide-react'
import { getDefaultProviderCapabilities, type ProviderType } from '@/lib/llm/types'

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
}

interface SettingsState {
  theme: 'light' | 'dark' | 'system'
  language: string
  defaultProvider: string
  defaultModel: string
  providers: Record<string, ProviderConfig>
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
    defaultModel: 'anthropic/claude-3.5-sonnet',
    availableModels: [
      'anthropic/claude-3.5-sonnet',
      'anthropic/claude-3-opus',
      'meta-llama/llama-3.1-70b-instruct',
      'google/gemini-pro',
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
  const updateSettings = useMutation(api.settings.update)
  const [isSaving, setIsSaving] = React.useState(false)

  // Convex `useQuery` results are not guaranteed to be referentially stable.
  // Use a version key so our "sync from server" effect doesn't loop.
  const settingsSyncKey =
    settings === undefined ? 'loading' : settings === null ? 'missing' : String(settings.updatedAt)

  const settingsRef = React.useRef(settings)
  settingsRef.current = settings

  const [agentDefaults, setAgentDefaults] = React.useState<{
    autoApplyFiles: boolean
    autoRunCommands: boolean
    allowedCommandPrefixes: string[]
  }>({
    autoApplyFiles: false,
    autoRunCommands: false,
    allowedCommandPrefixes: [],
  })
  const [allowedCommandPrefixesText, setAllowedCommandPrefixesText] = React.useState('')

  // Local state for form
  const [formState, setFormState] = React.useState<SettingsState>({
    theme: 'system',
    language: 'en',
    defaultProvider: 'openai',
    defaultModel: 'gpt-4o-mini',
    providers: defaultProviders,
  })

  // Sync with Convex data
  React.useEffect(() => {
    const latestSettings = settingsRef.current
    if (latestSettings === undefined) return

    if (latestSettings === null) {
      setAgentDefaults({
        autoApplyFiles: false,
        autoRunCommands: false,
        allowedCommandPrefixes: [],
      })
      setAllowedCommandPrefixesText('')
      setFormState((prev) => ({
        ...prev,
        theme: 'system',
        language: 'en',
        defaultProvider: 'openai',
        defaultModel: 'gpt-4o-mini',
        providers: defaultProviders,
      }))
      return
    }

    if (latestSettings.agentDefaults) {
      setAgentDefaults(latestSettings.agentDefaults)
      setAllowedCommandPrefixesText(
        (latestSettings.agentDefaults.allowedCommandPrefixes || []).join('\n')
      )
    } else {
      setAgentDefaults({
        autoApplyFiles: false,
        autoRunCommands: false,
        allowedCommandPrefixes: [],
      })
      setAllowedCommandPrefixesText('')
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
    }))
  }, [settingsSyncKey])

  // Handle provider updates
  const updateProvider = (providerKey: string, updates: Partial<ProviderConfig>) => {
    setFormState((prev) => ({
      ...prev,
      providers: {
        ...prev.providers,
        [providerKey]: {
          ...prev.providers[providerKey],
          ...updates,
        },
      },
    }))
  }

  // Test provider connection
  const testProvider = async (providerKey: string) => {
    const provider = formState.providers[providerKey]
    if (!provider.apiKey) {
      toast.error('Please enter an API key first')
      return
    }

    updateProvider(providerKey, { testStatus: 'testing' })

    // Simulate API test
    setTimeout(() => {
      // In a real implementation, you would make an actual API call here
      const success = provider.apiKey.length > 10
      updateProvider(providerKey, {
        testStatus: success ? 'success' : 'error',
      })

      if (success) {
        toast.success(`${provider.name} connection successful!`)
      } else {
        toast.error(`${provider.name} connection failed`)
      }
    }, 1500)
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
        agentDefaults: {
          autoApplyFiles: agentDefaults.autoApplyFiles,
          autoRunCommands: agentDefaults.autoRunCommands,
          allowedCommandPrefixes: allowedCommandPrefixesText
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
        },
      })

      toast.success('Settings saved successfully!')
    } catch (error) {
      toast.error('Failed to save settings')
      console.error('[SettingsPage] Failed to save settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Get available models for the selected default provider
  const availableDefaultModels = React.useMemo(() => {
    const provider = formState.providers[formState.defaultProvider]
    return provider?.enabled ? provider.availableModels : []
  }, [formState.defaultProvider, formState.providers])

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
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
        <p className="mt-1 text-muted-foreground">Manage your preferences and API configurations</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="providers" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            LLM Providers
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
                  onValueChange={(value) => setFormState((prev) => ({ ...prev, language: value }))}
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

              {/* Default Provider Selection */}
              <div className="space-y-2">
                <Label htmlFor="default-provider">Default LLM Provider</Label>
                <Select
                  value={formState.defaultProvider}
                  onValueChange={(value) =>
                    setFormState((prev) => ({
                      ...prev,
                      defaultProvider: value,
                      defaultModel: prev.providers[value]?.defaultModel || '',
                    }))
                  }
                >
                  <SelectTrigger id="default-provider" className="w-full max-w-sm">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(formState.providers)
                      .filter(([_, p]) => p.enabled)
                      .map(([key, provider]) => (
                        <SelectItem key={key} value={key}>
                          {provider.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {Object.values(formState.providers).filter((p) => p.enabled).length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Enable at least one provider in the LLM Providers tab
                  </p>
                )}
              </div>

              {/* Default Model Selection */}
              <div className="space-y-2">
                <Label htmlFor="default-model">Default Model</Label>
                <Select
                  value={formState.defaultModel}
                  onValueChange={(value) =>
                    setFormState((prev) => ({ ...prev, defaultModel: value }))
                  }
                  disabled={availableDefaultModels.length === 0}
                >
                  <SelectTrigger id="default-model" className="w-full max-w-sm">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDefaultModels.map((model) => (
                      <SelectItem key={model} value={model}>
                        {model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Automation Defaults</CardTitle>
              <CardDescription>
                Choose whether Panda auto-applies file changes and auto-runs allowlisted commands by
                default.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <Label className="font-mono text-xs">Auto-apply file writes</Label>
                  <p className="text-xs text-muted-foreground">
                    Applies queued file artifacts automatically in Build mode.
                  </p>
                </div>
                <Switch
                  checked={agentDefaults.autoApplyFiles}
                  onCheckedChange={(v) =>
                    setAgentDefaults((prev) => ({ ...prev, autoApplyFiles: v }))
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <Label className="font-mono text-xs">Auto-run allowlisted commands</Label>
                  <p className="text-xs text-muted-foreground">
                    Only runs commands whose prefixes match the allowlist.
                  </p>
                </div>
                <Switch
                  checked={agentDefaults.autoRunCommands}
                  onCheckedChange={(v) =>
                    setAgentDefaults((prev) => ({ ...prev, autoRunCommands: v }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label className="font-mono text-xs">Allowed command prefixes (one per line)</Label>
                <Textarea
                  value={allowedCommandPrefixesText}
                  onChange={(e) => setAllowedCommandPrefixesText(e.target.value)}
                  placeholder={'bun test\nbunx eslint\nbun run lint'}
                  className="min-h-[120px] rounded-none font-mono text-xs"
                  disabled={!agentDefaults.autoRunCommands}
                />
              </div>
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
                />
              )
            })}
          </div>
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
  )
}
