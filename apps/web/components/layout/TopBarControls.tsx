'use client'

import {
  Bell as IconBell,
  Zap as IconQuickAction,
  MessageSquarePlus as IconNewChat,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  isRuntimeRunning?: boolean
}

export function TopBarControls({
  branch: _branch,
  model: _model,
  runMode: _runMode = 'local',
  onRunModeChange: _onRunModeChange,
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

      {(onStartRuntime || onStopRuntime) && (
        <div className="hidden items-center gap-1 md:flex">
          {isRuntimeRunning ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 rounded-none px-2 font-mono text-[10px] uppercase tracking-widest"
              onClick={onStopRuntime}
            >
              Stop App
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
          <div className="h-5 w-px bg-border" />
        </div>
      )}

      {/* Notifications */}
      {notificationCount > 0 ? (
        <button
          type="button"
          onClick={onNotificationsClick}
          className="relative flex h-7 w-7 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
          title="Notifications"
          aria-label="Notifications"
        >
          <IconBell className="h-4 w-4" />
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-4 items-center justify-center rounded-sm bg-primary px-1 font-mono text-[8px] font-bold leading-none text-primary-foreground">
            {notificationCount > 9 ? '9+' : notificationCount}
          </span>
        </button>
      ) : null}

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
        <IconQuickAction className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">New Task</span>
      </Button>
    </div>
  )
}
