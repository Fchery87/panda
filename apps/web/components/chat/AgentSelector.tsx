'use client'

import { useEffect, useMemo } from 'react'
import { HelpCircle, Lightbulb, Code, Hammer, Bot, ChevronDown } from 'lucide-react'
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
import { agents, type AgentConfig } from '@/lib/agent/harness'
import type { ChatMode } from '@/lib/agent/prompt-library'

interface AgentSelectorProps {
  mode: ChatMode
  onModeChange: (mode: ChatMode) => void
  disabled?: boolean
  className?: string
}

const AGENT_ICONS: Record<string, React.ReactNode> = {
  ask: <HelpCircle className="h-3.5 w-3.5" />,
  architect: <Lightbulb className="h-3.5 w-3.5" />,
  plan: <Lightbulb className="h-3.5 w-3.5" />,
  code: <Code className="h-3.5 w-3.5" />,
  build: <Hammer className="h-3.5 w-3.5" />,
}

const AGENT_SHORTCUTS: Record<string, string> = {
  ask: '1',
  architect: '2',
  code: '3',
  build: '4',
}

function mapAgentToMode(agentName: string): ChatMode {
  if (agentName === 'plan') return 'architect'
  return agentName as ChatMode
}

function mapModeToAgent(mode: ChatMode): string {
  if (mode === 'architect') return 'plan'
  return mode
}

const MODE_DESCRIPTIONS: Record<ChatMode, string> = {
  ask: 'Read-only Q&A',
  architect: 'Planning & architecture',
  code: 'Implementation',
  build: 'Full implementation',
}

export function AgentSelector({ mode, onModeChange, disabled, className }: AgentSelectorProps) {
  const primaryAgents = useMemo(() => agents.listPrimary(), [])
  const subagents = useMemo(() => agents.listSubagents(), [])

  const currentAgentName = mapModeToAgent(mode)
  const currentAgent = primaryAgents.find((a) => a.name === currentAgentName) ?? primaryAgents[0]
  const currentIcon = AGENT_ICONS[currentAgent.name] ?? <Bot className="h-3.5 w-3.5" />
  const currentDescription = MODE_DESCRIPTIONS[mode] ?? currentAgent.description ?? ''

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (disabled) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (!e.altKey && !e.ctrlKey && !e.metaKey) {
        const num = parseInt(e.key)
        if (num >= 1 && num <= primaryAgents.length) {
          const agent = primaryAgents[num - 1]
          if (agent) {
            onModeChange(mapAgentToMode(agent.name))
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [disabled, primaryAgents, onModeChange])

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
            <span className="uppercase">
              {currentAgent.name === 'plan' ? 'Plan' : currentAgent.name}
            </span>
          </span>
          <ChevronDown className="h-3 w-3 opacity-50 transition-transform group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="rounded-none border-border bg-background/95 backdrop-blur-sm"
      >
        <DropdownMenuLabel className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
          Primary Agents
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={currentAgentName}
          onValueChange={(value) => onModeChange(mapAgentToMode(value))}
        >
          {primaryAgents.map((agent) => {
            const icon = AGENT_ICONS[agent.name] ?? <Bot className="h-3.5 w-3.5" />
            const description =
              MODE_DESCRIPTIONS[mapAgentToMode(agent.name)] ?? agent.description ?? ''
            const shortcut = AGENT_SHORTCUTS[agent.name]

            return (
              <DropdownMenuRadioItem
                key={agent.name}
                value={agent.name}
                className="rounded-none font-mono text-xs"
              >
                <span className="flex items-center gap-2">
                  {icon}
                  <span className="uppercase">{agent.name === 'plan' ? 'Plan' : agent.name}</span>
                </span>
                <span className="ml-2 text-muted-foreground">{description}</span>
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

export const MODE_OPTIONS = [
  {
    value: 'ask' as ChatMode,
    label: 'Ask',
    icon: AGENT_ICONS.ask,
    description: 'Read-only Q&A',
    shortcut: '1',
  },
  {
    value: 'architect' as ChatMode,
    label: 'Plan',
    icon: AGENT_ICONS.architect,
    description: 'Planning & architecture',
    shortcut: '2',
  },
  {
    value: 'code' as ChatMode,
    label: 'Code',
    icon: AGENT_ICONS.code,
    description: 'Implementation',
    shortcut: '3',
  },
  {
    value: 'build' as ChatMode,
    label: 'Build',
    icon: AGENT_ICONS.build,
    description: 'Full implementation',
    shortcut: '4',
  },
]

export { AgentSelector as ModeSelector }
