'use client'

import { useState } from 'react'
import { GitBranch, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deriveSnapshotEntries } from './run-insights'
import { GitDiffViewer } from './GitDiffViewer'
import { parseGitDiff } from '@/lib/chat/parseGitDiff'
import type { GitDiffFile } from '@/lib/chat/parseGitDiff'

interface SnapshotTimelineProps {
  events?: Array<{
    _id?: string
    type: string
    content?: string
    createdAt?: number
    snapshot?: {
      hash?: string
      step?: number
      files?: string[]
    }
  }>
}

export function SnapshotTimeline({ events = [] }: SnapshotTimelineProps) {
  const entries = deriveSnapshotEntries(events)
  const [activeDiffHash, setActiveDiffHash] = useState<string | null>(null)
  const [parsedDiff, setParsedDiff] = useState<GitDiffFile[]>([])
  const [isBusy, setIsBusy] = useState(false)

  if (entries.length === 0) return null

  const handleViewDiff = async (hash: string) => {
    setIsBusy(true)
    try {
      const response = await fetch('/api/git/diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: hash }),
      })
      const payload = (await response.json()) as { diff?: string; error?: string }
      setActiveDiffHash(hash)
      setParsedDiff(parseGitDiff(payload.diff ?? ''))
    } finally {
      setIsBusy(false)
    }
  }

  const handleRestore = async (hash: string) => {
    setIsBusy(true)
    try {
      await fetch('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore', hash }),
      })
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div
      className="surface-2 state-band shadow-sharp-sm border border-border p-3"
      data-state="idle"
    >
      <div className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        <GitBranch className="h-3.5 w-3.5" />
        <span>Snapshots</span>
      </div>
      <div className="space-y-2">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="shadow-sharp-sm border border-border bg-background/85 p-2.5"
          >
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{entry.label}</span>
              <span className="ml-auto shrink-0 text-muted-foreground">
                {entry.hash.slice(0, 8)}
              </span>
            </div>
            {entry.files.length > 0 ? (
              <p className="mt-1 line-clamp-2 font-mono text-[10px] text-muted-foreground">
                {entry.files.join(', ')}
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isBusy}
                onClick={() => void handleViewDiff(entry.hash)}
                className="h-6 rounded-none bg-background/80 px-2 font-mono text-[10px] uppercase tracking-[0.16em]"
              >
                View Diff
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isBusy}
                onClick={() => void handleRestore(entry.hash)}
                className="h-6 rounded-none bg-background/80 px-2 font-mono text-[10px] uppercase tracking-[0.16em]"
              >
                <RotateCcw className="mr-1 h-3 w-3" />
                Restore
              </Button>
            </div>
            {activeDiffHash === entry.hash ? (
              <div className="mt-2">
                <GitDiffViewer files={parsedDiff} />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
