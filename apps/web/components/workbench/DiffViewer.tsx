'use client'

import React from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { computeSideBySideDiff, DiffLine } from '@/lib/diff'
import { Minus, Plus } from 'lucide-react'

interface DiffViewerProps {
  oldContent: string
  newContent: string
  oldLabel?: string
  newLabel?: string
  className?: string
}

/**
 * DiffViewer Component
 * Displays a side-by-side diff between two versions of content
 * Features:
 * - Side-by-side view with synchronized scrolling
 * - Color coding (green for added, red for removed)
 * - Line numbers for both versions
 * - Scrollable for large files
 * - Dark mode support
 */
export function DiffViewer({
  oldContent,
  newContent,
  oldLabel = 'Previous',
  newLabel = 'Current',
  className,
}: DiffViewerProps) {
  const { left, right } = React.useMemo(
    () => computeSideBySideDiff(oldContent, newContent),
    [oldContent, newContent]
  )

  return (
    <div
      className={cn(
        'flex h-full w-full flex-col overflow-hidden rounded-md border border-border bg-background',
        className
      )}
    >
      {/* Header */}
      <div className="flex border-b border-border bg-muted/50">
        <div className="flex-1 border-r border-border px-4 py-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Minus className="h-4 w-4 text-red-500" />
            <span>{oldLabel}</span>
          </div>
        </div>
        <div className="flex-1 px-4 py-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Plus className="h-4 w-4 text-emerald-500" />
            <span>{newLabel}</span>
          </div>
        </div>
      </div>

      {/* Diff Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Side (Old) */}
        <ScrollArea className="flex-1 border-r border-border">
          <div className="min-w-full">
            {left.map((line, index) => (
              <DiffLineRow key={`left-${index}`} line={line} side="left" />
            ))}
          </div>
        </ScrollArea>

        {/* Right Side (New) */}
        <ScrollArea className="flex-1">
          <div className="min-w-full">
            {right.map((line, index) => (
              <DiffLineRow key={`right-${index}`} line={line} side="right" />
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Stats Footer */}
      <DiffStats left={left} right={right} />
    </div>
  )
}

/**
 * Individual diff line row component
 */
function DiffLineRow({ line, side }: { line: DiffLine; side: 'left' | 'right' }) {
  const isRemoved = line.type === 'removed'
  const isAdded = line.type === 'added'
  const isSpacer = line.oldLine === null && line.newLine === null && line.content === ''

  // Background colors based on change type
  const bgColorClass = isRemoved
    ? 'bg-red-500/10 hover:bg-red-500/20'
    : isAdded
      ? 'bg-emerald-500/10 hover:bg-emerald-500/20'
      : 'hover:bg-muted/50'

  // Border indicators
  const borderClass = isRemoved
    ? 'border-l-2 border-l-red-500'
    : isAdded
      ? 'border-l-2 border-l-emerald-500'
      : 'border-l-2 border-l-transparent'

  // Line number to display
  const lineNumber = side === 'left' ? line.oldLine : line.newLine

  return (
    <div
      className={cn(
        'flex font-mono text-sm leading-6',
        bgColorClass,
        borderClass,
        isSpacer && 'opacity-0'
      )}
    >
      {/* Line Number */}
      <div className="w-12 flex-shrink-0 select-none border-r border-border bg-muted/30 py-0.5 pr-3 text-right text-muted-foreground/60">
        {lineNumber ?? ''}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-x-auto whitespace-pre px-3 py-0.5">
        {isSpacer ? (
          <span className="text-muted-foreground/30">···</span>
        ) : (
          <span className={cn('text-foreground', !line.content && 'text-muted-foreground/30')}>
            {line.content || ' '}
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * Diff statistics footer component
 */
function DiffStats({ left, right }: { left: DiffLine[]; right: DiffLine[] }) {
  const removedCount = left.filter((l) => l.type === 'removed').length
  const addedCount = right.filter((r) => r.type === 'added').length
  const unchangedCount = left.filter((l) => l.type === 'unchanged' && l.content !== '').length

  return (
    <div className="flex items-center gap-4 border-t border-border bg-muted/50 px-4 py-2 text-xs text-muted-foreground">
      <span className="flex items-center gap-1">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        {addedCount} additions
      </span>
      <span className="flex items-center gap-1">
        <span className="h-2 w-2 rounded-full bg-red-500" />
        {removedCount} deletions
      </span>
      <span className="flex items-center gap-1">
        <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
        {unchangedCount} unchanged
      </span>
    </div>
  )
}

export { computeSideBySideDiff }
export type { DiffLine }
