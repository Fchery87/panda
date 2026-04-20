'use client'

import { useEffect, useMemo } from 'react'
import { Lightbulb, Code, Hammer, Bot, ChevronDown, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuShortcut,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { agents } from '@/lib/agent/harness'
import { CHAT_MODE_CONFIGS, type ChatMode } from '@/lib/agent/chat-modes'
import {
  getChatModeSurfacePresentation,
  getPrimaryChatModeSurfaceOptions,
} from '@/lib/chat/chat-mode-surface'

interface AgentSelectorProps {
  mode: ChatMode
  onModeChange: (mode: ChatMode) => void
  disabled?: boolean
  className?: string
}

const MODE_ICONS: Partial<Record<ChatMode, React.ReactNode>> = {
  ask: <HelpCircle className="h-3.5 w-3.5" />,
  plan: <Lightbulb className="h-3.5 w-3.5" />,
  code: <Code className="h-3.5 w-3.5" />,
  build: <Hammer className="h-3.5 w-3.5" />,
}

const PRIMARY_SHORTCUTS: Partial<Record<ChatMode, string>> = Object.fromEntries(
  (Object.entries(CHAT_MODE_CONFIGS) as Array<[ChatMode, (typeof CHAT_MODE_CONFIGS)[ChatMode]]>)
    .map(([mode, config]) => [mode, config.surface.primaryShortcut])
    .filter((entry): entry is [ChatMode, string] => typeof entry[1] === 'string')
) as Partial<Record<ChatMode, string>>

export function AgentSelector({ mode, onModeChange, disabled, className }: AgentSelectorProps) {
  const subagents = useMemo(() => agents.listSubagents(), [])
  const primaryOptions = useMemo(() => getPrimaryChatModeSurfaceOptions(), [])

  const currentPresentation = getChatModeSurfacePresentation(mode)
  const currentIcon = MODE_ICONS[mode] ?? <Bot className="h-3.5 w-3.5" />

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (disabled) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
        const num = parseInt(e.key)
        if (num >= 1 && num <= primaryOptions.length) {
          const option = primaryOptions[num - 1]
          if (option) {
            onModeChange(option.mode)
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [disabled, onModeChange, primaryOptions])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          className={cn(
            'transition-sharp group flex items-center gap-1.5 border border-border px-2.5 py-1',
            'font-mono text-xs tracking-wide text-muted-foreground',
            'hover:border-foreground/30 hover:text-foreground',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary',
            'data-[state=open]:border-primary data-[state=open]:text-foreground',
            'disabled:pointer-events-none disabled:opacity-50',
            className
          )}
        >
          <span className="flex items-center gap-1.5">
            {currentIcon}
            <span className="uppercase">{currentPresentation.label}</span>
          </span>
          <ChevronDown className="h-3 w-3 opacity-50 transition-transform group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="rounded-none border-border bg-background/95 backdrop-blur-sm"
      >
        <DropdownMenuLabel className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
          Modes
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={mode}
          onValueChange={(value) => onModeChange(value as ChatMode)}
        >
          {primaryOptions.map((option) => {
            const icon = MODE_ICONS[option.mode] ?? <Bot className="h-3.5 w-3.5" />
            const shortcut = PRIMARY_SHORTCUTS[option.mode]

            return (
              <DropdownMenuRadioItem
                key={option.mode}
                value={option.mode}
                className="rounded-none font-mono text-xs"
              >
                <span className="flex items-center gap-2">
                  {icon}
                  <span className="uppercase">{option.label}</span>
                </span>
                <span className="ml-2 text-muted-foreground">{option.description}</span>
                {shortcut && <DropdownMenuShortcut>{shortcut}</DropdownMenuShortcut>}
              </DropdownMenuRadioItem>
            )
          })}
        </DropdownMenuRadioGroup>

        {subagents.length > 0 && (
          <>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuLabel className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
              Subagents (use @mention)
            </DropdownMenuLabel>
            {subagents.slice(0, 5).map((agent) => (
              <div
                key={agent.name}
                className="flex items-center gap-2 px-2 py-1.5 font-mono text-xs text-muted-foreground"
              >
                <Bot className="h-3 w-3" />
                <span className="uppercase">{agent.name}</span>
                <span className="ml-auto truncate text-xs opacity-70">@{agent.name}</span>
              </div>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
export { AgentSelector as ModeSelector }
