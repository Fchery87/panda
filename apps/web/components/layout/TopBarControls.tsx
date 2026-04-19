'use client'

import { IconBell, IconQuickAction, IconNewChat } from '@/components/ui/icons'
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
  onStartRuntime?: () => void
  onStopRuntime?: () => void
  onOpenPreview?: () => void
  isRuntimeRunning?: boolean
}

export function TopBarControls({
  branch: _branch,
  model: _model,
  runMode = 'local',
  onRunModeChange,
  healthStatus = 'ready',
  onNewTask,
  isAgentRunning: _isAgentRunning = false,
  notificationCount = 0,
  onNotificationsClick,
  onToggleRightPanel,
  isRightPanelOpen = false,
  healthDetail,
  devServerLabel,
  agentLabel,
  repoLabel,
  onStartRuntime,
  onStopRuntime,
  onOpenPreview,
  isRuntimeRunning = false,
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

      {(onStartRuntime || onStopRuntime || onOpenPreview) && (
        <div className="hidden items-center gap-1 md:flex">
          {isRuntimeRunning ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 rounded-none px-2 font-mono text-[10px] uppercase tracking-widest"
              onClick={onOpenPreview}
            >
              Preview
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 rounded-none px-2 font-mono text-[10px] uppercase tracking-widest"
              onClick={onStartRuntime}
            >
              Start App
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 rounded-none px-2 font-mono text-[10px] uppercase tracking-widest"
            onClick={isRuntimeRunning ? onStopRuntime : onStartRuntime}
          >
            {isRuntimeRunning ? 'Stop App' : 'Run Dev'}
          </Button>
          <div className="h-5 w-px bg-border" />
        </div>
      )}

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
