'use client'

import { useEffect, useState } from 'react'
import type { Id } from '@convex/_generated/dataModel'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import {
  IconGit,
  IconRefresh,
  IconChevronDown,
  IconChevronRight,
  IconCheck,
} from '@/components/ui/icons'
import { cn } from '@/lib/utils'
import { useGit } from '@/hooks/useGit'

interface SourceControlPaneProps {
  projectId: Id<'projects'>
}

export function SourceControlPane({ projectId: _projectId }: SourceControlPaneProps) {
  const { status, log, isLoading, error, refreshStatus, refreshLog, stage, unstage, commit } =
    useGit()

  const [commitMessage, setCommitMessage] = useState('')
  const [showLog, setShowLog] = useState(false)
  const [stagedExpanded, setStagedExpanded] = useState(true)
  const [unstagedExpanded, setUnstagedExpanded] = useState(true)
  const [untrackedExpanded, setUntrackedExpanded] = useState(true)

  useEffect(() => {
    refreshStatus()
  }, [refreshStatus])

  const handleStageFile = async (path: string) => {
    await stage([path])
  }

  const handleUnstageFile = async (path: string) => {
    await unstage([path])
  }

  const handleStageAll = async () => {
    const allPaths = [...(status?.unstaged ?? []), ...(status?.untracked ?? [])]
    if (allPaths.length > 0) await stage(allPaths)
  }

  const handleCommit = async () => {
    if (!commitMessage.trim()) return
    await commit(commitMessage.trim())
    setCommitMessage('')
  }

  const stagedCount = status?.staged.length ?? 0
  const unstagedCount = status?.unstaged.length ?? 0
  const untrackedCount = status?.untracked.length ?? 0
  const totalChanges = stagedCount + unstagedCount + untrackedCount

  return (
    <div className="flex h-full flex-col">
      {/* Branch header with quick actions */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <IconGit className="h-3.5 w-3.5 text-primary" weight="duotone" />
          <span className="font-mono text-xs font-medium text-foreground">
            {status?.branch ?? '...'}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 rounded-none p-0"
            onClick={() => {
              refreshStatus()
              refreshLog(10)
            }}
            disabled={isLoading}
            title="Refresh"
          >
            <IconRefresh className={cn('h-3 w-3', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
        {totalChanges > 0 ? (
          <>
            {stagedCount > 0 && (
              <span className="flex items-center gap-1 font-mono text-[10px] text-[hsl(var(--diff-added-fg))]">
                <span className="h-1.5 w-1.5 bg-[hsl(var(--status-success))]" />
                {stagedCount} staged
              </span>
            )}
            {unstagedCount > 0 && (
              <span className="flex items-center gap-1 font-mono text-[10px] text-[hsl(var(--status-warning))]">
                <span className="h-1.5 w-1.5 bg-[hsl(var(--status-warning))]" />
                {unstagedCount} changed
              </span>
            )}
            {untrackedCount > 0 && (
              <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                <span className="h-1.5 w-1.5 bg-muted-foreground/30" />
                {untrackedCount} untracked
              </span>
            )}
          </>
        ) : (
          <span className="font-mono text-[10px] text-muted-foreground">
            {isLoading ? 'Loading...' : 'Clean working tree'}
          </span>
        )}
      </div>

      {error && (
        <div className="border-b border-destructive/30 bg-destructive/10 px-3 py-1.5 font-mono text-[10px] text-destructive">
          {error}
        </div>
      )}

      {/* File sections */}
      <ScrollArea className="flex-1">
        <div className="p-1">
          {stagedCount > 0 && (
            <FileSection
              title="Staged"
              count={stagedCount}
              expanded={stagedExpanded}
              onToggle={() => setStagedExpanded((v) => !v)}
              files={status!.staged}
              actionLabel="Unstage"
              onAction={handleUnstageFile}
              dotColor="bg-[hsl(var(--status-success))]"
            />
          )}

          {unstagedCount > 0 && (
            <FileSection
              title="Changes"
              count={unstagedCount}
              expanded={unstagedExpanded}
              onToggle={() => setUnstagedExpanded((v) => !v)}
              files={status!.unstaged}
              actionLabel="Stage"
              onAction={handleStageFile}
              dotColor="bg-[hsl(var(--status-warning))]"
            />
          )}

          {untrackedCount > 0 && (
            <FileSection
              title="Untracked"
              count={untrackedCount}
              expanded={untrackedExpanded}
              onToggle={() => setUntrackedExpanded((v) => !v)}
              files={status!.untracked}
              actionLabel="Stage"
              onAction={handleStageFile}
              dotColor="bg-muted-foreground/30"
            />
          )}

          {totalChanges === 0 && !isLoading && (
            <div className="px-3 py-6 text-center font-mono text-xs text-muted-foreground">
              No changes
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quick actions bar */}
      {totalChanges > 0 && stagedCount === 0 && (
        <div className="border-t border-border p-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-full gap-1.5 rounded-none border border-border font-mono text-[10px] uppercase tracking-widest"
            onClick={handleStageAll}
          >
            Stage All ({unstagedCount + untrackedCount})
          </Button>
        </div>
      )}

      {/* Commit section */}
      {stagedCount > 0 && (
        <div className="border-t border-border p-2">
          <textarea
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder="Commit message..."
            className="surface-0 mb-1.5 w-full resize-none border border-border px-2 py-1.5 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                handleCommit()
              }
            }}
          />
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 flex-1 gap-1.5 rounded-none border border-border font-mono text-[10px] uppercase tracking-widest"
              onClick={handleCommit}
              disabled={!commitMessage.trim()}
            >
              <IconCheck className="h-3 w-3" />
              Commit
            </Button>
          </div>
        </div>
      )}

      {/* Recent commits */}
      <div className="border-t border-border">
        <button
          type="button"
          className="flex w-full items-center gap-1 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
          onClick={() => {
            setShowLog((v) => !v)
            if (!showLog && log.length === 0) refreshLog(10)
          }}
        >
          {showLog ? (
            <IconChevronDown className="h-3 w-3" />
          ) : (
            <IconChevronRight className="h-3 w-3" />
          )}
          Recent Commits
        </button>
        {showLog && (
          <ScrollArea className="max-h-40">
            <div className="px-1 pb-1">
              {log.map((entry) => (
                <div key={entry.hash} className="flex items-start gap-2 px-2 py-1.5">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 bg-muted-foreground/40" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-xs text-foreground">
                      {entry.message}
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground">
                      {entry.hash.slice(0, 7)} · {entry.author}
                    </div>
                  </div>
                </div>
              ))}
              {log.length === 0 && (
                <div className="px-2 py-2 font-mono text-[10px] text-muted-foreground">
                  No commits yet
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  )
}

// --- File section sub-component ---

function FileSection({
  title,
  count,
  expanded,
  onToggle,
  files,
  actionLabel,
  onAction,
  dotColor,
}: {
  title: string
  count: number
  expanded: boolean
  onToggle: () => void
  files: string[]
  actionLabel: string
  onAction: (path: string) => void
  dotColor: string
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-1 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
      >
        {expanded ? (
          <IconChevronDown className="h-3 w-3" />
        ) : (
          <IconChevronRight className="h-3 w-3" />
        )}
        {title} ({count})
      </button>
      {expanded &&
        files.map((file) => (
          <div key={file} className="hover:bg-surface-2 group flex items-center gap-2 px-3 py-1">
            <span className={cn('h-1.5 w-1.5 shrink-0', dotColor)} />
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">
              {file}
            </span>
            <button
              type="button"
              onClick={() => onAction(file)}
              className="shrink-0 font-mono text-[9px] uppercase tracking-widest text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
              title={actionLabel}
            >
              {actionLabel}
            </button>
          </div>
        ))}
    </div>
  )
}
