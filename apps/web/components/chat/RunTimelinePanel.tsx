'use client'

import { useState } from 'react'
import { useQuery } from 'convex/react'
import type { Id } from '@convex/_generated/dataModel'
import { api } from '@convex/_generated/api'
import { ChevronDown, ChevronRight, Wrench, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function RunTimelinePanel({ chatId }: { chatId: Id<'chats'> | null | undefined }) {
  const [open, setOpen] = useState(false)
  const events = useQuery(api.agentRuns.listEventsByChat, chatId ? { chatId, limit: 60 } : 'skip')

  const toolEventCount = (events || []).filter((e) => e.type === 'tool_call').length

  return (
    <div className="surface-2 border-b border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted/30"
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Run Timeline
        </span>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground/70">
          {events ? `${events.length} events` : 'loading'}
          {toolEventCount > 0 ? ` • ${toolEventCount} tools` : ''}
        </span>
      </button>

      {open && (
        <div className="max-h-48 overflow-auto border-t border-border px-3 py-2">
          {!events ? (
            <div className="font-mono text-xs text-muted-foreground">Loading timeline...</div>
          ) : events.length === 0 ? (
            <div className="font-mono text-xs text-muted-foreground">No run events yet.</div>
          ) : (
            <div className="space-y-1">
              {events.map((event) => {
                const isError = event.type === 'error' || event.status === 'failed'
                const isTool = event.type === 'tool_call' || event.type === 'tool_result'
                const isWorking = event.status === 'thinking' || event.status === 'running'
                return (
                  <div
                    key={event._id}
                    className={cn(
                      'flex items-center gap-2 border border-border bg-background/60 px-2 py-1 font-mono text-[10px]',
                      isError && 'border-destructive/30 text-destructive'
                    )}
                  >
                    {isError ? (
                      <XCircle className="h-3 w-3" />
                    ) : isTool ? (
                      <Wrench className="h-3 w-3" />
                    ) : isWorking ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3 w-3" />
                    )}
                    <span className="truncate">{event.toolName || event.type}</span>
                    <span className="ml-auto truncate text-muted-foreground">
                      {event.status || event.content || event.error || ''}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
