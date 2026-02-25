'use client'

import * as React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { AlertCircle, Bot, Lock } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface UserLLMConfigProps {
  // Admin defaults
  adminDefaults:
    | {
        globalDefaultProvider?: string | null
        globalDefaultModel?: string | null
        allowUserOverrides?: boolean
      }
    | undefined

  // User settings
  userSettings: {
    defaultProvider?: string
    defaultModel?: string
    overrideGlobalProvider?: boolean
    overrideGlobalModel?: boolean
    providers?: Record<string, unknown>
  }

  // Callbacks
  onUpdate: (config: {
    defaultProvider?: string
    defaultModel?: string
    overrideGlobalProvider?: boolean
    overrideGlobalModel?: boolean
  }) => void

  // Provider definitions
  availableProviders: Record<
    string,
    {
      name: string
      availableModels: string[]
      enabled: boolean
    }
  >
}

export function UserLLMConfig({
  adminDefaults,
  userSettings,
  onUpdate,
  availableProviders,
}: UserLLMConfigProps) {
  const allowOverrides = adminDefaults?.allowUserOverrides !== false
  const hasAdminDefaults = !!adminDefaults?.globalDefaultProvider

  // Determine effective settings
  const effectiveProvider = userSettings.overrideGlobalProvider
    ? userSettings.defaultProvider
    : adminDefaults?.globalDefaultProvider || userSettings.defaultProvider

  const effectiveModel = userSettings.overrideGlobalModel
    ? userSettings.defaultModel
    : adminDefaults?.globalDefaultModel || userSettings.defaultModel

  const selectedProvider = availableProviders[effectiveProvider || '']
  const availableModels = selectedProvider?.availableModels || []

  const handleToggleOverrideProvider = (checked: boolean) => {
    onUpdate({
      overrideGlobalProvider: checked,
      defaultProvider: checked ? userSettings.defaultProvider || '' : undefined,
    })
  }

  const handleToggleOverrideModel = (checked: boolean) => {
    onUpdate({
      overrideGlobalModel: checked,
      defaultModel: checked ? userSettings.defaultModel || '' : undefined,
    })
  }

  const handleProviderChange = (value: string) => {
    onUpdate({
      defaultProvider: value,
      defaultModel: availableProviders[value]?.availableModels[0] || '',
    })
  }

  const handleModelChange = (value: string) => {
    onUpdate({
      defaultModel: value,
    })
  }

  return (
    <div className="space-y-6">
      {/* Admin Defaults Info */}
      <Card className="rounded-none border-l-4 border-l-primary">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">System Defaults</CardTitle>
            </div>
            {allowOverrides ? (
              <Badge variant="outline" className="rounded-none">
                Override Allowed
              </Badge>
            ) : (
              <Badge variant="secondary" className="rounded-none">
                Locked
              </Badge>
            )}
          </div>
          <CardDescription>
            Your administrator has configured these default settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasAdminDefaults ? (
            <Alert className="rounded-none">
              <AlertDescription>
                No system-wide defaults configured. You can set your own preferences below.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label className="font-mono text-xs uppercase text-muted-foreground">
                    Default Provider
                  </Label>
                  <p className="font-medium">
                    {availableProviders[adminDefaults.globalDefaultProvider || '']?.name ||
                      adminDefaults.globalDefaultProvider ||
                      'Not configured'}
                  </p>
                </div>

                <div className="space-y-1">
                  <Label className="font-mono text-xs uppercase text-muted-foreground">
                    Default Model
                  </Label>
                  <p className="font-mono text-sm font-medium">
                    {adminDefaults.globalDefaultModel || 'Not configured'}
                  </p>
                </div>
              </div>

              {!allowOverrides && (
                <Alert variant="destructive" className="rounded-none">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Your administrator has disabled user overrides. You must use the system
                    defaults.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* User Override Section */}
      {allowOverrides && (
        <Card className="rounded-none">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <CardTitle>Your LLM Preferences</CardTitle>
            </div>
            <CardDescription>
              Override the system defaults with your own preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Provider Override Toggle */}
            <div className="flex items-center justify-between rounded-none border border-border bg-muted/30 p-4">
              <div className="space-y-0.5">
                <Label className="font-mono text-sm">Override Provider</Label>
                <p className="text-sm text-muted-foreground">
                  Use your own provider instead of the system default
                </p>
              </div>
              <Switch
                checked={userSettings.overrideGlobalProvider}
                onCheckedChange={handleToggleOverrideProvider}
              />
            </div>

            {userSettings.overrideGlobalProvider && (
              <div className="space-y-4 border-l-2 border-l-primary pl-4">
                <div className="space-y-2">
                  <Label htmlFor="user-provider" className="font-mono text-sm">
                    Select Provider
                  </Label>
                  <Select
                    value={userSettings.defaultProvider || ''}
                    onValueChange={handleProviderChange}
                  >
                    <SelectTrigger id="user-provider" className="rounded-none">
                      <SelectValue placeholder="Select a provider..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(availableProviders)
                        .filter(([_, p]) => p.enabled)
                        .map(([key, provider]) => (
                          <SelectItem key={key} value={key}>
                            {provider.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <Separator />

            {/* Model Override Toggle */}
            <div className="flex items-center justify-between rounded-none border border-border bg-muted/30 p-4">
              <div className="space-y-0.5">
                <Label className="font-mono text-sm">Override Model</Label>
                <p className="text-sm text-muted-foreground">
                  Use your own model instead of the system default
                </p>
              </div>
              <Switch
                checked={userSettings.overrideGlobalModel}
                onCheckedChange={handleToggleOverrideModel}
              />
            </div>

            {userSettings.overrideGlobalModel && (
              <div className="space-y-4 border-l-2 border-l-primary pl-4">
                <div className="space-y-2">
                  <Label htmlFor="user-model" className="font-mono text-sm">
                    Select Model
                  </Label>
                  <Select
                    value={userSettings.defaultModel || ''}
                    onValueChange={handleModelChange}
                    disabled={availableModels.length === 0}
                  >
                    <SelectTrigger id="user-model" className="rounded-none">
                      <SelectValue
                        placeholder={
                          availableModels.length === 0
                            ? 'Select a provider first'
                            : 'Select a model...'
                        }
                      />
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
              </div>
            )}

            <Separator />

            {/* Effective Settings Summary */}
            <div className="rounded-none bg-muted p-4">
              <p className="mb-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Effective Settings (What will be used)
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Provider</Label>
                  <p className="font-medium">
                    {availableProviders[effectiveProvider || '']?.name ||
                      effectiveProvider ||
                      'Not set'}
                    {userSettings.overrideGlobalProvider && (
                      <span className="ml-2 text-xs text-primary">(overridden)</span>
                    )}
                  </p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Model</Label>
                  <p className="font-mono text-sm font-medium">
                    {effectiveModel || 'Not set'}
                    {userSettings.overrideGlobalModel && (
                      <span className="ml-2 text-xs text-primary">(overridden)</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
