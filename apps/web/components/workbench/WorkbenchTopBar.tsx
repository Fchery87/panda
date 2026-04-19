'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { PanelLeftOpen, PanelLeftClose, MoreHorizontal, RotateCcw, Menu } from 'lucide-react'
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
import { useState } from 'react'

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
  onToggleFlyout: () => void
  onToggleRightPanel: () => void
  onNewTask: () => void
  onResetWorkspace: () => void
  onOpenShareDialog: () => void
  onRevealInExplorer: (folderPath: string) => void
  onOpenCommandPalette: () => void
  activeSidebarSection: SidebarSection
  onSidebarSectionChange: (section: SidebarSection) => void
}

export function WorkbenchTopBar({
  projectName,
  projectId,
  selectedFilePath,
  gitStatus,
  selectedModel,
  isAgentRunning,
  isAnyJobRunning,
  healthStatus,
  healthDetail,
  isRightPanelOpen,
  isFlyoutOpen,
  onToggleFlyout,
  onToggleRightPanel,
  onNewTask,
  onResetWorkspace,
  onOpenShareDialog,
  onRevealInExplorer,
  onOpenCommandPalette,
  activeSidebarSection,
  onSidebarSectionChange,
}: WorkbenchTopBarProps) {
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)
  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="surface-1 flex h-11 shrink-0 items-center justify-between border-b border-border px-3"
    >
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

        <Breadcrumb
          projectName={projectName}
          projectId={projectId}
          items={buildBreadcrumbItems(selectedFilePath)}
          onRevealInExplorer={onRevealInExplorer}
        />
      </div>

      <div className="mx-4 hidden min-w-0 flex-1 justify-center md:flex">
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
          devServerLabel={isAnyJobRunning ? 'Dev server active' : 'Dev server idle'}
          agentLabel={isAgentRunning ? 'Agent running' : 'Agent idle'}
          repoLabel={
            gitStatus
              ? `${gitStatus.staged.length + gitStatus.unstaged.length + gitStatus.untracked.length} repo changes`
              : 'Repo status loading'
          }
          onToggleRightPanel={onToggleRightPanel}
          isRightPanelOpen={isRightPanelOpen}
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

      <MobileSidebarSheet
        open={mobileSheetOpen}
        onOpenChange={setMobileSheetOpen}
        activeSection={activeSidebarSection}
        onSectionChange={onSidebarSectionChange}
      />
    </motion.div>
  )
}
