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
import { useProviderDefinitions } from '@/hooks/useProviderDefinitions'

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

const NO_PROVIDER_SELECTED = '__no-provider-selected__'
const NO_MODEL_SELECTED = '__no-model-selected__'

export function GlobalLLMConfig({ settings, onSave }: GlobalLLMConfigProps) {
  const defaultProviders = useProviderDefinitions()
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
                  value={config.provider || NO_PROVIDER_SELECTED}
                  onValueChange={(value) =>
                    setConfig((prev) => ({
                      ...prev,
                      provider: value === NO_PROVIDER_SELECTED ? '' : value,
                      model: '', // Reset model when provider changes
                    }))
                  }
                >
                  <SelectTrigger id="global-provider" className="flex-1 rounded-none">
                    <SelectValue placeholder="No default set (users must configure)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_PROVIDER_SELECTED}>
                      No default set (users must configure)
                    </SelectItem>
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
                  value={config.model || NO_MODEL_SELECTED}
                  onValueChange={(value) =>
                    setConfig((prev) => ({
                      ...prev,
                      model: value === NO_MODEL_SELECTED ? '' : value,
                    }))
                  }
                >
                  <SelectTrigger id="global-model" className="rounded-none">
                    <SelectValue placeholder="Select model..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_MODEL_SELECTED}>Select model...</SelectItem>
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
