'use client'

import { Brain, Sparkles, Zap, Bot } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Model {
  id: string
  name: string
  provider: string
  contextWindow: string
  description: string
  icon: React.ReactNode
}

const models: Model[] = [
  {
    id: 'claude-sonnet-4-5',
    name: 'Claude 4.5 Sonnet',
    provider: 'Anthropic',
    contextWindow: '1M',
    description: 'Best balance of performance',
    icon: <Brain className="h-4 w-4" />,
  },
  {
    id: 'claude-opus-4-6',
    name: 'Claude 4.6 Opus',
    provider: 'Anthropic',
    contextWindow: '1M',
    description: 'Most capable',
    icon: <Brain className="h-4 w-4" />,
  },
  {
    id: 'gpt-5.2',
    name: 'GPT-5.2',
    provider: 'OpenAI',
    contextWindow: '272K',
    description: 'Fast and reliable',
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    id: 'gemini-3.1-pro',
    name: 'Gemini 3.1 Pro',
    provider: 'Google',
    contextWindow: '1M',
    description: 'Large context window',
    icon: <Zap className="h-4 w-4" />,
  },
  {
    id: 'qwen3-coder',
    name: 'Qwen3 Coder',
    provider: 'OpenRouter',
    contextWindow: '200K',
    description: 'Free coding model',
    icon: <Bot className="h-4 w-4" />,
  },
]

interface ModelSelectorProps {
  value: string
  onChange: (modelId: string) => void
  disabled?: boolean
}

export function ModelSelector({ value, onChange, disabled }: ModelSelectorProps) {
  const selectedModel = models.find((m) => m.id === value)

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-8 w-[180px] rounded-none border-border text-xs">
        <div className="flex items-center gap-2">
          {selectedModel?.icon && (
            <span className="text-muted-foreground">{selectedModel.icon}</span>
          )}
          <SelectValue placeholder="Select model" />
        </div>
      </SelectTrigger>

      <SelectContent className="rounded-none">
        {models.map((model) => (
          <SelectItem key={model.id} value={model.id} className="rounded-none py-2">
            <div className="flex items-center gap-3">
              <div className="text-muted-foreground">{model.icon}</div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{model.name}</span>
                <span className="text-xs text-muted-foreground">
                  {model.provider} · {model.contextWindow} context
                </span>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
