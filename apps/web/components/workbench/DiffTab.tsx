'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Diff as IconDiff, Check as IconCheck, X as IconX, ChevronDown as IconChevronDown, ChevronRight as IconChevronRight, FileCode as IconFile, Undo2 as IconRevert } from 'lucide-react'
import { cn } from '@/lib/utils'

export type DiffHunkAction = 'accept' | 'reject' | 'revert'
export type FileReviewStatus = 'pending' | 'accepted' | 'rejected'

export interface DiffHunk {
  id: string
  startLine: number
  endLine: number
  added: string[]
  removed: string[]
  context: string[]
  status: 'pending' | 'accepted' | 'rejected'
}

export interface DiffFileEntry {
  path: string
  status: 'added' | 'modified' | 'deleted' | 'renamed'
  hunks: DiffHunk[]
  reviewStatus: FileReviewStatus
  oldPath?: string
}

interface DiffTabProps {
  files?: DiffFileEntry[]
  agentLabel?: string
  onAcceptHunk?: (fileIndex: number, hunkId: string) => void
  onRejectHunk?: (fileIndex: number, hunkId: string) => void
  onAcceptFile?: (fileIndex: number) => void
  onRejectFile?: (fileIndex: number) => void
  onAcceptAll?: () => void
  onRejectAll?: () => void
  onRevertFile?: (fileIndex: number) => void
  pendingDiffCount?: number
}

const FILE_STATUS_LABELS: Record<DiffFileEntry['status'], string> = {
  added: 'A',
  modified: 'M',
  deleted: 'D',
  renamed: 'R',
}

const FILE_STATUS_COLORS: Record<DiffFileEntry['status'], string> = {
  added: 'text-[hsl(var(--diff-added-fg))]',
  modified: 'text-[hsl(var(--status-warning))]',
  deleted: 'text-destructive',
  renamed: 'text-[hsl(var(--status-info))]',
}

