'use client'

import { useEffect, useMemo } from 'react'
import { Lightbulb, Bot, ChevronDown, HelpCircle, Zap } from 'lucide-react'
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
import {
  getAgentAutonomyOptions,
  getPrimaryModeSurfaces,
  modeSelectionFromRuntimeMode,
  resolveRuntimeMode,
  type AutoModeSwitchPolicy,
  type ChatMode,
  type PrimaryMode,
} from '@/lib/agent/chat-modes'
import { useChatSessionStore } from '@/stores/chatSessionStore'
import { getChatModeSurfacePresentation } from '@/lib/chat/chat-mode-surface'

interface AgentSelectorProps {
  mode: ChatMode
  onModeChange: (mode: ChatMode) => void
  disabled?: boolean
  className?: string
}

const MODE_ICONS: Partial<Record<ChatMode, React.ReactNode>> = {
  ask: <HelpCircle className="h-3.5 w-3.5" />,
  plan: <Lightbulb className="h-3.5 w-3.5" />,
  code: <Bot className="h-3.5 w-3.5" />,
  build: <Zap className="h-3.5 w-3.5" />,
}

const AUTO_MODE_SWITCH_OPTIONS: Array<{
  id: AutoModeSwitchPolicy
  label: string
  description: string
}> = [
  {
    id: 'auto',
    label: 'Auto-switch',
    description: 'Switch automatically on high-confidence intent changes.',
  },
  {
    id: 'suggest',
    label: 'Suggest first',
    description: 'Ask before changing modes.',
  },
  {
    id: 'manual',
    label: 'Manual only',
    description: 'Never change modes automatically.',
  },
]

const PRIMARY_MODE_ICONS: Record<PrimaryMode, React.ReactNode> = {
  ask: <HelpCircle className="h-3.5 w-3.5" />,
  plan: <Lightbulb className="h-3.5 w-3.5" />,
  agent: <Bot className="h-3.5 w-3.5" />,
}

export function AgentSelector({ mode, onModeChange, disabled, className }: AgentSelectorProps) {
  const primaryOptions = useMemo(() => getPrimaryModeSurfaces(), [])
  const autonomyOptions = useMemo(() => getAgentAutonomyOptions(), [])
  const autoModeSwitchPolicy = useChatSessionStore((state) => state.autoModeSwitchPolicy)
  const setAutoModeSwitchPolicy = useChatSessionStore((state) => state.setAutoModeSwitchPolicy)

  const currentSelection = modeSelectionFromRuntimeMode(mode)
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
            onModeChange(
              resolveRuntimeMode({
                primaryMode: option.id,
                autonomy: option.defaultAutonomy,
              })
            )
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
        className="bg-background/95 border-border backdrop-blur-sm"
      >
        <DropdownMenuLabel className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
          Primary modes
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={currentSelection.primaryMode}
          onValueChange={(value) => {
            const primaryMode = value as PrimaryMode
            const selectedSurface = primaryOptions.find((option) => option.id === primaryMode)
            onModeChange(
              resolveRuntimeMode({
                primaryMode,
                autonomy: selectedSurface?.defaultAutonomy,
              })
            )
          }}
        >
          {primaryOptions.map((option) => {
            const icon = PRIMARY_MODE_ICONS[option.id]

            return (
              <DropdownMenuRadioItem
                key={option.id}
                value={option.id}
                className="font-mono text-xs"
              >
                <span className="flex items-center gap-2">
                  {icon}
                  <span className="uppercase">{option.label}</span>
                </span>
                <span className="ml-2 text-muted-foreground">{option.description}</span>
                {option.primaryShortcut && (
                  <DropdownMenuShortcut>{option.primaryShortcut}</DropdownMenuShortcut>
                )}
              </DropdownMenuRadioItem>
            )
          })}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuLabel className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
          Agent autonomy
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={mode}
          onValueChange={(value) => onModeChange(value as ChatMode)}
        >
          {autonomyOptions.map((option) => {
            const icon = MODE_ICONS[option.runtimeMode] ?? <Bot className="h-3.5 w-3.5" />
            return (
              <DropdownMenuRadioItem
                key={option.id}
                value={option.runtimeMode}
                className="font-mono text-xs"
              >
                <span className="flex items-center gap-2">
                  {icon}
                  <span className="uppercase">{option.label}</span>
                </span>
                <span className="ml-2 text-muted-foreground">{option.description}</span>
              </DropdownMenuRadioItem>
            )
          })}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuLabel className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
          Mode routing
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={autoModeSwitchPolicy}
          onValueChange={(value) => setAutoModeSwitchPolicy(value as AutoModeSwitchPolicy)}
        >
          {AUTO_MODE_SWITCH_OPTIONS.map((option) => (
            <DropdownMenuRadioItem
              key={option.id}
              value={option.id}
              className="font-mono text-xs"
            >
              <span className="uppercase">{option.label}</span>
              <span className="ml-2 text-muted-foreground">{option.description}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
