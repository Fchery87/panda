'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  ChevronLeft,
  Menu,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
} from 'lucide-react'
import type { Id } from '@convex/_generated/dataModel'
import type { GitStatusResult } from '@/hooks/useGit'
import type { SidebarSection } from '@/components/sidebar/SidebarRail'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PandaLogo } from '@/components/ui/panda-logo'
import { TopBarControls } from '@/components/layout/TopBarControls'
import { ThemeToggle } from '@/components/settings/ThemeToggle'
import { UserMenu } from '@/components/auth/UserMenu'
import { MobileSidebarSheet } from '@/components/sidebar/MobileSidebarSheet'
import { cn } from '@/lib/utils'
import type { WorkspaceFocusState } from './workspace-focus'

interface WorkbenchTopBarProps {
  projectName: string
  projectId: Id<'projects'>
  selectedFilePath: string | null
  gitStatus: GitStatusResult | null
  githubShellSummary?: {
    repositoryFullName: string
    branch: string
    syncStatus: string
    pendingChanges: number
    pullRequestStatus: string | null
    pullRequestUrl: string | null
  } | null
  selectedModel: string
  isAgentRunning: boolean
  isAnyJobRunning: boolean
  healthStatus: 'ready' | 'issues' | 'error'
  healthDetail: string
  isRightPanelOpen: boolean
  isFlyoutOpen: boolean
  isRuntimeRunning?: boolean
  onToggleFlyout: () => void
  onToggleRightPanel: () => void
  onNewTask: () => void
  onStartRuntime?: () => void
  onStopRuntime?: () => void
  onResetWorkspace: () => void
  onOpenShareDialog: () => void
  onRevealInExplorer: (folderPath: string) => void
  onOpenCommandPalette: () => void
  activeSidebarSection: SidebarSection
  onSidebarSectionChange: (section: SidebarSection) => void
  focusState?: WorkspaceFocusState | null
  onFocusPrimaryAction?: () => void
  onFocusSecondaryAction?: () => void
  yoloCommandMode?: boolean
  onToggleYolo?: () => void
}

const FOCUS_TONE_STYLES: Record<
  NonNullable<WorkbenchTopBarProps['focusState']>['tone'],
  { border: string; background: string; text: string }
> = {
  neutral: {
    border: 'border-border',
    background: 'bg-background/70',
    text: 'text-muted-foreground',
  },
  progress: {
    border: 'border-primary/40',
    background: 'bg-primary/5',
    text: 'text-primary',
  },
  attention: {
    border: 'border-[oklch(var(--status-warning)/0.45)]',
    background: 'bg-[oklch(var(--status-warning)/0.08)]',
    text: 'text-[oklch(var(--status-warning))]',
  },
  success: {
    border: 'border-[oklch(var(--status-success)/0.45)]',
    background: 'bg-[oklch(var(--status-success)/0.08)]',
    text: 'text-[oklch(var(--status-success))]',
  },
}

