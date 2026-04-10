'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

export type AgentEventType =
  | 'file_read'
  | 'file_write'
  | 'command_run'
  | 'test_run'
  | 'error'
  | 'waiting'
  | 'complete'
  | 'tool_call'

export interface AgentEvent {
  id: string
  type: AgentEventType
  summary: string
  detail?: string
  timestamp: number
}

interface AgentEventsPanelProps {
  events?: AgentEvent[]
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const TYPE_LABELS: Record<AgentEventType, string> = {
  file_read: 'READ',
  file_write: 'WRITE',
  command_run: 'CMD',
  test_run: 'TEST',
  error: 'ERR',
  waiting: 'WAIT',
  complete: 'DONE',
  tool_call: 'TOOL',
}

const TYPE_COLORS: Record<AgentEventType, string> = {
  file_read: 'text-muted-foreground',
  file_write: 'text-[hsl(var(--diff-added-fg))]',
  command_run: 'text-primary',
  test_run: 'text-[hsl(var(--status-info))]',
  error: 'text-destructive',
  waiting: 'text-[hsl(var(--status-warning))]',
  complete: 'text-[hsl(var(--status-success))]',
  tool_call: 'text-muted-foreground',
}

export function AgentEventsPanel({ events = [] }: AgentEventsPanelProps) {
  if (events.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="font-mono text-xs text-muted-foreground">No agent events yet</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-2 font-mono text-xs">
        {events.map((event) => (
          <div key={event.id} className="flex items-start gap-2 py-1">
            <span className="w-16 shrink-0 text-[10px] tabular-nums text-muted-foreground/70">
              {formatTime(event.timestamp)}
            </span>
            <span
              className={cn(
                'w-10 shrink-0 text-[10px] font-semibold uppercase',
                TYPE_COLORS[event.type]
              )}
            >
              {TYPE_LABELS[event.type]}
            </span>
            <span className="min-w-0 flex-1 text-foreground">{event.summary}</span>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
