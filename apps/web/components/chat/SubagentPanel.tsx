'use client'

import { useState } from 'react'
import { Bot, ChevronDown, ChevronRight, Clock3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { deriveSubagentEntries } from './run-insights'
import type { ToolCallInfo } from './types'

interface SubagentPanelProps {
  toolCalls?: ToolCallInfo[]
}

function statusColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'bg-[hsl(var(--status-success))]'
    case 'running':
      return 'bg-primary animate-pulse'
    case 'error':
      return 'bg-[hsl(var(--status-error))]'
    default:
      return 'bg-muted-foreground/50'
  }
}

export function SubagentPanel({ toolCalls = [] }: SubagentPanelProps) {
  const entries = deriveSubagentEntries(toolCalls)

  if (entries.length === 0) return null

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        <Bot className="h-3 w-3" />
        <span>
          {entries.length} {entries.length === 1 ? 'subagent' : 'subagents'}
        </span>
      </div>
      <div className="space-y-px">
        {entries.map((entry) => (
          <SubagentLane key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  )
}

function SubagentLane({ entry }: { entry: ReturnType<typeof deriveSubagentEntries>[number] }) {
  const [expanded, setExpanded] = useState(false)
  const hasDetail = Boolean(entry.output || entry.error)
  const durationSec =
    typeof entry.durationMs === 'number' ? Math.max(1, Math.round(entry.durationMs / 1000)) : null

  return (
    <div
      className={cn(
        'flex items-start gap-2 border border-border bg-background/70 px-2 py-1.5',
        hasDetail && 'cursor-pointer hover:bg-background'
      )}
      onClick={hasDetail ? () => setExpanded((v) => !v) : undefined}
      role={hasDetail ? 'button' : undefined}
      tabIndex={hasDetail ? 0 : undefined}
      onKeyDown={
        hasDetail
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setExpanded((v) => !v)
              }
            }
          : undefined
      }
    >
      <span
        className={cn('mt-0.5 h-2 w-2 shrink-0 rounded-none', statusColor(entry.status))}
        aria-label={entry.status}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="min-w-0 flex-1 truncate text-foreground">{entry.agent}</span>
          {durationSec !== null ? (
            <span className="flex shrink-0 items-center gap-0.5 font-mono text-[10px] text-muted-foreground">
              <Clock3 className="h-2.5 w-2.5" />
              {durationSec}s
            </span>
          ) : null}
          {hasDetail ? (
            expanded ? (
              <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
            )
          ) : null}
        </div>
        <p className="mt-0.5 line-clamp-1 font-mono text-[11px] text-muted-foreground">
          {entry.prompt}
        </p>
        {expanded && hasDetail ? (
          <div className="mt-1.5 space-y-1 border-t border-border pt-1.5">
            {entry.output ? (
              <p className="line-clamp-4 font-mono text-xs text-foreground [overflow-wrap:anywhere]">
                {entry.output}
              </p>
            ) : null}
            {entry.error ? (
              <p className="font-mono text-xs text-destructive [overflow-wrap:anywhere]">
                {entry.error}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
