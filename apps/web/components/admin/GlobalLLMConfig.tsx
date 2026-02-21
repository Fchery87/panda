'use client'

import * as React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { AlertCircle, Save, Bot, X } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface GlobalLLMConfigProps {
  settings:
    | {
        globalDefaultProvider?: string | null
        globalDefaultModel?: string | null
        globalProviderConfigs?: Record<string, Record<string, unknown>>
        allowUserOverrides?: boolean
      }
    | undefined
  onSave: (config: {
    globalDefaultProvider?: string
    globalDefaultModel?: string
    globalProviderConfigs?: Record<string, Record<string, unknown>>
    allowUserOverrides?: boolean
  }) => void
}

const defaultProviders = [
  {
    value: 'openai',
    label: 'OpenAI',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  },
  {
    value: 'openrouter',
    label: 'OpenRouter',
    models: [
      'qwen/qwen3-coder:free',
      'moonshotai/kimi-dev-72b:free',
      'deepseek/deepseek-coder:free',
    ],
  },
  {
    value: 'together',
    label: 'Together.ai',
    models: [
      'meta-llama/Llama-3.1-70B-Instruct-Turbo',
      'meta-llama/Llama-3.1-8B-Instruct-Turbo',
      'mistralai/Mixtral-8x22B-Instruct-v0.1',
      'Qwen/Qwen2.5-72B-Instruct-Turbo',
    ],
  },
  {
    value: 'anthropic',
    label: 'Anthropic',
    models: ['claude-opus-4-6', 'claude-sonnet-4-5'],
  },
  {
    value: 'zai',
    label: 'Z.ai',
    models: ['glm-4.7', 'glm-4.7-flashx', 'glm-4.7-flash'],
  },
  {
    value: 'chutes',
    label: 'Chutes.ai',
    models: [
      'deepseek-ai/DeepSeek-V3',
      'meta-llama/Llama-3.1-70B-Instruct',
      'meta-llama/Llama-3.1-8B-Instruct',
      'meta-llama/Llama-3.2-11B-Vision-Instruct',
      'Qwen/Qwen2.5-72B-Instruct',
    ],
  },
  {
    value: 'deepseek',
    label: 'DeepSeek',
    models: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'],
  },
  {
    value: 'groq',
    label: 'Groq',
    models: [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'mixtral-8x7b-32768',
      'gemma2-9b-it',
    ],
  },
  {
    value: 'fireworks',
    label: 'Fireworks AI',
    models: [
      'accounts/fireworks/models/llama-v3p1-70b-instruct',
      'accounts/fireworks/models/llama-v3p1-8b-instruct',
      'accounts/fireworks/models/qwen2p5-72b-instruct',
      'accounts/fireworks/models/deepseek-v3',
    ],
  },
]

export function GlobalLLMConfig({ settings, onSave }: GlobalLLMConfigProps) {
  const [config, setConfig] = React.useState({
    provider: settings?.globalDefaultProvider || '',
    model: settings?.globalDefaultModel || '',
    allowOverrides: settings?.allowUserOverrides !== false,
  })

  React.useEffect(() => {
    if (settings) {
      setConfig({
        provider: settings.globalDefaultProvider || '',
        model: settings.globalDefaultModel || '',
        allowOverrides: settings.allowUserOverrides !== false,
      })
    }
  }, [settings])

  const selectedProvider = defaultProviders.find((p) => p.value === config.provider)
  const availableModels = selectedProvider?.models || []

  const handleSave = () => {
    onSave({
      globalDefaultProvider: config.provider || undefined,
      globalDefaultModel: config.model || undefined,
      allowUserOverrides: config.allowOverrides,
    })
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-none">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            <CardTitle>Global LLM Configuration</CardTitle>
          </div>
          <CardDescription>
            Configure the default LLM provider and model for all users system-wide. Users can
            override these settings if allowed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="rounded-none border-l-4 border-l-primary">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              These settings apply to all users unless they have permission to override them.
              Changes take effect immediately for new sessions.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="global-provider" className="font-mono text-sm">
                Default Provider
              </Label>
              <div className="flex gap-2">
                <Select
                  value={config.provider || undefined}
                  onValueChange={(value) =>
                    setConfig((prev) => ({
                      ...prev,
                      provider: value,
                      model: '', // Reset model when provider changes
                    }))
                  }
                >
                  <SelectTrigger id="global-provider" className="flex-1 rounded-none">
                    <SelectValue placeholder="No default set (users must configure)" />
                  </SelectTrigger>
                  <SelectContent>
                    {defaultProviders.map((provider) => (
                      <SelectItem key={provider.value} value={provider.value}>
                        {provider.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {config.provider && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-none"
                    onClick={() => setConfig((prev) => ({ ...prev, provider: '', model: '' }))}
                    title="Clear provider selection"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {config.provider && (
              <div className="space-y-2">
                <Label htmlFor="global-model" className="font-mono text-sm">
                  Default Model
                </Label>
                <Select
                  value={config.model}
                  onValueChange={(value) => setConfig((prev) => ({ ...prev, model: value }))}
                >
                  <SelectTrigger id="global-model" className="rounded-none">
                    <SelectValue placeholder="Select model..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.map((model) => (
                      <SelectItem key={model} value={model}>
                        {model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="font-mono text-sm">Allow User Overrides</Label>
              <p className="text-sm text-muted-foreground">
                Users can configure their own provider and model preferences
              </p>
            </div>
            <Switch
              checked={config.allowOverrides}
              onCheckedChange={(checked) =>
                setConfig((prev) => ({ ...prev, allowOverrides: checked }))
              }
            />
          </div>

          {!config.allowOverrides && (
            <Alert variant="destructive" className="rounded-none">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                User overrides are disabled. All users will be forced to use the global settings.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end">
            <Button onClick={handleSave} className="rounded-none">
              <Save className="mr-2 h-4 w-4" />
              Save Configuration
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-none">
        <CardHeader>
          <CardTitle>Provider Configuration</CardTitle>
          <CardDescription>
            Configure API keys and settings for each provider at the system level.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert className="rounded-none">
              <AlertDescription className="font-mono text-sm">
                System-level provider configuration is managed through environment variables.
                Contact your DevOps team to update provider API keys.
              </AlertDescription>
            </Alert>

            <div className="grid gap-4 md:grid-cols-2">
              {defaultProviders.map((provider) => (
                <div
                  key={provider.value}
                  className="flex items-center justify-between rounded-none border border-border p-4"
                >
                  <span className="font-medium">{provider.label}</span>
                  <span className="font-mono text-xs text-muted-foreground">Via ENV</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
