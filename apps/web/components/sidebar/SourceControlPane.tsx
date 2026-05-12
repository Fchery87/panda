'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import type { Id } from '@convex/_generated/dataModel'
import { api } from '@convex/_generated/api'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import {
  GitBranch as IconGit,
  RefreshCw as IconRefresh,
  ChevronDown as IconChevronDown,
  ChevronRight as IconChevronRight,
  Check as IconCheck,
  ArrowUp as IconArrowUp,
  Undo2 as IconRevert,
  CloudUpload as IconCloud,
  ChevronsUpDown as IconChevronUpDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGit } from '@/hooks/useGit'
import { buildSourceControlReviewLoop } from './source-control-review-loop'

interface SourceControlPaneProps {
  projectId: Id<'projects'>
}

export function SourceControlPane({ projectId: _projectId }: SourceControlPaneProps) {
  const githubState = useQuery(api.githubConnections.getProjectSyncState, { projectId: _projectId })
  const { status, log, isLoading, error, refreshStatus, refreshLog, stage, unstage, commit } =
    useGit()

  const [commitMessage, setCommitMessage] = useState('')
  const [showLog, setShowLog] = useState(false)
  const [stagedExpanded, setStagedExpanded] = useState(true)
  const [unstagedExpanded, setUnstagedExpanded] = useState(true)
  const [untrackedExpanded, setUntrackedExpanded] = useState(true)
  const [showBranchList, setShowBranchList] = useState(false)

  useEffect(() => {
    if (githubState?.repository) return
    refreshStatus()
  }, [githubState?.repository, refreshStatus])

  if (githubState?.repository) {
    return (
      <GitHubSourceControlState
        projectId={_projectId}
        repository={githubState.repository}
        syncState={githubState.syncState}
      />
    )
  }

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
      <div className="border-b border-border">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <IconGit className="h-3.5 w-3.5 text-primary" />
            <button
              type="button"
              onClick={() => setShowBranchList((value) => !value)}
              className="surface-0 flex items-center gap-1 border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-foreground"
              aria-label="Branch switcher"
            >
              <span className="max-w-[120px] truncate">{status?.branch ?? 'branch'}</span>
              <IconChevronUpDown className="h-3 w-3 text-muted-foreground" />
            </button>
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

        <div className="flex flex-wrap items-center gap-1 border-t border-border px-3 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 rounded-none border border-border px-2 font-mono text-[10px] uppercase tracking-[0.18em]"
            onClick={handleCommit}
            disabled={!commitMessage.trim() || stagedCount === 0}
          >
            <IconCheck className="h-3 w-3" />
            Commit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 rounded-none border border-border px-2 font-mono text-[10px] uppercase tracking-[0.18em]"
            disabled
            title="Push integration not yet wired"
          >
            <IconArrowUp className="h-3 w-3" />
            Push
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 rounded-none border border-border px-2 font-mono text-[10px] uppercase tracking-[0.18em]"
            disabled={totalChanges === 0}
            title="Revert flow coming next"
          >
            <IconRevert className="h-3 w-3" />
            Revert
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 rounded-none border border-border px-2 font-mono text-[10px] uppercase tracking-[0.18em]"
            disabled
            title="Pull request creation is not wired from this pane yet"
          >
            <IconCloud className="h-3 w-3" />
            Create PR
          </Button>
          <span className="ml-auto font-mono text-[10px] text-muted-foreground">
            {totalChanges} total changes
          </span>
        </div>

        {showBranchList && (
          <div className="surface-0 border-t border-border px-3 py-2 font-mono text-[10px] text-muted-foreground">
            Branch switching will be wired here. Current branch: {status?.branch ?? 'unknown'}
          </div>
        )}
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
        {totalChanges > 0 ? (
          <>
            {stagedCount > 0 && (
              <span className="flex items-center gap-1 font-mono text-[10px] text-[oklch(var(--diff-added-fg))]">
                <span className="h-1.5 w-1.5 bg-[oklch(var(--status-success))]" />
                {stagedCount} staged
              </span>
            )}
            {unstagedCount > 0 && (
              <span className="flex items-center gap-1 font-mono text-[10px] text-[oklch(var(--status-warning))]">
                <span className="h-1.5 w-1.5 bg-[oklch(var(--status-warning))]" />
                {unstagedCount} changed
              </span>
            )}
            {untrackedCount > 0 && (
              <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                <span className="bg-muted-foreground/30 h-1.5 w-1.5" />
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
        <div className="border-destructive/30 bg-destructive/10 border-b px-3 py-1.5 font-mono text-[10px] text-destructive">
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
              dotColor="bg-[oklch(var(--status-success))]"
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
              dotColor="bg-[oklch(var(--status-warning))]"
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
                  <span className="bg-muted-foreground/40 mt-1 h-1.5 w-1.5 shrink-0" />
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

function GitHubSourceControlState({
  projectId,
  repository,
  syncState,
}: {
  projectId: Id<'projects'>
  repository: {
    name: string
    fullName: string
    defaultBranch: string
    htmlUrl: string
    private: boolean
  }
  syncState: {
    baseBranch: string
    lastSyncedCommitSha: string
    workingBranch?: string
    changedFiles: string[]
    status: 'clean' | 'dirty' | 'remote_changed' | 'conflict'
  } | null
}) {
  const createTaskBranch = useMutation(api.githubConnections.createTaskBranch)
  const commitWorkingCopy = useMutation(api.githubConnections.commitWorkingCopy)
  const confirmPushBranch = useMutation(api.githubConnections.confirmPushBranch)
  const createPullRequestDraft = useMutation(api.githubConnections.createPullRequestDraft)
  const confirmCreatePullRequest = useMutation(api.githubConnections.confirmCreatePullRequest)
  const syncFromGitHub = useMutation(api.githubConnections.syncFromGitHub)
  const latestCommit = useQuery(api.githubConnections.getLatestCommitForProject, { projectId })
  const latestPullRequest = useQuery(api.githubConnections.getLatestPullRequestForProject, {
    projectId,
  })
  const [isCreatingBranch, setIsCreatingBranch] = useState(false)
  const [commitMessage, setCommitMessage] = useState('')
  const [isCommitting, setIsCommitting] = useState(false)
  const [showPushConfirm, setShowPushConfirm] = useState(false)
  const [isPushing, setIsPushing] = useState(false)
  const [isDraftingPr, setIsDraftingPr] = useState(false)
  const [isCreatingPr, setIsCreatingPr] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const changedFiles = syncState?.changedFiles ?? []
  const statusLabel = syncState?.status ?? 'clean'
  const branchLabel = syncState?.workingBranch ?? syncState?.baseBranch ?? repository.defaultBranch
  const reviewLoop = buildSourceControlReviewLoop({
    branchLabel,
    status: statusLabel,
    changedFiles,
    latestCommit: latestCommit ?? null,
    latestPullRequest: latestPullRequest ?? null,
  })

  const handleCreateTaskBranch = async () => {
    setIsCreatingBranch(true)
    try {
      await createTaskBranch({ projectId, label: repository.name })
    } finally {
      setIsCreatingBranch(false)
    }
  }

  const handleCommitWorkingCopy = async () => {
    if (!commitMessage.trim()) return
    setIsCommitting(true)
    try {
      await commitWorkingCopy({ projectId, message: commitMessage.trim() })
      setCommitMessage('')
    } finally {
      setIsCommitting(false)
    }
  }

  const handleConfirmPush = async () => {
    if (!latestCommit || latestCommit.pushedAt) return
    setIsPushing(true)
    try {
      await confirmPushBranch({ projectId, commitId: latestCommit._id, confirmed: true })
      setShowPushConfirm(false)
    } finally {
      setIsPushing(false)
    }
  }

  const handleCreatePrDraft = async () => {
    if (!latestCommit?.pushedAt) return
    setIsDraftingPr(true)
    try {
      await createPullRequestDraft({ projectId, commitId: latestCommit._id })
    } finally {
      setIsDraftingPr(false)
    }
  }

  const handleConfirmCreatePr = async () => {
    if (!latestPullRequest || latestPullRequest.status === 'created') return
    setIsCreatingPr(true)
    try {
      await confirmCreatePullRequest({
        projectId,
        pullRequestId: latestPullRequest._id,
        confirmed: true,
      })
    } finally {
      setIsCreatingPr(false)
    }
  }

  const handleSyncFromGitHub = async () => {
    setIsSyncing(true)
    try {
      await syncFromGitHub({
        projectId,
        remoteCommitSha: syncState?.lastSyncedCommitSha ?? 'unknown',
      })
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              GitHub Repository
            </p>
            <p className="truncate font-mono text-xs text-foreground">{repository.fullName}</p>
          </div>
          <span className="border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {repository.private ? 'private' : 'public'}
          </span>
        </div>
      </div>

      <div className="border-b border-border px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Review loop
        </p>
        <p className="mt-1 font-mono text-xs text-foreground">{reviewLoop.headline}</p>
        <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
          {reviewLoop.detail}
        </p>
        <div className="mt-2 grid gap-1.5">
          {reviewLoop.steps.map((step) => (
            <div
              key={step.label}
              className="flex items-center justify-between gap-3 border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
            >
              <span>{step.label}</span>
              <span className="truncate text-foreground">{step.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-px bg-border">
        <GitHubStateRow label="Branch" value={branchLabel} />
        <GitHubStateRow
          label="Sync"
          value={reviewLoop.steps[1]?.value ?? statusLabel.replace('_', ' ')}
        />
        <GitHubStateRow
          label="Last sync"
          value={syncState?.lastSyncedCommitSha?.slice(0, 12) ?? 'unknown'}
        />
      </div>

      <div className="border-b border-border px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Pending changes
        </p>
        <p className="mt-1 font-mono text-xs text-foreground">{changedFiles.length} files</p>
      </div>

      <ScrollArea className="flex-1">
        {changedFiles.length > 0 ? (
          <div className="p-1">
            {changedFiles.map((file) => (
              <div key={file} className="flex items-center gap-2 px-3 py-1">
                <span className="h-1.5 w-1.5 bg-[oklch(var(--status-warning))]" />
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">
                  {file}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-3 py-6 text-center font-mono text-xs text-muted-foreground">
            GitHub working copy is clean
          </div>
        )}
      </ScrollArea>

      <div className="border-t border-border p-2">
        <Button
          variant="ghost"
          size="sm"
          className="mb-2 h-7 w-full rounded-none border border-border font-mono text-[10px] uppercase tracking-widest"
          onClick={handleSyncFromGitHub}
          disabled={isSyncing}
        >
          {isSyncing ? 'Syncing...' : 'Sync from GitHub'}
        </Button>
        {!syncState?.workingBranch ? (
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 h-7 w-full rounded-none border border-border font-mono text-[10px] uppercase tracking-widest"
            onClick={handleCreateTaskBranch}
            disabled={isCreatingBranch}
          >
            {isCreatingBranch ? 'Creating branch...' : 'Create Panda Branch'}
          </Button>
        ) : null}
        {syncState?.workingBranch && changedFiles.length > 0 ? (
          <div className="mb-2 space-y-2">
            <textarea
              value={commitMessage}
              onChange={(event) => setCommitMessage(event.target.value)}
              placeholder="Commit message..."
              className="surface-0 w-full resize-none border border-border px-2 py-1.5 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              rows={2}
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-full rounded-none border border-border font-mono text-[10px] uppercase tracking-widest"
              onClick={handleCommitWorkingCopy}
              disabled={!commitMessage.trim() || isCommitting}
            >
              {isCommitting ? 'Committing...' : 'Commit Branch'}
            </Button>
          </div>
        ) : null}
        {latestCommit && !latestCommit.pushedAt ? (
          <div className="mb-2 space-y-2 border border-border p-2">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Ready to push {latestCommit.branch}
            </p>
            {showPushConfirm ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  This will write the Panda branch to GitHub. Confirm before continuing.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-full rounded-none border border-border font-mono text-[10px] uppercase tracking-widest"
                  onClick={handleConfirmPush}
                  disabled={isPushing}
                >
                  {isPushing ? 'Pushing...' : 'Confirm Push'}
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-full rounded-none border border-border font-mono text-[10px] uppercase tracking-widest"
                onClick={() => setShowPushConfirm(true)}
              >
                Confirm Push to GitHub
              </Button>
            )}
          </div>
        ) : null}
        {latestCommit?.pushedAt && !latestPullRequest ? (
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 h-7 w-full rounded-none border border-border font-mono text-[10px] uppercase tracking-widest"
            onClick={handleCreatePrDraft}
            disabled={isDraftingPr}
          >
            {isDraftingPr ? 'Drafting PR...' : 'Create PR Draft'}
          </Button>
        ) : null}
        {latestPullRequest ? (
          <div className="mb-2 space-y-2 border border-border p-2">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Pull Request {latestPullRequest.status}
            </p>
            <p className="text-xs font-medium text-foreground">{latestPullRequest.title}</p>
            {latestPullRequest.status === 'draft' ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-full rounded-none border border-border font-mono text-[10px] uppercase tracking-widest"
                onClick={handleConfirmCreatePr}
                disabled={isCreatingPr}
              >
                {isCreatingPr ? 'Creating PR...' : 'Open PR'}
              </Button>
            ) : latestPullRequest.url ? (
              <a
                href={latestPullRequest.url}
                className="block truncate font-mono text-[10px] uppercase tracking-widest text-primary underline"
              >
                Open PR
              </a>
            ) : null}
          </div>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-full rounded-none border border-border font-mono text-[10px] uppercase tracking-widest"
          disabled
          title="GitHub review loop actions stay in this pane"
        >
          Branch / Sync / Commit / Push / PR
        </Button>
      </div>
    </div>
  )
}

function GitHubStateRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background px-3 py-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate font-mono text-xs text-foreground">{value}</p>
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
          <div key={file} className="group flex items-center gap-2 px-3 py-1 hover:bg-surface-2">
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
