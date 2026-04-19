'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

export interface TaskHistoryEntry {
  id: string
  title: string
  status: 'running' | 'complete' | 'failed' | 'review'
  changedFiles: number
  timeAgo: string
}

interface TaskHistoryPaneProps {
  tasks?: TaskHistoryEntry[]
  onOpenTask?: (id: string) => void
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (days > 0) return `${days}d`
  if (hours > 0) return `${hours}h`
  if (minutes > 0) return `${minutes}m`
  return 'now'
}

export function TaskHistoryPane({ tasks = [], onOpenTask }: TaskHistoryPaneProps) {
  if (tasks.length === 0) {
    return (
      <div className="px-3 py-8 text-center">
        <p className="font-mono text-xs text-muted-foreground">No tasks yet</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Completed agent runs will appear here
        </p>
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
            className={cn(
              'hover:bg-surface-2 flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors duration-100'
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 shrink-0',
                task.status === 'running' && 'animate-pulse bg-primary',
                task.status === 'complete' && 'bg-[hsl(var(--status-success))]',
                task.status === 'failed' && 'bg-destructive',
                task.status === 'review' && 'bg-[hsl(var(--status-warning))]'
              )}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-xs text-foreground">{task.title}</p>
              <div className="mt-0.5 flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
                <span className="badge-md" data-status={task.status}>
                  {task.status}
                </span>
                {task.changedFiles > 0 && <span>{task.changedFiles} files</span>}
              </div>
            </div>
            <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
              {task.timeAgo}
            </span>
          </button>
        ))}
      </div>
    </ScrollArea>
  )
}

export { formatRelativeTime }
