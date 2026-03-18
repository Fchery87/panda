// apps/web/components/sidebar/SidebarGitPanel.tsx
'use client'

import { useEffect, useState } from 'react'
import type { Id } from '@convex/_generated/dataModel'
import {
  Check,
  ChevronDown,
  ChevronRight,
  GitBranch,
  GitCommitHorizontal,
  Minus,
  Plus,
  RefreshCw,
  Undo2,
} from 'lucide-react'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useGit } from '@/hooks/useGit'

interface SidebarGitPanelProps {
  projectId: Id<'projects'>
}

export function SidebarGitPanel({ projectId }: SidebarGitPanelProps) {
  const { status, log, isLoading, error, refreshStatus, refreshLog, stage, unstage, commit } =
    useGit()

  const [commitMessage, setCommitMessage] = useState('')
  const [showLog, setShowLog] = useState(false)
  const [stagedExpanded, setStagedExpanded] = useState(true)
  const [unstagedExpanded, setUnstagedExpanded] = useState(true)
  const [untrackedExpanded, setUntrackedExpanded] = useState(true)

  // Fetch status on mount
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

  const totalChanges =
    (status?.staged.length ?? 0) + (status?.unstaged.length ?? 0) + (status?.untracked.length ?? 0)

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-mono text-xs text-foreground">{status?.branch ?? '...'}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0"
          onClick={() => {
            refreshStatus()
            refreshLog(10)
          }}
          disabled={isLoading}
          title="Refresh"
        >
          <RefreshCw className={cn('h-3 w-3', isLoading && 'animate-spin')} />
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="border-b border-destructive/30 bg-destructive/10 px-3 py-1.5 font-mono text-[10px] text-destructive">
          {error}
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="p-1">
          {/* Staged Changes */}
          {(status?.staged.length ?? 0) > 0 && (
            <FileSection
              title="Staged Changes"
              count={status!.staged.length}
              expanded={stagedExpanded}
              onToggle={() => setStagedExpanded((v) => !v)}
              files={status!.staged}
              actionIcon={<Minus className="h-3 w-3" />}
              actionTitle="Unstage"
              onAction={handleUnstageFile}
              statusColor="text-success"
            />
          )}

          {/* Unstaged Changes */}
          {(status?.unstaged.length ?? 0) > 0 && (
            <FileSection
              title="Changes"
              count={status!.unstaged.length}
              expanded={unstagedExpanded}
              onToggle={() => setUnstagedExpanded((v) => !v)}
              files={status!.unstaged}
              actionIcon={<Plus className="h-3 w-3" />}
              actionTitle="Stage"
              onAction={handleStageFile}
              statusColor="text-warning"
            />
          )}

          {/* Untracked */}
          {(status?.untracked.length ?? 0) > 0 && (
            <FileSection
              title="Untracked"
              count={status!.untracked.length}
              expanded={untrackedExpanded}
              onToggle={() => setUntrackedExpanded((v) => !v)}
              files={status!.untracked}
              actionIcon={<Plus className="h-3 w-3" />}
              actionTitle="Stage"
              onAction={handleStageFile}
              statusColor="text-muted-foreground"
            />
          )}

          {/* Empty state */}
          {totalChanges === 0 && !isLoading && (
            <div className="px-3 py-6 text-center font-mono text-xs text-muted-foreground">
              No changes
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Commit area */}
      {(status?.staged.length ?? 0) > 0 && (
        <div className="border-t border-border p-2">
          <textarea
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder="Commit message..."
            className="bg-surface-0 mb-1.5 w-full resize-none border border-border px-2 py-1.5 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
              className="h-6 flex-1 gap-1 rounded-none border border-border font-mono text-[10px] uppercase tracking-widest"
              onClick={handleCommit}
              disabled={!commitMessage.trim()}
            >
              <GitCommitHorizontal className="h-3 w-3" />
              Commit
            </Button>
          </div>
        </div>
      )}

      {/* Stage All button when there are unstaged changes */}
      {totalChanges > 0 && (status?.staged.length ?? 0) === 0 && (
        <div className="border-t border-border p-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-full gap-1 rounded-none border border-border font-mono text-[10px] uppercase tracking-widest"
            onClick={handleStageAll}
          >
            <Plus className="h-3 w-3" />
            Stage All
          </Button>
        </div>
      )}

      {/* Log toggle */}
      <div className="border-t border-border">
        <button
          type="button"
          className="flex w-full items-center gap-1 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
          onClick={() => {
            setShowLog((v) => !v)
            if (!showLog && log.length === 0) refreshLog(10)
          }}
        >
          {showLog ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          Recent Commits
        </button>
        {showLog && (
          <ScrollArea className="max-h-40">
            <div className="px-1 pb-1">
              {log.map((entry) => (
                <div key={entry.hash} className="flex items-start gap-2 px-2 py-1.5">
                  <GitCommitHorizontal className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
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
  actionIcon,
  actionTitle,
  onAction,
  statusColor,
}: {
  title: string
  count: number
  expanded: boolean
  onToggle: () => void
  files: string[]
  actionIcon: React.ReactNode
  actionTitle: string
  onAction: (path: string) => void
  statusColor: string
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-1 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
      >
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {title} ({count})
      </button>
      {expanded &&
        files.map((file) => (
          <div key={file} className="hover:bg-surface-2 group flex items-center gap-2 px-3 py-1">
            <span
              className={cn(
                'h-1.5 w-1.5 shrink-0 rounded-full',
                statusColor.replace('text-', 'bg-')
              )}
            />
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">
              {file}
            </span>
            <button
              type="button"
              onClick={() => onAction(file)}
              className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
              title={actionTitle}
            >
              {actionIcon}
            </button>
          </div>
        ))}
    </div>
  )
}
