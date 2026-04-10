'use client'

import { IconGit, IconBell, IconQuickAction, IconSpinner, IconNewChat } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  WorkspaceHealthIndicator,
  type WorkspaceHealthStatus,
} from '@/components/layout/WorkspaceHealthIndicator'
import { cn } from '@/lib/utils'

export type RunMode = 'local' | 'worktree' | 'cloud'
export type HealthStatus = WorkspaceHealthStatus

interface TopBarControlsProps {
  branch?: string
  model?: string
  runMode?: RunMode
  onRunModeChange?: (mode: RunMode) => void
  healthStatus?: HealthStatus
  onNewTask?: () => void
  isAgentRunning?: boolean
  notificationCount?: number
  onNotificationsClick?: () => void
  onToggleRightPanel?: () => void
  isRightPanelOpen?: boolean
  healthDetail?: string
  devServerLabel?: string
  agentLabel?: string
  repoLabel?: string
}

export function TopBarControls({
  branch,
  model,
  runMode = 'local',
  onRunModeChange,
  healthStatus = 'ready',
  onNewTask,
  isAgentRunning = false,
  notificationCount = 0,
  onNotificationsClick,
  onToggleRightPanel,
  isRightPanelOpen = false,
  healthDetail,
  devServerLabel,
  agentLabel,
  repoLabel,
}: TopBarControlsProps) {
  return (
    <div className="flex items-center gap-1.5">
      <WorkspaceHealthIndicator
        status={healthStatus}
        detail={healthDetail}
        devServerLabel={devServerLabel}
        agentLabel={agentLabel}
        repoLabel={repoLabel}
      />

      {/* Branch chip */}
      {branch && (
        <div className="surface-0 flex items-center gap-1.5 border border-border px-2 py-1 font-mono text-[10px] text-muted-foreground">
          <IconGit className="h-3 w-3" />
          <span className="max-w-[80px] truncate">{branch}</span>
        </div>
      )}

      {/* Active model badge */}
      {model && (
        <div className="surface-0 hidden items-center gap-1 border border-border px-2 py-1 font-mono text-[10px] text-muted-foreground lg:flex">
          {isAgentRunning && <IconSpinner className="h-2.5 w-2.5 animate-spin text-primary" />}
          <span className="max-w-[100px] truncate">{model}</span>
        </div>
      )}

      {/* Run mode selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="hidden h-7 gap-1 rounded-none px-2 font-mono text-[10px] uppercase tracking-widest xl:flex"
          >
            {runMode}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="rounded-none border-border font-mono text-xs">
          <DropdownMenuItem
            onClick={() => onRunModeChange?.('local')}
            className="rounded-none text-xs"
          >
            Local
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onRunModeChange?.('worktree')}
            className="rounded-none text-xs"
          >
            Worktree
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onRunModeChange?.('cloud')}
            className="rounded-none text-xs"
          >
            Cloud
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Divider */}
      <div className="h-5 w-px bg-border" />

      {/* Notifications */}
      <button
        type="button"
        onClick={onNotificationsClick}
        className="relative flex h-7 w-7 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
        title="Notifications"
        aria-label="Notifications"
      >
        <IconBell className="h-4 w-4" />
        {notificationCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center bg-primary px-0.5 font-mono text-[8px] font-bold text-primary-foreground">
            {notificationCount > 9 ? '9+' : notificationCount}
          </span>
        )}
      </button>

      {/* Chat panel toggle */}
      <button
        type="button"
        onClick={onToggleRightPanel}
        className={cn(
          'flex h-7 w-7 items-center justify-center transition-colors',
          isRightPanelOpen
            ? 'bg-surface-2 text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        )}
        title={isRightPanelOpen ? 'Close chat (Cmd+L)' : 'Open chat (Cmd+L)'}
        aria-label={isRightPanelOpen ? 'Close chat panel' : 'Open chat panel'}
        aria-pressed={isRightPanelOpen}
      >
        <IconNewChat className="h-4 w-4" />
      </button>

      {/* New Task CTA */}
      <Button
        size="sm"
        className="h-7 gap-1.5 rounded-none bg-primary px-3 font-mono text-[10px] uppercase tracking-widest text-primary-foreground hover:bg-primary/90"
        onClick={onNewTask}
      >
        <IconQuickAction className="h-3.5 w-3.5" weight="fill" />
        <span className="hidden sm:inline">New Task</span>
      </Button>
    </div>
  )
}