export function WorkbenchTopBar({
  projectName,
  projectId: _projectId,
  selectedFilePath: _selectedFilePath,
  gitStatus,
  githubShellSummary,
  selectedModel,
  isAgentRunning,
  isAnyJobRunning: _isAnyJobRunning,
  healthStatus,
  healthDetail,
  isRightPanelOpen,
  isFlyoutOpen,
  isRuntimeRunning = false,
  onToggleFlyout,
  onToggleRightPanel,
  onNewTask,
  onStartRuntime,
  onStopRuntime,
  onResetWorkspace,
  onOpenShareDialog,
  onRevealInExplorer: _onRevealInExplorer,
  onOpenCommandPalette,
  activeSidebarSection,
  onSidebarSectionChange,
  focusState,
  onFocusPrimaryAction,
  onFocusSecondaryAction,
  yoloCommandMode = false,
  onToggleYolo,
}: WorkbenchTopBarProps) {
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)
  const [showYoloConfirm, setShowYoloConfirm] = useState(false)
  const focusTone = focusState ? FOCUS_TONE_STYLES[focusState.tone] : null

  const handleYoloPillClick = useCallback(() => {
    if (!yoloCommandMode) {
      const storageKey = `panda_yolo_confirmed_${_projectId}`
      const alreadyConfirmed = typeof window !== 'undefined' && localStorage.getItem(storageKey)
      if (!alreadyConfirmed) {
        setShowYoloConfirm(true)
        return
      }
    }
    onToggleYolo?.()
  }, [yoloCommandMode, _projectId, onToggleYolo])

  const handleYoloConfirm = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`panda_yolo_confirmed_${_projectId}`, '1')
    }
    setShowYoloConfirm(false)
    onToggleYolo?.()
  }, [_projectId, onToggleYolo])

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-card grid shrink-0 border-b border-border"
    >
      <div className="grid min-h-11 lg:grid-cols-[minmax(210px,0.28fr)_1fr_auto]">
        <div className="flex min-w-0 items-center gap-2 border-b border-border px-3 py-2 lg:border-b-0 lg:border-r lg:px-3">
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="hidden h-7 w-7 rounded-md p-0 md:flex"
              onClick={onToggleFlyout}
              title={isFlyoutOpen ? 'Close sidebar' : 'Open sidebar'}
              aria-label={isFlyoutOpen ? 'Close sidebar' : 'Open sidebar'}
            >
              {isFlyoutOpen ? (
                <PanelLeftClose className="h-3.5 w-3.5" />
              ) : (
                <PanelLeftOpen className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 rounded-md p-0 md:hidden"
              onClick={() => setMobileSheetOpen(true)}
              title="Open navigation"
              aria-label="Open navigation"
            >
              <Menu className="h-3.5 w-3.5" />
            </Button>
            <Link href="/" className="flex shrink-0 items-center">
              <PandaLogo size="sm" variant="icon" />
            </Link>
          </div>

          <div className="flex min-w-0 items-center gap-1">
            <Link
              href="/projects"
              className="hidden shrink-0 p-1 text-muted-foreground transition-colors hover:text-foreground lg:flex"
              title="Back to Projects"
              aria-label="Back to Projects"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Link>
            <h1 className="min-w-0 truncate text-sm font-semibold leading-none tracking-tight text-foreground">
              {projectName}
            </h1>
          </div>
        </div>

        <div className="flex min-w-0 items-center border-b border-border px-3 py-1.5 lg:border-b-0 lg:px-3">
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="flex h-7 w-full items-center gap-2 rounded-md border border-border bg-background px-2.5 text-left text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Open command palette"
          >
            <span className="font-medium text-primary">Search</span>
            <span className="min-w-0 flex-1 truncate">Files, commands, run evidence, runtime</span>
            <span className="shrink-0 rounded border border-border bg-card px-1.5 py-0.5 text-[10px] text-muted-foreground">
              Ctrl+K
            </span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-2 text-[10px] text-muted-foreground lg:border-l lg:border-border lg:px-3">
          <span className="h-2 w-2 rounded-full bg-oxblood" />
          <TopBarControls
            branch={gitStatus?.branch}
            model={selectedModel}
            isAgentRunning={isAgentRunning}
            onNewTask={onNewTask}
            healthStatus={healthStatus}
            healthDetail={healthDetail}
            devServerLabel={isRuntimeRunning ? 'Dev server active' : 'Dev server idle'}
            agentLabel={isAgentRunning ? 'Agent running' : 'Agent idle'}
            repoLabel={
              githubShellSummary
                ? `${githubShellSummary.repositoryFullName} · ${githubShellSummary.branch} · ${githubShellSummary.syncStatus}${githubShellSummary.pullRequestStatus ? ` · PR ${githubShellSummary.pullRequestStatus}` : ''}`
                : gitStatus
                  ? `${gitStatus.staged.length + gitStatus.unstaged.length + gitStatus.untracked.length} repo changes`
                  : 'Repo status loading'
            }
            onToggleRightPanel={onToggleRightPanel}
            isRightPanelOpen={isRightPanelOpen}
            onStartRuntime={onStartRuntime}
            onStopRuntime={onStopRuntime}
            isRuntimeRunning={isRuntimeRunning}
          />
          <div className="bg-foreground/30 hidden h-5 w-px sm:block" />
          <button
            type="button"
            onClick={handleYoloPillClick}
            title={
              yoloCommandMode
                ? 'YOLO mode ON — all tools auto-approved. Click to disable.'
                : 'YOLO mode OFF — commands require approval. Click to enable.'
            }
            className={cn(
              'hidden h-6 items-center gap-1.5 rounded-full border px-2.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors sm:flex',
              yoloCommandMode
                ? 'border-destructive/50 bg-destructive/10 text-destructive hover:bg-destructive/20'
                : 'border-border bg-transparent text-muted-foreground hover:text-foreground'
            )}
            aria-pressed={yoloCommandMode}
            aria-label={yoloCommandMode ? 'YOLO mode on' : 'YOLO mode off'}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                yoloCommandMode ? 'bg-destructive' : 'bg-muted-foreground/40'
              )}
            />
            YOLO
          </button>
          <div className="bg-foreground/30 hidden h-5 w-px sm:block" />
          <ThemeToggle />
          <UserMenu compact />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 rounded-md p-0"
                title="More actions"
                aria-label="More actions"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-md border-border">
              <DropdownMenuItem onClick={onResetWorkspace} className="rounded-md text-xs">
                <RotateCcw className="mr-2 h-3.5 w-3.5" />
                Clear Workspace State
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenShareDialog} className="rounded-md text-xs">
                Share
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {focusState && focusTone ? (
        <div className="border-border/80 flex h-8 items-center justify-between border-t bg-background px-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="text-[10px] text-muted-foreground">{focusState.kicker}</span>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-medium text-foreground">
                  {focusState.objective}
                </span>
                <span
                  className={cn(
                    'hidden shrink-0 rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] lg:inline-flex',
                    focusTone.border,
                    focusTone.background,
                    focusTone.text
                  )}
                >
                  {focusState.statusLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {focusState.secondaryAction && onFocusSecondaryAction ? (
              <Button
                variant="ghost"
                size="sm"
                className="hidden h-7 rounded-md px-2 text-[10px] md:inline-flex"
                onClick={onFocusSecondaryAction}
              >
                {focusState.secondaryAction.label}
              </Button>
            ) : null}
            {focusState.primaryAction && onFocusPrimaryAction ? (
              <Button
                size="sm"
                className="h-7 rounded-md px-3 text-[10px]"
                onClick={onFocusPrimaryAction}
              >
                {focusState.primaryAction.label}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      <MobileSidebarSheet
        open={mobileSheetOpen}
        onOpenChange={setMobileSheetOpen}
        activeSection={activeSidebarSection}
        onSectionChange={onSidebarSectionChange}
      />

      {showYoloConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="shadow-sharp-lg mx-4 w-full max-w-sm rounded-lg border border-border bg-card p-6">
            <p className="mb-1 text-[10px] text-muted-foreground">Enable YOLO mode</p>
            <p className="mb-4 text-sm text-foreground">
              All commands and file writes will be automatically approved — no confirmation dialogs.
              Best for sandboxed (WebContainer) projects. You can turn it off anytime in Settings →
              Agent Defaults.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-md text-xs"
                onClick={() => setShowYoloConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="rounded-md text-xs"
                onClick={handleYoloConfirm}
              >
                Enable YOLO
              </Button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}
