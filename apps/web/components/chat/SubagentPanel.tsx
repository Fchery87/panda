'use client'

import { useState } from 'react'
import { Bot, ChevronDown, ChevronRight, Clock as Clock3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { deriveSubagentEntries, type SubagentEntry } from './run-insights'
import type { ToolCallInfo } from './types'

export interface PersistedPatchProposalPreview {
  kind: 'patch-proposal'
  title: string
  summary?: string
  files: string[]
  patch?: string
}

export interface PersistedSubagentRunRow {
  id: string
  name: string
  status: 'running' | 'completed' | 'failed' | 'stopped'
  summary: string
  lastActivity?: string
  durationMs?: number
  error?: string
  artifactCount?: number
  patchProposalCount?: number
  patchProposals?: PersistedPatchProposalPreview[]
  errorCategory?: 'registry' | 'policy' | 'isolation' | 'runtime' | 'persistence' | 'unknown'
}

interface SubagentPanelProps {
  toolCalls?: ToolCallInfo[]
  persistedSubagents?: PersistedSubagentRunRow[]
}

type PanelSubagentEntry = SubagentEntry & {
  source?: 'live' | 'persisted'
  lastActivity?: string
  artifactCount?: number
  patchProposalCount?: number
  patchProposals?: PersistedPatchProposalPreview[]
  errorCategory?: 'registry' | 'policy' | 'isolation' | 'runtime' | 'persistence' | 'unknown'
}

function statusColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'bg-[oklch(var(--status-success))]'
    case 'running':
      return 'bg-primary animate-pulse'
    case 'error':
    case 'failed':
      return 'bg-[oklch(var(--status-error))]'
    case 'stopped':
      return 'bg-muted-foreground'
    default:
      return 'bg-muted-foreground/50'
  }
}

export function SubagentPanel({ toolCalls = [], persistedSubagents = [] }: SubagentPanelProps) {
  const liveEntries = deriveSubagentEntries(toolCalls)
  const persistedEntries: PanelSubagentEntry[] = persistedSubagents.map((run) => ({
    id: run.id,
    agent: run.name,
    status: run.status === 'failed' ? 'error' : run.status,
    prompt: run.summary,
    output: run.status === 'completed' ? run.summary : undefined,
    error: run.error,
    durationMs: run.durationMs,
    artifactCount: run.artifactCount,
    patchProposalCount: run.patchProposalCount ?? run.patchProposals?.length,
    patchProposals: run.patchProposals,
    errorCategory: run.errorCategory,
    lastActivity: run.lastActivity,
    source: 'persisted' as const,
  }))
  const liveIds = new Set(liveEntries.map((entry) => entry.id))
  const entries: PanelSubagentEntry[] = [
    ...persistedEntries.filter((entry) => !liveIds.has(entry.id)),
    ...liveEntries.map((entry): PanelSubagentEntry => ({ ...entry, source: 'live' as const })),
  ]

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

function SubagentLane({ entry }: { entry: PanelSubagentEntry }) {
  const hasPatchProposals = Boolean(entry.patchProposals?.length)
  const [expanded, setExpanded] = useState(hasPatchProposals)
  const hasDetail = Boolean(entry.output || entry.error || hasPatchProposals)
  const durationSec =
    typeof entry.durationMs === 'number' ? Math.max(1, Math.round(entry.durationMs / 1000)) : null

  return (
    <div
      className={cn(
        'bg-background/70 flex items-start gap-2 border border-border px-2 py-1.5',
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
        className={cn('mt-0.5 h-2 w-2 shrink-0', statusColor(entry.status))}
        aria-label={entry.status}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="min-w-0 flex-1 truncate text-foreground">{entry.agent}</span>
          {'source' in entry && entry.source === 'persisted' ? (
            <span className="shrink-0 bg-surface-2 px-1 font-mono text-[10px] text-muted-foreground">
              persisted
            </span>
          ) : null}
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
        {'lastActivity' in entry && entry.lastActivity ? (
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
            active {entry.lastActivity}
            {'artifactCount' in entry && entry.artifactCount
              ? ` · ${entry.artifactCount} artifacts`
              : ''}
            {'patchProposalCount' in entry && entry.patchProposalCount
              ? ` · ${entry.patchProposalCount} patch proposals`
              : ''}
          </p>
        ) : null}
        {entry.errorCategory ? (
          <p className="mt-0.5 font-mono text-[10px] text-destructive">
            Failure category: {entry.errorCategory}
          </p>
        ) : null}
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
            {entry.patchProposals?.length ? (
              <div className="space-y-1.5">
                <div className="border-warning/40 bg-warning/5 border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Patch proposal — parent review required. Preview only; not applied automatically.
                </div>
                {entry.patchProposals.map((proposal) => (
                  <div
                    key={`${proposal.title}-${proposal.files.join(',')}`}
                    className="bg-background/80 border border-border p-2"
                  >
                    <div className="font-mono text-[11px] font-medium text-foreground">
                      {proposal.title}
                    </div>
                    {proposal.summary ? (
                      <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                        {proposal.summary}
                      </p>
                    ) : null}
                    {proposal.files.length > 0 ? (
                      <p className="mt-1 line-clamp-2 font-mono text-[10px] text-muted-foreground">
                        Files: {proposal.files.join(', ')}
                      </p>
                    ) : null}
                    {proposal.patch ? (
                      <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap border border-border bg-surface-2 p-2 font-mono text-[10px] text-muted-foreground">
                        {proposal.patch.slice(0, 1200)}
                      </pre>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
