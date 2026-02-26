'use client'

import * as SelectPrimitive from '@radix-ui/react-select'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Brain, Sparkles, Zap, Bot, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AvailableModel {
  id: string
  name: string
  provider: string
  providerKey: string
}

interface RenderModel {
  id: string
  name: string
  provider: string
  icon: React.ReactNode
}

const FALLBACK_MODELS: RenderModel[] = [
  {
    id: 'claude-sonnet-4-5',
    name: 'Claude 4.5 Sonnet',
    provider: 'Anthropic',
    icon: <Brain className="h-3.5 w-3.5" />,
  },
  {
    id: 'claude-opus-4-6',
    name: 'Claude 4.6 Opus',
    provider: 'Anthropic',
    icon: <Brain className="h-3.5 w-3.5" />,
  },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', icon: <Sparkles className="h-3.5 w-3.5" /> },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'Google',
    icon: <Zap className="h-3.5 w-3.5" />,
  },
  {
    id: 'qwen/qwen3-coder:free',
    name: 'Qwen3 Coder',
    provider: 'OpenRouter',
    icon: <Bot className="h-3.5 w-3.5" />,
  },
]

const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  anthropic: <Brain className="h-3.5 w-3.5" />,
  openai: <Sparkles className="h-3.5 w-3.5" />,
  openrouter: <Bot className="h-3.5 w-3.5" />,
  together: <Bot className="h-3.5 w-3.5" />,
  zai: <Zap className="h-3.5 w-3.5" />,
  chutes: <Bot className="h-3.5 w-3.5" />,
  deepseek: <Brain className="h-3.5 w-3.5" />,
  groq: <Zap className="h-3.5 w-3.5" />,
  fireworks: <Zap className="h-3.5 w-3.5" />,
}

interface ModelSelectorProps {
  value: string
  onChange: (modelId: string) => void
  disabled?: boolean
  availableModels?: AvailableModel[]
}

export function ModelSelector({ value, onChange, disabled, availableModels }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showTopFade, setShowTopFade] = useState(false)
  const [showBottomFade, setShowBottomFade] = useState(false)
  const viewportRef = useRef<HTMLDivElement | null>(null)

  const renderModels: RenderModel[] =
    availableModels && availableModels.length > 0
      ? availableModels.map((m) => ({
          id: m.id,
          name: m.name,
          provider: m.provider,
          icon: PROVIDER_ICONS[m.providerKey] ?? <Bot className="h-3.5 w-3.5" />,
        }))
      : FALLBACK_MODELS

  const updateFadeVisibility = useCallback(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const hasOverflow = viewport.scrollHeight - viewport.clientHeight > 1
    if (!hasOverflow) {
      setShowTopFade(false)
      setShowBottomFade(false)
      return
    }

    setShowTopFade(viewport.scrollTop > 1)
    setShowBottomFade(viewport.scrollTop + viewport.clientHeight < viewport.scrollHeight - 1)
  }, [])

  useEffect(() => {
    if (!isOpen) {
      setShowTopFade(false)
      setShowBottomFade(false)
      return
    }

    const frame = window.requestAnimationFrame(updateFadeVisibility)
    window.addEventListener('resize', updateFadeVisibility)

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', updateFadeVisibility)
    }
  }, [isOpen, renderModels.length, updateFadeVisibility])

  return (
    <SelectPrimitive.Root
      value={value}
      onValueChange={onChange}
      onOpenChange={setIsOpen}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        className={cn(
          'flex h-8 w-[160px] items-center justify-between gap-1.5',
          'rounded-none border border-border bg-background px-2 py-1',
          'font-mono text-xs text-foreground',
          'hover:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          '[&>span]:line-clamp-1'
        )}
      >
        {/* SelectValue renders only the ItemText content (model name) into the trigger */}
        <SelectPrimitive.Value placeholder="Select model" />
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          align="end"
          sideOffset={4}
          collisionPadding={8}
          className={cn(
            'relative z-50 min-w-[220px] max-w-[calc(100vw-1rem)] overflow-hidden',
            'rounded-none border border-border bg-popover text-popover-foreground shadow-md',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
            'data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1'
          )}
        >
          <SelectPrimitive.ScrollUpButton className="flex h-5 items-center justify-center border-b border-border bg-popover text-muted-foreground">
            <ChevronUp className="h-3.5 w-3.5" />
          </SelectPrimitive.ScrollUpButton>
          <div className="relative">
            <SelectPrimitive.Viewport
              ref={viewportRef}
              onScroll={updateFadeVisibility}
              className="max-h-[min(18rem,50vh)] p-1"
            >
              {renderModels.map((model) => (
                <SelectPrimitive.Item
                  key={model.id}
                  value={model.id}
                  className={cn(
                    'relative flex w-full min-w-0 cursor-default select-none items-center gap-2',
                    'rounded-none py-2 pl-7 pr-3 text-sm outline-none',
                    'focus:bg-accent focus:text-accent-foreground',
                    'data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
                  )}
                >
                  {/* Check mark for selected item */}
                  <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    <SelectPrimitive.ItemIndicator>
                      <Check className="h-3.5 w-3.5" />
                    </SelectPrimitive.ItemIndicator>
                  </span>

                  {/* ItemText: ONLY this is shown in the trigger via SelectValue */}
                  <span className="min-w-0 flex-1 truncate">
                    <SelectPrimitive.ItemText>{model.name}</SelectPrimitive.ItemText>
                  </span>

                  {/* Visual-only: icon + provider — visible in dropdown only */}
                  <span className="ml-auto hidden shrink-0 items-center gap-1.5 text-muted-foreground sm:flex">
                    {model.icon}
                    <span className="text-xs">{model.provider}</span>
                  </span>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
            {showTopFade && (
              <div className="pointer-events-none absolute inset-x-0 top-0 h-3 bg-gradient-to-b from-popover to-transparent" />
            )}
            {showBottomFade && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3 bg-gradient-to-t from-popover to-transparent" />
            )}
          </div>
          <SelectPrimitive.ScrollDownButton className="flex h-5 items-center justify-center border-t border-border bg-popover text-muted-foreground">
            <ChevronDown className="h-3.5 w-3.5" />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
