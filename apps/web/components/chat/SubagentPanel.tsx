'use client'

import { Bot, Clock3 } from 'lucide-react'
import { deriveSubagentEntries } from './run-insights'
import type { ToolCallInfo } from './types'

interface SubagentPanelProps {
  toolCalls?: ToolCallInfo[]
}

export function SubagentPanel({ toolCalls = [] }: SubagentPanelProps) {
  const entries = deriveSubagentEntries(toolCalls)

  if (entries.length === 0) return null

  return (
    <div className="surface-2 border border-border p-3">
      <div className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-wide text-muted-foreground">
        <Bot className="h-3.5 w-3.5" />
        <span>Subagents</span>
      </div>
      <div className="space-y-2">
        {entries.map((entry) => (
          <div key={entry.id} className="border border-border bg-background p-2">
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-foreground">{entry.agent}</span>
              <span className="ml-auto uppercase text-muted-foreground">{entry.status}</span>
            </div>
            <p className="mt-1 line-clamp-2 font-mono text-xs text-muted-foreground">
              {entry.prompt}
            </p>
            {entry.output ? (
              <p className="mt-2 line-clamp-3 font-mono text-xs text-foreground">{entry.output}</p>
            ) : null}
            {typeof entry.durationMs === 'number' ? (
              <div className="mt-2 flex items-center gap-1 font-mono text-[10px] uppercase text-muted-foreground">
                <Clock3 className="h-3 w-3" />
                <span>{Math.max(1, Math.round(entry.durationMs / 1000))}s</span>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
