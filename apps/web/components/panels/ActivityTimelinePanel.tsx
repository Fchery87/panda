'use client'

import type { ForgeActivityEntry } from '@/lib/forge/activity'

interface ActivityTimelinePanelProps {
  entries: ForgeActivityEntry[]
}

export function ActivityTimelinePanel({ entries }: ActivityTimelinePanelProps) {
  if (entries.length === 0) {
    return (
      <div className="surface-1 flex h-full flex-col border-l border-border">
        <div className="border-b border-border px-3 py-2">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Activity
          </span>
        </div>
        <div className="flex flex-1 items-center justify-center px-4 py-6">
          <div className="shadow-sharp-sm max-w-sm border border-dashed border-border bg-background px-4 py-5 text-center">
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              No activity yet
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="surface-1 flex h-full flex-col border-l border-border">
      <div className="border-b border-border px-3 py-2">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Activity
        </span>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-auto px-3 py-3">
        {entries.map((entry) => (
          <section
            key={`${entry.kind}-${entry.createdAt}-${entry.summary}`}
            className="shadow-sharp-sm border border-border bg-background/80 px-3 py-3"
          >
            <div className="flex flex-wrap gap-2">
              <span className="shadow-sharp-sm border border-border bg-background/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                {entry.kind}
              </span>
              {entry.role ? (
                <span className="shadow-sharp-sm border border-border bg-background/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  {entry.role}
                </span>
              ) : null}
            </div>
            <p className="mt-3 text-sm leading-6 text-foreground">{entry.summary}</p>
          </section>
        ))}
      </div>
    </div>
  )
}
