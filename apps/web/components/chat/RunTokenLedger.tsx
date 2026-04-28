'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TokenUsageInfo, PersistedRunEventSummaryInfo } from './types'

interface RunTokenLedgerProps {
  runEvents?: PersistedRunEventSummaryInfo[]
  isStreaming?: boolean
}

function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

export function aggregateTokenUsage(
  events?: PersistedRunEventSummaryInfo[]
): TokenUsageInfo | null {
  if (!events || events.length === 0) return null

  let promptTokens = 0
  let completionTokens = 0
  let totalTokens = 0
  let reasoningTokens = 0
  let cacheRead = 0
  let cacheWrite = 0
  let hasAny = false

  for (const event of events) {
    const u = event.usage
    if (!u) continue
    hasAny = true
    promptTokens += u.promptTokens ?? 0
    completionTokens += u.completionTokens ?? 0
    totalTokens += u.totalTokens ?? 0
    reasoningTokens += u.reasoningTokens ?? 0
    cacheRead += u.cacheRead ?? 0
    cacheWrite += u.cacheWrite ?? 0
  }

  if (!hasAny) return null

  return {
    promptTokens,
    completionTokens,
    totalTokens: totalTokens || promptTokens + completionTokens,
    reasoningTokens: reasoningTokens || undefined,
    cacheRead: cacheRead || undefined,
    cacheWrite: cacheWrite || undefined,
  }
}

export function RunTokenLedger({ runEvents, isStreaming = false }: RunTokenLedgerProps) {
  const [expanded, setExpanded] = useState(false)
  const usage = aggregateTokenUsage(runEvents)

  if (!usage) return null

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          'flex w-full items-center gap-2 border border-border bg-background/70 px-2 py-1.5',
          'font-mono text-[11px] text-muted-foreground transition-colors hover:bg-background/90'
        )}
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0" />
        )}
        <span className="uppercase tracking-wider">Tokens</span>
        <span className="ml-auto flex items-center gap-2 text-[10px]">
          <span>{formatTokenCount(usage.promptTokens)} in</span>
          <span className="text-border">/</span>
          <span>{formatTokenCount(usage.completionTokens)} out</span>
          {(usage.cacheRead ?? 0) > 0 ? (
            <>
              <span className="text-border">/</span>
              <span>{formatTokenCount(usage.cacheRead ?? 0)} cached</span>
            </>
          ) : null}
          {isStreaming ? <span className="animate-pulse text-primary">•</span> : null}
        </span>
      </button>

      {expanded ? (
        <div className="grid grid-cols-3 gap-px border border-t-0 border-border bg-border">
          <LedgerCell label="Prompt" value={formatTokenCount(usage.promptTokens)} />
          <LedgerCell label="Completion" value={formatTokenCount(usage.completionTokens)} />
          <LedgerCell label="Total" value={formatTokenCount(usage.totalTokens)} />
          {usage.reasoningTokens ? (
            <LedgerCell label="Reasoning" value={formatTokenCount(usage.reasoningTokens)} />
          ) : null}
          {usage.cacheRead ? (
            <LedgerCell label="Cache read" value={formatTokenCount(usage.cacheRead)} />
          ) : null}
          {usage.cacheWrite ? (
            <LedgerCell label="Cache write" value={formatTokenCount(usage.cacheWrite)} />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function LedgerCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background/80 px-2 py-1.5">
      <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 font-mono text-xs text-foreground">{value}</div>
    </div>
  )
}
