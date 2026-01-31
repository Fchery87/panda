"use client"

import * as React from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { toast } from "sonner"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ProviderCard } from "@/components/settings/ProviderCard"
import { ThemeToggle } from "@/components/settings/ThemeToggle"
import { User, Palette, Bot, Save } from "lucide-react"

interface ProviderConfig {
  name: string
  description: string
  apiKey: string
  enabled: boolean
  defaultModel: string
  availableModels: string[]
  testStatus?: "idle" | "testing" | "success" | "error"
}

interface SettingsState {
  theme: "light" | "dark" | "system"
  language: string
  defaultProvider: string
  defaultModel: string
  providers: Record<string, ProviderConfig>
}

const defaultProviders: Record<string, ProviderConfig> = {
  openai: {
    name: "OpenAI",
    description: "Official OpenAI API for GPT models",
    apiKey: "",
    enabled: false,
    defaultModel: "gpt-4o-mini",
    availableModels: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
    testStatus: "idle",
  },
  openrouter: {
    name: "OpenRouter",
    description: "Access multiple AI models through a single API",
    apiKey: "",
    enabled: false,
    defaultModel: "anthropic/claude-3.5-sonnet",
    availableModels: [
      "anthropic/claude-3.5-sonnet",
      "anthropic/claude-3-opus",
      "meta-llama/llama-3.1-70b-instruct",
      "google/gemini-pro",
    ],
    testStatus: "idle",
  },
  together: {
    name: "Together.ai",
    description: "Fast inference for open-source models",
    apiKey: "",
    enabled: false,
    defaultModel: "meta-llama/Llama-3.1-70B-Instruct-Turbo",
    availableModels: [
      "meta-llama/Llama-3.1-70B-Instruct-Turbo",
      "meta-llama/Llama-3.1-8B-Instruct-Turbo",
      "mistralai/Mixtral-8x22B-Instruct-v0.1",
      "Qwen/Qwen2.5-72B-Instruct-Turbo",
    ],
    testStatus: "idle",
  },
}

const languages = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "zh", label: "Chinese" },
  { value: "ja", label: "Japanese" },
]

export default function SettingsPage() {
  const settings = useQuery(api.settings.get)
  const updateSettings = useMutation(api.settings.update)
  const [isSaving, setIsSaving] = React.useState(false)

  // Local state for form
  const [formState, setFormState] = React.useState<SettingsState>({
    theme: "system",
    language: "en",
    defaultProvider: "openai",
    defaultModel: "gpt-4o-mini",
    providers: defaultProviders,
  })

  // Sync with Convex data
  React.useEffect(() => {
    if (settings) {
      setFormState((prev) => ({
        ...prev,
        theme: settings.theme,
        language: settings.language || "en",
        defaultProvider: settings.defaultProvider || "openai",
        defaultModel: settings.defaultModel || "gpt-4o-mini",
        providers: settings.providerConfigs
          ? { ...defaultProviders, ...Object.fromEntries(
              Object.entries(settings.providerConfigs).map(([key, config]: [string, any]) => [
                key,
                { ...defaultProviders[key], ...config, testStatus: "idle" },
              ])
            )}
          : defaultProviders,
      }))
    }
  }, [settings])

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
      toast.error("Please enter an API key first")
      return
    }

    updateProvider(providerKey, { testStatus: "testing" })

    // Simulate API test
    setTimeout(() => {
      // In a real implementation, you would make an actual API call here
      const success = provider.apiKey.length > 10
      updateProvider(providerKey, { 
        testStatus: success ? "success" : "error" 
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
            name: config.name,
            description: config.description,
            apiKey: config.apiKey,
            enabled: config.enabled,
            defaultModel: config.defaultModel,
            availableModels: config.availableModels,
          },
        ])
      )

      await updateSettings({
        theme: formState.theme,
        language: formState.language,
        defaultProvider: formState.defaultProvider,
        defaultModel: formState.defaultModel,
        providerConfigs: providersForSave,
      })

      toast.success("Settings saved successfully!")
    } catch (error) {
      toast.error("Failed to save settings")
      console.error(error)
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
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your preferences and API configurations
        </p>
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
              <CardDescription>
                Configure your basic preferences
              </CardDescription>
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

              {/* Default Provider Selection */}
              <div className="space-y-2">
                <Label htmlFor="default-provider">Default LLM Provider</Label>
                <Select
                  value={formState.defaultProvider}
                  onValueChange={(value) =>
                    setFormState((prev) => ({
                      ...prev,
                      defaultProvider: value,
                      defaultModel: prev.providers[value]?.defaultModel || "",
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
        </TabsContent>

        {/* LLM Providers Tab */}
        <TabsContent value="providers" className="space-y-6">
          <div className="grid gap-6">
            {Object.entries(formState.providers).map(([key, provider]) => (
              <ProviderCard
                key={key}
                provider={provider}
                onChange={(updates) => updateProvider(key, updates)}
                onTest={() => testProvider(key)}
              />
            ))}
          </div>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize how Panda.ai looks for you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Theme</Label>
                <ThemeToggle
                  value={formState.theme}
                  onChange={(theme) =>
                    setFormState((prev) => ({ ...prev, theme }))
                  }
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
          disabled={isSaving}
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
  )
}
