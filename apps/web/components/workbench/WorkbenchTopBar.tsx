'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Menu, MoreHorizontal, PanelLeftClose, PanelLeftOpen, RotateCcw } from 'lucide-react'
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
import { Breadcrumb, buildBreadcrumbItems } from '@/components/workbench/Breadcrumb'
import { MobileSidebarSheet } from '@/components/sidebar/MobileSidebarSheet'
import { cn } from '@/lib/utils'
import type { WorkspaceFocusState } from './workspace-focus'

interface WorkbenchTopBarProps {
  projectName: string
  projectId: Id<'projects'>
  selectedFilePath: string | null
  gitStatus: GitStatusResult | null
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
    border: 'border-[hsl(var(--status-warning)/0.45)]',
    background: 'bg-[hsl(var(--status-warning)/0.08)]',
    text: 'text-[hsl(var(--status-warning))]',
  },
  success: {
    border: 'border-[hsl(var(--status-success)/0.45)]',
    background: 'bg-[hsl(var(--status-success)/0.08)]',
    text: 'text-[hsl(var(--status-success))]',
  },
}

export function WorkbenchTopBar({
  projectName,
  projectId,
  selectedFilePath,
  gitStatus,
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
  onRevealInExplorer,
  onOpenCommandPalette,
  activeSidebarSection,
  onSidebarSectionChange,
  focusState,
  onFocusPrimaryAction,
  onFocusSecondaryAction,
}: WorkbenchTopBarProps) {
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)
  const focusTone = focusState ? FOCUS_TONE_STYLES[focusState.tone] : null

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="surface-1 flex shrink-0 flex-col border-b border-border"
    >
      <div className="flex h-11 items-center justify-between px-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="hidden h-7 w-7 rounded-none p-0 md:flex"
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
              className="h-7 w-7 rounded-none p-0 md:hidden"
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

          <div className="h-5 w-px bg-border" />

          <span className="truncate text-sm font-medium text-foreground">{projectName}</span>

          {selectedFilePath ? <div className="hidden h-5 w-px bg-border lg:block" /> : null}

          <div className="hidden min-w-0 flex-1 lg:block">
            <Breadcrumb
              projectName={projectName}
              projectId={projectId}
              items={buildBreadcrumbItems(selectedFilePath)}
              onRevealInExplorer={onRevealInExplorer}
            />
          </div>
        </div>

        <div className="mx-4 hidden min-w-0 flex-1 justify-center xl:flex">
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="surface-0 flex h-8 w-full max-w-md items-center gap-3 border border-border px-3 text-left font-mono text-[11px] text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
            aria-label="Open command palette"
          >
            <span className="uppercase tracking-[0.18em] text-primary">Search</span>
            <span className="min-w-0 flex-1 truncate">Files, commands, settings</span>
            <span className="surface-1 shrink-0 border border-border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em]">
              Ctrl+K
            </span>
          </button>
        </div>

        <div className="flex items-center gap-1">
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
              gitStatus
                ? `${gitStatus.staged.length + gitStatus.unstaged.length + gitStatus.untracked.length} repo changes`
                : 'Repo status loading'
            }
            onToggleRightPanel={onToggleRightPanel}
            isRightPanelOpen={isRightPanelOpen}
            onStartRuntime={onStartRuntime}
            onStopRuntime={onStopRuntime}
            isRuntimeRunning={isRuntimeRunning}
          />
          <div className="h-5 w-px bg-border" />
          <ThemeToggle />
          <UserMenu compact />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 rounded-none p-0"
                title="More actions"
                aria-label="More actions"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-none border-border font-mono">
              <DropdownMenuItem
                onClick={onResetWorkspace}
                className="rounded-none text-xs uppercase tracking-wide"
              >
                <RotateCcw className="mr-2 h-3.5 w-3.5" />
                Clear Workspace State
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onOpenShareDialog}
                className="rounded-none text-xs uppercase tracking-wide"
              >
                Share
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {focusState && focusTone ? (
        <div className="surface-0 flex h-9 items-center justify-between border-t border-border px-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              {focusState.kicker}
            </span>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-medium text-foreground">
                  {focusState.objective}
                </span>
                <span
                  className={cn(
                    'hidden shrink-0 border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] lg:inline-flex',
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
                className="hidden h-7 rounded-none px-2 font-mono text-[10px] uppercase tracking-[0.18em] md:inline-flex"
                onClick={onFocusSecondaryAction}
              >
                {focusState.secondaryAction.label}
              </Button>
            ) : null}
            {focusState.primaryAction && onFocusPrimaryAction ? (
              <Button
                size="sm"
                className="h-7 rounded-none px-3 font-mono text-[10px] uppercase tracking-[0.18em]"
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
    </motion.div>
  )
}
