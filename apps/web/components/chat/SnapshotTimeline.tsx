'use client'

import { useState } from 'react'
import { GitBranch, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deriveSnapshotEntries } from './run-insights'

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
  const [diffText, setDiffText] = useState<string>('')
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
      setDiffText(payload.diff ?? payload.error ?? 'No diff available')
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
    <div className="surface-2 border border-border p-3">
      <div className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-wide text-muted-foreground">
        <GitBranch className="h-3.5 w-3.5" />
        <span>Snapshots</span>
      </div>
      <div className="space-y-2">
        {entries.map((entry) => (
          <div key={entry.id} className="border border-border bg-background p-2">
            <div className="flex items-center gap-2 font-mono text-xs">
              <span>{entry.label}</span>
              <span className="ml-auto text-muted-foreground">{entry.hash.slice(0, 8)}</span>
            </div>
            {entry.files.length > 0 ? (
              <p className="mt-1 line-clamp-2 font-mono text-[10px] text-muted-foreground">
                {entry.files.join(', ')}
              </p>
            ) : null}
            <div className="mt-2 flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isBusy}
                onClick={() => void handleViewDiff(entry.hash)}
                className="h-6 rounded-none px-2 font-mono text-[10px] uppercase"
              >
                View Diff
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isBusy}
                onClick={() => void handleRestore(entry.hash)}
                className="h-6 rounded-none px-2 font-mono text-[10px] uppercase"
              >
                <RotateCcw className="mr-1 h-3 w-3" />
                Restore
              </Button>
            </div>
            {activeDiffHash === entry.hash && diffText ? (
              <pre className="mt-2 overflow-x-auto border border-border bg-muted/20 p-2 font-mono text-[10px]">
                {diffText}
              </pre>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
