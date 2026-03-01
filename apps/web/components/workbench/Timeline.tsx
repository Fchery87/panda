'use client'

import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { History, GitCommit, CheckCircle2, XCircle, Zap, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { selectTimelineEvents, type TimelineEventRecord } from './timeline-utils'

interface TimelineProps {
  chatId?: Id<'chats'>
}

export function Timeline({ chatId }: TimelineProps) {
  const events = useQuery(api.agentRuns.listEventsByChat, chatId ? { chatId, limit: 100 } : 'skip')

  if (!chatId) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <History className="mb-4 h-8 w-8 opacity-20" />
        <p className="font-mono text-sm">Start a chat to view the timeline.</p>
      </div>
    )
  }

  if (events === undefined) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
          <span className="h-2 w-2 animate-ping rounded-full bg-primary" />
          Loading timeline...
        </div>
      </div>
    )
  }

  const timeline = selectTimelineEvents(events as TimelineEventRecord[])

  if (timeline.items.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <History className="mb-4 h-8 w-8 opacity-20" />
        <p className="text-balance font-mono text-sm">
          No timeline events yet. The timeline will populate as the agent makes progress.
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border p-4">
        <History className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          {timeline.title}
        </h3>
      </div>
      <div className="scrollbar-thin flex-1 overflow-auto p-4">
        <div className="relative space-y-4 before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px before:border-l before:border-border/50 md:before:mx-auto md:before:translate-x-0">
          {timeline.items.map((item, index) => {
            const { event, isError, isSnapshot, isSpec, specStatus, label, fileCount } = item
            const isLatest = index === timeline.items.length - 1

            return (
              <div
                key={event._id}
                className="group relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse"
              >
                {/* Connector Line Dot */}
                <div
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-background shadow',
                    isError
                      ? 'border-destructive/50 text-destructive'
                      : isSpec
                        ? specStatus === 'verified'
                          ? 'border-success/50 text-success'
                          : specStatus === 'failed'
                            ? 'border-destructive/50 text-destructive'
                            : 'border-primary/50 text-primary'
                        : isSnapshot
                          ? 'border-primary/50 text-primary'
                          : 'border-border text-muted-foreground',
                    isLatest && !isError && 'ring-2 ring-primary/20'
                  )}
                >
                  {isError ? (
                    <XCircle className="h-3 w-3" />
                  ) : isSpec ? (
                    specStatus === 'verified' ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : specStatus === 'failed' ? (
                      <XCircle className="h-3 w-3" />
                    ) : (
                      <Zap className="h-3 w-3" />
                    )
                  ) : isSnapshot ? (
                    <GitCommit className="h-3 w-3" />
                  ) : (
                    <CheckCircle2 className="h-3 w-3" />
                  )}
                </div>

                {/* Event Card */}
                <div className="w-[calc(100%-2rem)] md:w-[calc(50%-2rem)]">
                  <div className="bg-surface-1 hover:bg-surface-2 flex flex-col gap-1 rounded-none border border-border p-3 transition-colors">
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-mono text-xs font-medium">{label}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {new Date(event.createdAt).toLocaleTimeString()}
                      </span>
                    </div>

                    {event.content && (
                      <p className="line-clamp-2 text-xs text-muted-foreground">{event.content}</p>
                    )}

                    {isSpec && (
                      <div className="mt-2 flex items-center gap-2">
                        <span
                          className={cn(
                            'flex items-center gap-1 border px-1.5 py-0.5 font-mono text-[10px]',
                            specStatus === 'verified' &&
                              'border-success/50 bg-success/5 text-success',
                            specStatus === 'failed' &&
                              'border-destructive/50 bg-destructive/5 text-destructive',
                            specStatus === 'generated' &&
                              'border-primary/50 bg-primary/5 text-primary'
                          )}
                        >
                          <FileText className="h-3 w-3" />
                          Spec {specStatus}
                        </span>
                      </div>
                    )}

                    {fileCount > 0 && (
                      <div className="mt-2 font-mono text-[10px] text-muted-foreground">
                        {fileCount} file(s) modified
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