export function DiffTab({
  files = [],
  agentLabel = 'Agent',
  onAcceptHunk,
  onRejectHunk,
  onAcceptFile,
  onRejectFile,
  onAcceptAll,
  onRejectAll,
  onRevertFile,
  pendingDiffCount = 0,
}: DiffTabProps) {
  const [selectedFileIndex, setSelectedFileIndex] = useState(0)
  const [expandedHunks, setExpandedHunks] = useState<Set<string>>(new Set())

  const selectedFile = files[selectedFileIndex] ?? null

  const pendingFiles = useMemo(
    () => files.filter((f) => f.reviewStatus === 'pending').length,
    [files]
  )

  const toggleHunk = (hunkId: string) => {
    setExpandedHunks((prev) => {
      const next = new Set(prev)
      if (next.has(hunkId)) {
        next.delete(hunkId)
      } else {
        next.add(hunkId)
      }
      return next
    })
  }

  // Empty state
  if (files.length === 0) {
    return (
      <div className="dot-grid flex h-full flex-col items-center justify-center gap-4">
        <div className="surface-1 shadow-sharp-md max-w-md border border-border px-6 py-8 text-center">
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center border border-border bg-muted/50">
            <IconDiff className="h-5 w-5 text-muted-foreground" />
          </div>
          <h2 className="font-mono text-sm font-medium text-foreground">Diff View</h2>
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            {pendingDiffCount > 0
              ? `${pendingDiffCount} files with pending changes. Review and accept or reject agent-generated edits.`
              : 'No pending diffs. Agent-generated file changes will appear here for review.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Trust status header */}
      <div className="review-banner">
        <div className="flex items-center gap-2">
          <IconDiff className="h-3.5 w-3.5 text-[hsl(var(--status-warning))]" />
          <span className="text-foreground">
            {pendingFiles} file{pendingFiles !== 1 ? 's' : ''} changed by {agentLabel}
          </span>
          <span className="badge-md" data-status="review">
            Review Required
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 rounded-none font-mono text-[10px] uppercase tracking-widest text-destructive hover:text-destructive"
            onClick={onRejectAll}
          >
            <IconX className="h-3 w-3" />
            Reject All
          </Button>
          <Button
            size="sm"
            className="h-6 gap-1 rounded-none bg-primary px-3 font-mono text-[10px] uppercase tracking-widest text-primary-foreground hover:bg-primary/90"
            onClick={onAcceptAll}
          >
            <IconCheck className="h-3 w-3" />
            Accept All
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* File sidebar */}
        <div className="surface-1 flex w-52 shrink-0 flex-col border-r border-border">
          <div className="border-b border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Changed Files
          </div>
          <ScrollArea className="flex-1">
            <div className="p-1">
              {files.map((file, idx) => (
                <button
                  key={file.path}
                  type="button"
                  onClick={() => setSelectedFileIndex(idx)}
                  className={cn(
                    'flex w-full items-center gap-2 px-2 py-1.5 text-left transition-colors duration-100',
                    idx === selectedFileIndex
                      ? 'surface-0 border border-border text-foreground'
                      : 'border border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  <span
                    className={cn(
                      'shrink-0 font-mono text-[10px] font-bold',
                      FILE_STATUS_COLORS[file.status]
                    )}
                  >
                    {FILE_STATUS_LABELS[file.status]}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-mono text-xs">
                    {file.path.split('/').pop()}
                  </span>
                  {file.reviewStatus !== 'pending' && (
                    <span
                      className={cn(
                        'h-2 w-2 shrink-0',
                        file.reviewStatus === 'accepted'
                          ? 'bg-[hsl(var(--status-success))]'
                          : 'bg-destructive'
                      )}
                    />
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Diff content */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {selectedFile && (
            <>
              {/* File header */}
              <div className="surface-1 flex items-center justify-between border-b border-border px-4 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <IconFile className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate font-mono text-xs text-foreground">
                    {selectedFile.path}
                  </span>
                  <span
                    className={cn(
                      'shrink-0 font-mono text-[10px] font-bold',
                      FILE_STATUS_COLORS[selectedFile.status]
                    )}
                  >
                    {selectedFile.status}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {onRevertFile && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 gap-1 rounded-none font-mono text-[10px] uppercase tracking-widest"
                      onClick={() => onRevertFile(selectedFileIndex)}
                    >
                      <IconRevert className="h-3 w-3" />
                      Revert
                    </Button>
                  )}
                  {onRejectFile && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 gap-1 rounded-none font-mono text-[10px] uppercase tracking-widest text-destructive hover:text-destructive"
                      onClick={() => onRejectFile(selectedFileIndex)}
                    >
                      <IconX className="h-3 w-3" />
                      Reject
                    </Button>
                  )}
                  {onAcceptFile && (
                    <Button
                      size="sm"
                      className="h-6 gap-1 rounded-none bg-primary px-3 font-mono text-[10px] uppercase tracking-widest text-primary-foreground hover:bg-primary/90"
                      onClick={() => onAcceptFile(selectedFileIndex)}
                    >
                      <IconCheck className="h-3 w-3" />
                      Accept
                    </Button>
                  )}
                </div>
              </div>

              {/* Hunks */}
              <ScrollArea className="flex-1">
                <div className="p-2">
                  <AnimatePresence>
                    {selectedFile.hunks.map((hunk) => {
                      const isExpanded =
                        expandedHunks.has(hunk.id) || selectedFile.hunks.length <= 3

                      return (
                        <motion.div
                          key={hunk.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="mb-2 border border-border"
                        >
                          {/* Hunk header */}
                          <div className="surface-1 flex items-center justify-between px-3 py-1.5">
                            <button
                              type="button"
                              className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground hover:text-foreground"
                              onClick={() => toggleHunk(hunk.id)}
                            >
                              {isExpanded ? (
                                <IconChevronDown className="h-3 w-3" />
                              ) : (
                                <IconChevronRight className="h-3 w-3" />
                              )}
                              Lines {hunk.startLine}–{hunk.endLine}
                              <span className="text-[hsl(var(--diff-added-fg))]">
                                +{hunk.added.length}
                              </span>
                              <span className="text-destructive">−{hunk.removed.length}</span>
                            </button>
                            <div className="flex items-center gap-1">
                              {hunk.status === 'pending' ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 rounded-none p-0 text-destructive hover:text-destructive"
                                    onClick={() => onRejectHunk?.(selectedFileIndex, hunk.id)}
                                    title="Reject hunk"
                                  >
                                    <IconX className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 rounded-none p-0 text-[hsl(var(--status-success))] hover:text-[hsl(var(--status-success))]"
                                    onClick={() => onAcceptHunk?.(selectedFileIndex, hunk.id)}
                                    title="Accept hunk"
                                  >
                                    <IconCheck className="h-3 w-3" />
                                  </Button>
                                </>
                              ) : (
                                <span
                                  className="badge-md"
                                  data-status={hunk.status === 'accepted' ? 'complete' : 'failed'}
                                >
                                  {hunk.status}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Hunk content */}
                          {isExpanded && (
                            <div className="overflow-x-auto font-mono text-xs">
                              {hunk.context.length > 0 && (
                                <div className="surface-0 px-3 py-0.5 text-muted-foreground/60">
                                  {hunk.context.map((line, i) => (
                                    <div key={`ctx-${i}`} className="leading-5">
                                      {'  '}
                                      {line}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {hunk.removed.map((line, i) => (
                                <div
                                  key={`rem-${i}`}
                                  className="bg-diff-removed text-diff-removed px-3 leading-5"
                                >
                                  − {line}
                                </div>
                              ))}
                              {hunk.added.map((line, i) => (
                                <div
                                  key={`add-${i}`}
                                  className="bg-diff-added text-diff-added px-3 leading-5"
                                >
                                  + {line}
                                </div>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
