'use client'

import { Bot as IconAgents, Loader2 as IconSpinner, Pause as IconPause } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type AgentTaskStatus = 'running' | 'waiting' | 'review' | 'failed' | 'complete'

export interface AgentTaskRow {
  id: string
  title: string
  workspace: string
  status: AgentTaskStatus
  lastActivity: string
  changedFiles?: number
}

interface ActiveAgentsPaneProps {
  tasks?: AgentTaskRow[]
  onOpenTask?: (id: string) => void
  onPauseTask?: (id: string) => void
  onResumeTask?: (id: string) => void
  onStopTask?: (id: string) => void
  onStartAgent?: () => void
}

function StatusDot({ status }: { status: AgentTaskStatus }) {
  return (
    <span
      className={cn(
        'h-1.5 w-1.5 shrink-0',
        status === 'running' && 'animate-pulse bg-primary',
        status === 'waiting' && 'bg-[hsl(var(--status-info))]',
        status === 'review' && 'bg-[hsl(var(--status-warning))]',
        status === 'failed' && 'bg-destructive',
        status === 'complete' && 'bg-[hsl(var(--status-success))]'
      )}
    />
  )
}

export function ActiveAgentsPane({
  tasks = [],
  onOpenTask,
  onPauseTask,
  onStopTask,
  onStartAgent,
}: ActiveAgentsPaneProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-4 py-8 text-center">
        <div className="flex h-10 w-10 items-center justify-center border border-border bg-muted/50">
          <IconAgents className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="font-mono text-xs font-medium text-foreground">No active agents</p>
          <p className="text-[11px] text-muted-foreground">
            Start a task to see agent activity here
          </p>
        </div>
        {onStartAgent && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 rounded-none font-mono text-[10px] uppercase tracking-widest"
            onClick={onStartAgent}
          >
            Start Agent
          </Button>
        )}
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-1">
        {tasks.map((task) => (
          <button
            key={task.id}
            type="button"
            onClick={() => onOpenTask?.(task.id)}
            className="hover:bg-surface-2 group flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors duration-100"
          >
            <StatusDot status={task.status} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-mono text-xs font-medium text-foreground">
                  {task.title}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="badge-md" data-status={task.status}>
                  {task.status === 'running' && (
                    <IconSpinner className="h-2.5 w-2.5 animate-spin" />
                  )}
                  {task.status}
                </span>
                {task.changedFiles != null && task.changedFiles > 0 && (
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {task.changedFiles} files
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
                <span className="truncate">{task.workspace}</span>
                <span>·</span>
                <span className="shrink-0">{task.lastActivity}</span>
              </div>
            </div>
            {/* Quick actions - show on hover */}
            <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              {task.status === 'running' && onPauseTask && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onPauseTask(task.id)
                  }}
                  className="flex h-5 w-5 items-center justify-center text-muted-foreground hover:text-foreground"
                  title="Pause"
                >
                  <IconPause className="h-3 w-3" />
                </button>
              )}
              {(task.status === 'running' || task.status === 'waiting') && onStopTask && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onStopTask(task.id)
                  }}
                  className="flex h-5 w-5 items-center justify-center text-muted-foreground hover:text-destructive"
                  title="Stop"
                >
                  <span className="h-2.5 w-2.5 bg-current" />
                </button>
              )}
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  )
}
