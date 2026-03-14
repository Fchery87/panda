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
import { Badge } from '@/components/ui/badge'
import { Sparkles } from 'lucide-react'

interface EnhancementLLMConfigProps {
  // Current settings
  enhancementProvider?: string | null
  enhancementModel?: string | null

  // Callbacks
  onUpdate: (config: { enhancementProvider: string; enhancementModel: string }) => void

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

export function EnhancementLLMConfig({
  enhancementProvider,
  enhancementModel,
  onUpdate,
  availableProviders,
}: EnhancementLLMConfigProps) {
  // Default to openai/gpt-4o-mini if not set
  const currentProvider = enhancementProvider || 'openai'
  const currentModel = enhancementModel || 'gpt-4o-mini'

  const selectedProvider = availableProviders[currentProvider]
  const availableModels = selectedProvider?.availableModels || []

  const handleProviderChange = (value: string) => {
    const defaultModel = availableProviders[value]?.availableModels[0] || 'gpt-4o-mini'
    onUpdate({
      enhancementProvider: value,
      enhancementModel: defaultModel,
    })
  }

  const handleModelChange = (value: string) => {
    onUpdate({
      enhancementProvider: currentProvider,
      enhancementModel: value,
    })
  }

  return (
    <Card className="rounded-none border-l-4 border-l-amber-500">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-base">Prompt Enhancement LLM</CardTitle>
          </div>
          <Badge variant="outline" className="rounded-none font-mono text-xs">
            Admin Only
          </Badge>
        </div>
        <CardDescription>
          Configure the LLM used for the ✨ Enhance Prompt feature. This should be a lightweight,
          fast model for cost efficiency.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Provider Selection */}
        <div className="space-y-3">
          <Label htmlFor="enhancement-provider" className="font-mono text-sm">
            Provider
          </Label>
          <Select value={currentProvider} onValueChange={handleProviderChange}>
            <SelectTrigger id="enhancement-provider" className="rounded-none">
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
          <p className="text-xs text-muted-foreground">
            Recommended: OpenAI for reliability and speed
          </p>
        </div>

        {/* Model Selection */}
        <div className="space-y-3">
          <Label htmlFor="enhancement-model" className="font-mono text-sm">
            Model
          </Label>
          <Select
            value={currentModel}
            onValueChange={handleModelChange}
            disabled={availableModels.length === 0}
          >
            <SelectTrigger id="enhancement-model" className="rounded-none">
              <SelectValue
                placeholder={
                  availableModels.length === 0 ? 'Select a provider first' : 'Select a model...'
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
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>
              <strong>Recommended for enhancement:</strong> Lightweight, fast models like
              gpt-4o-mini, Claude Haiku, or Llama 3.1 8B. These provide good prompt rewriting at low
              cost and latency.
            </p>
            <p className="text-amber-500">
              Note: Avoid expensive reasoning models (Opus, o1, etc.) for prompt enhancement.
            </p>
          </div>
        </div>

        {/* Current Configuration Summary */}
        <div className="rounded-none border border-border bg-muted/30 p-4">
          <p className="mb-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Current Configuration
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Provider</Label>
              <p className="font-medium">
                {availableProviders[currentProvider]?.name || currentProvider}
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Model</Label>
              <p className="font-mono text-sm font-medium">{currentModel}</p>
            </div>
          </div>
        </div>

        {/* Info Note */}
        <div className="text-xs text-muted-foreground">
          <p className="mb-1 font-mono uppercase tracking-wide">Note:</p>
          <p>
            This configuration only affects the prompt enhancement feature. The main chat LLM is
            configured separately. Changes take effect immediately for all users.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
