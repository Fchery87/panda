'use client'

import * as React from 'react'
import { Check, X, Loader2, Key, TestTube, RefreshCw, ChevronDown } from 'lucide-react'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { normalizeModelIds } from '@/lib/llm/model-sync'
import { cn } from '@/lib/utils'

interface ProviderConfig {
  name: string
  description: string
  apiKey: string
  enabled: boolean
  baseUrl?: string
  defaultModel: string
  availableModels: string[]
  testStatus?: 'idle' | 'testing' | 'success' | 'error'
  testCompletionStatus?: 'idle' | 'testing' | 'success' | 'error'
  testStatusMessage?: string
  testCompletionStatusMessage?: string
  useCodingPlan?: boolean
  reasoningEnabled?: boolean
  reasoningMode?: 'auto' | 'low' | 'medium' | 'high'
  reasoningBudget?: number
  showReasoningPanel?: boolean
}

interface ProviderCardProps {
  provider: ProviderConfig
  supportsReasoning?: boolean
  onChange: (updates: Partial<ProviderConfig>) => void
  onTest: () => void
  onTestCompletion?: () => void
  onRefreshModels?: () => void
  refreshingModels?: boolean
  className?: string
  defaultExpanded?: boolean
}

export function ProviderCard({
  provider,
  supportsReasoning = false,
  onChange,
  onTest,
  onTestCompletion,
  onRefreshModels,
  refreshingModels,
  className,
  defaultExpanded = false,
}: ProviderCardProps) {
  const [showApiKey, setShowApiKey] = React.useState(false)
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded || !!provider.apiKey)
  const availableModels = React.useMemo(
    () => normalizeModelIds(provider.availableModels),
    [provider.availableModels]
  )

  const copyToClipboard = React.useCallback((value: string) => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return
    void navigator.clipboard.writeText(value)
  }, [])

  const getStatusIcon = () => {
    switch (provider.testStatus) {
      case 'testing':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'success':
        return <Check className="h-4 w-4 text-green-500" />
      case 'error':
        return <X className="h-4 w-4 text-red-500" />
      default:
        return <TestTube className="h-4 w-4" />
    }
  }

  const getCompletionStatusIcon = () => {
    switch (provider.testCompletionStatus) {
      case 'testing':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'success':
        return <Check className="h-4 w-4 text-green-500" />
      case 'error':
        return <X className="h-4 w-4 text-red-500" />
      default:
        return <TestTube className="h-4 w-4" />
    }
  }

  return (
    <Card className={cn('w-full', className)}>
      <button
        type="button"
        className="flex w-full items-center justify-between px-6 py-4 text-left"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          <CardTitle className="text-base">{provider.name}</CardTitle>
          <Badge variant={provider.enabled ? 'default' : 'secondary'} className="rounded-none">
            {provider.enabled ? 'On' : 'Off'}
          </Badge>
          {provider.apiKey && provider.testStatus === 'success' && (
            <Check className="h-3.5 w-3.5 text-green-500" />
          )}
          {provider.apiKey && provider.testStatus === 'error' && (
            <X className="h-3.5 w-3.5 text-red-500" />
          )}
        </div>
        <div className="flex items-center gap-3">
          <Switch
            checked={provider.enabled}
            onCheckedChange={(checked) => {
              onChange({ enabled: checked })
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform duration-200',
              isExpanded && 'rotate-180'
            )}
          />
        </div>
      </button>

      {isExpanded && (
        <CardContent className="space-y-4 border-t border-border pt-4">
          <p className="-mt-1 mb-3 text-sm text-muted-foreground">{provider.description}</p>
          {/* API Key Input */}
          <div className="space-y-2">
            <Label htmlFor={`${provider.name}-api-key`} className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              API Key
            </Label>
            <div className="relative">
              <Input
                id={`${provider.name}-api-key`}
                type={showApiKey ? 'text' : 'password'}
                placeholder={`Enter your ${provider.name} API key`}
                value={provider.apiKey}
                onChange={(e) => onChange({ apiKey: e.target.value })}
                disabled={!provider.enabled}
                className="pr-20"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowApiKey(!showApiKey)}
                disabled={!provider.enabled}
              >
                {showApiKey ? 'Hide' : 'Show'}
              </Button>
            </div>
          </div>

          {/* Base URL Input */}
          <div className="space-y-2">
            <Label htmlFor={`${provider.name}-base-url`}>Base URL</Label>
            <Input
              id={`${provider.name}-base-url`}
              type="text"
              placeholder="https://llm.chutes.ai/v1"
              value={provider.baseUrl ?? ''}
              onChange={(e) => onChange({ baseUrl: e.target.value })}
              disabled={!provider.enabled}
            />
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Default Model</Label>
              {onRefreshModels && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRefreshModels}
                  disabled={!provider.enabled || !provider.apiKey || refreshingModels}
                >
                  {refreshingModels ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  <span className="ml-1.5 text-xs">Refresh</span>
                </Button>
              )}
            </div>
            <Select
              value={provider.defaultModel}
              onValueChange={(value) => onChange({ defaultModel: value })}
              disabled={!provider.enabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a model" />
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

          {/* Coding Plan Toggle - Only for Z.ai */}
          {provider.name === 'Z.ai' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor={`${provider.name}-coding-plan`}>Use Coding Plan</Label>
                  <p className="text-sm text-muted-foreground">
                    Use the Coding Plan endpoint for better coding assistance
                  </p>
                </div>
                <Switch
                  id={`${provider.name}-coding-plan`}
                  checked={provider.useCodingPlan ?? false}
                  onCheckedChange={(checked) => onChange({ useCodingPlan: checked })}
                  disabled={!provider.enabled}
                />
              </div>
            </div>
          )}

          {supportsReasoning && (
            <div className="space-y-3 border-t border-border pt-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor={`${provider.name}-reasoning-enabled`}>Reasoning</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable model reasoning/thinking when supported.
                  </p>
                </div>
                <Switch
                  id={`${provider.name}-reasoning-enabled`}
                  checked={provider.reasoningEnabled ?? false}
                  onCheckedChange={(checked) => onChange({ reasoningEnabled: checked })}
                  disabled={!provider.enabled}
                />
              </div>

              <div className="space-y-2">
                <Label>Reasoning Mode</Label>
                <Select
                  value={provider.reasoningMode ?? 'auto'}
                  onValueChange={(value) =>
                    onChange({ reasoningMode: value as 'auto' | 'low' | 'medium' | 'high' })
                  }
                  disabled={!provider.enabled || !(provider.reasoningEnabled ?? false)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reasoning mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${provider.name}-reasoning-budget`}>Reasoning Budget Tokens</Label>
                <Input
                  id={`${provider.name}-reasoning-budget`}
                  type="number"
                  min={0}
                  step={1000}
                  value={provider.reasoningBudget ?? 6000}
                  onChange={(e) => onChange({ reasoningBudget: Number(e.target.value) || 0 })}
                  disabled={!provider.enabled || !(provider.reasoningEnabled ?? false)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor={`${provider.name}-show-reasoning`}>Show Reasoning Panel</Label>
                  <p className="text-sm text-muted-foreground">
                    Display reasoning in the chat panel when available.
                  </p>
                </div>
                <Switch
                  id={`${provider.name}-show-reasoning`}
                  checked={provider.showReasoningPanel ?? true}
                  onCheckedChange={(checked) => onChange({ showReasoningPanel: checked })}
                  disabled={!provider.enabled || !(provider.reasoningEnabled ?? false)}
                />
              </div>
            </div>
          )}

          {/* Test Connection Button */}
          <Button
            variant="outline"
            onClick={onTest}
            disabled={!provider.enabled || !provider.apiKey || provider.testStatus === 'testing'}
            className="w-full"
          >
            {getStatusIcon()}
            <span className="ml-2">
              {provider.testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
            </span>
          </Button>

          {onTestCompletion && (
            <Button
              variant="outline"
              onClick={onTestCompletion}
              disabled={
                !provider.enabled || !provider.apiKey || provider.testCompletionStatus === 'testing'
              }
              className="w-full"
            >
              {getCompletionStatusIcon()}
              <span className="ml-2">
                {provider.testCompletionStatus === 'testing'
                  ? 'Testing completion...'
                  : 'Test Completion'}
              </span>
            </Button>
          )}

          {/* Status Message */}
          {provider.testStatus === 'success' && (
            <p className="flex items-center gap-1 text-sm text-green-600">
              <Check className="h-3 w-3" /> Connection successful
            </p>
          )}
          {provider.testStatus === 'error' && (
            <div className="space-y-1">
              <p className="flex items-center gap-1 text-sm text-red-600">
                <X className="h-3 w-3" /> Connection failed. Check your API key.
              </p>
              {provider.testStatusMessage && (
                <div className="flex items-start gap-2">
                  <p className="line-clamp-3 flex-1 font-mono text-xs text-red-700">
                    {provider.testStatusMessage}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-6 rounded-none px-2 font-mono text-xs"
                    onClick={() => copyToClipboard(provider.testStatusMessage!)}
                  >
                    Copy
                  </Button>
                </div>
              )}
            </div>
          )}
          {provider.testCompletionStatus === 'success' && (
            <p className="flex items-center gap-1 text-sm text-green-600">
              <Check className="h-3 w-3" /> Completion test succeeded
            </p>
          )}
          {provider.testCompletionStatus === 'error' && (
            <div className="space-y-1">
              <p className="flex items-center gap-1 text-sm text-red-600">
                <X className="h-3 w-3" /> Completion test failed. Verify model and endpoint.
              </p>
              {provider.testCompletionStatusMessage && (
                <div className="flex items-start gap-2">
                  <p className="line-clamp-4 flex-1 font-mono text-xs text-red-700">
                    {provider.testCompletionStatusMessage}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-6 rounded-none px-2 font-mono text-xs"
                    onClick={() => copyToClipboard(provider.testCompletionStatusMessage!)}
                  >
                    Copy
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
