'use client'

import { useState } from 'react'
import { diff_match_patch } from 'diff-match-patch'
import { FileIcon, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type DiffType = 'added' | 'removed' | 'unchanged'

interface DiffLine {
  type: DiffType
  oldLineNumber?: number
  newLineNumber?: number
  content: string
}

interface DiffViewerProps {
  original: string
  modified: string
  fileName: string
  mode?: 'side-by-side' | 'unified'
  onApply?: () => void
  onReject?: () => void
}

export function DiffViewer({
  original,
  modified,
  fileName,
  mode = 'side-by-side',
  onApply,
  onReject,
}: DiffViewerProps) {
  const [viewMode, setViewMode] = useState<'side-by-side' | 'unified'>(mode)
  const diff = computeDiff(original, modified)

  const addedCount = diff.filter((l) => l.type === 'added').length
  const removedCount = diff.filter((l) => l.type === 'removed').length

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-none border border-border bg-background">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-muted/50 px-4 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <FileIcon className="h-4 w-4 text-muted-foreground" />
          <span className="truncate font-mono text-sm">{fileName}</span>
          <div className="ml-2 flex shrink-0 items-center gap-2">
            <span className="font-mono text-xs text-green-600">+{addedCount}</span>
            <span className="font-mono text-xs text-red-600">-{removedCount}</span>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center justify-end gap-2 lg:w-auto">
          <div className="flex items-center overflow-hidden rounded-none border border-border">
            <button
              onClick={() => setViewMode('side-by-side')}
              className={cn(
                'px-3 py-1 font-mono text-xs transition-colors',
                viewMode === 'side-by-side'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              )}
            >
              Split
            </button>
            <button
              onClick={() => setViewMode('unified')}
              className={cn(
                'border-l border-border px-3 py-1 font-mono text-xs transition-colors',
                viewMode === 'unified' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              )}
            >
              Unified
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="outline" size="sm" className="h-8 rounded-none" onClick={onReject}>
              <X className="mr-1 h-3.5 w-3.5" />
              Reject
            </Button>
            <Button size="sm" className="h-8 rounded-none" onClick={onApply}>
              <Check className="mr-1 h-3.5 w-3.5" />
              Apply
            </Button>
          </div>
        </div>
      </div>

      {/* Diff Content */}
      <div className="min-h-0 min-w-0 flex-1 overflow-auto font-mono text-xs">
        {viewMode === 'side-by-side' ? <SideBySideView diff={diff} /> : <UnifiedView diff={diff} />}
      </div>
    </div>
  )
}

function SideBySideView({ diff }: { diff: DiffLine[] }) {
  return (
    <div className="grid min-w-[44rem] grid-cols-[minmax(22rem,1fr)_minmax(22rem,1fr)]">
      {/* Original */}
      <div className="min-w-0 border-r border-border">
        <div className="sticky top-0 border-b border-border bg-muted/80 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
          Original
        </div>
        <div className="py-1">
          {diff.map((line, i) => (
            <div
              key={`old-${i}`}
              className={cn(
                'flex px-2 py-0.5 leading-5',
                line.type === 'removed' && 'bg-red-500/10 dark:bg-red-500/20',
                line.type === 'unchanged' && 'text-muted-foreground'
              )}
            >
              <span className="w-10 shrink-0 select-none text-right text-muted-foreground/50">
                {line.oldLineNumber || ' '}
              </span>
              <span className="ml-4 min-w-0 overflow-x-auto whitespace-pre">
                {line.type === 'added' ? '' : line.content}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Modified */}
      <div className="min-w-0">
        <div className="sticky top-0 border-b border-border bg-muted/80 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
          Modified
        </div>
        <div className="py-1">
          {diff.map((line, i) => (
            <div
              key={`new-${i}`}
              className={cn(
                'flex px-2 py-0.5 leading-5',
                line.type === 'added' && 'bg-green-500/10 dark:bg-green-500/20',
                line.type === 'unchanged' && 'text-muted-foreground'
              )}
            >
              <span className="w-10 shrink-0 select-none text-right text-muted-foreground/50">
                {line.newLineNumber || ' '}
              </span>
              <span className="ml-4 min-w-0 overflow-x-auto whitespace-pre">
                {line.type === 'removed' ? '' : line.content}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function UnifiedView({ diff }: { diff: DiffLine[] }) {
  return (
    <div className="min-w-[38rem]">
      <div className="sticky top-0 flex border-b border-border bg-muted/80 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
        <span className="w-10">Old</span>
        <span className="w-10">New</span>
        <span className="ml-2">Content</span>
      </div>

      <div className="py-1">
        {diff.map((line, i) => (
          <div
            key={`unified-${i}`}
            className={cn(
              'flex px-2 py-0.5 leading-5',
              line.type === 'added' && 'bg-green-500/10 dark:bg-green-500/20',
              line.type === 'removed' && 'bg-red-500/10 dark:bg-red-500/20'
            )}
          >
            <span className="w-10 select-none text-right text-muted-foreground/50">
              {line.oldLineNumber || ' '}
            </span>
            <span className="w-10 select-none text-right text-muted-foreground/50">
              {line.newLineNumber || ' '}
            </span>
            <span
              className={cn(
                'ml-4 min-w-0 overflow-x-auto whitespace-pre',
                line.type === 'added' && 'text-green-700 dark:text-green-300',
                line.type === 'removed' && 'text-red-700 dark:text-red-300'
              )}
            >
              {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
              {line.content}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function computeDiff(original: string, modified: string): DiffLine[] {
  const dmp = new diff_match_patch()
  const diffs = dmp.diff_main(original, modified)
  dmp.diff_cleanupSemantic(diffs)

  const lines: DiffLine[] = []
  let oldLineNum = 1
  let newLineNum = 1

  for (const [op, text] of diffs) {
    const textLines = text.split('\n')

    // Remove last empty element if text ends with newline
    if (textLines[textLines.length - 1] === '') {
      textLines.pop()
    }

    for (const line of textLines) {
      if (op === 0) {
        // Equal
        lines.push({
          type: 'unchanged',
          oldLineNumber: oldLineNum++,
          newLineNumber: newLineNum++,
          content: line,
        })
      } else if (op === -1) {
        // Deleted
        lines.push({
          type: 'removed',
          oldLineNumber: oldLineNum++,
          content: line,
        })
      } else if (op === 1) {
        // Inserted
        lines.push({
          type: 'added',
          newLineNumber: newLineNum++,
          content: line,
        })
      }
    }
  }

  return lines
}
