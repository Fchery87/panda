'use client'

import { cn } from '@/lib/utils'

export type WorkspaceHealthStatus = 'ready' | 'issues' | 'error'

interface WorkspaceHealthIndicatorProps {
  status: WorkspaceHealthStatus
  detail?: string
  devServerLabel?: string
  agentLabel?: string
  repoLabel?: string
  className?: string
}

const STATUS_META: Record<WorkspaceHealthStatus, { label: string; dotClassName: string }> = {
  ready: {
    label: 'Workspace ready',
    dotClassName: 'bg-[hsl(var(--status-success))]',
  },
  issues: {
    label: 'Workspace has issues',
    dotClassName: 'bg-[hsl(var(--status-warning))]',
  },
  error: {
    label: 'Workspace error',
    dotClassName: 'bg-destructive',
  },
}

export function WorkspaceHealthIndicator({
  status,
  detail,
  devServerLabel,
  agentLabel,
  repoLabel,
  className,
}: WorkspaceHealthIndicatorProps) {
  const meta = STATUS_META[status]
  const tooltip = [meta.label, detail, devServerLabel, agentLabel, repoLabel]
    .filter(Boolean)
    .join(' • ')

  return (
    <div
      className={cn('flex items-center gap-1.5 px-1.5', className)}
      title={tooltip}
      aria-label={tooltip}
    >
      <span className={cn('h-2 w-2 shrink-0', meta.dotClassName)} aria-hidden="true" />
      <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground 2xl:inline">
        {status}
      </span>
    </div>
  )
}
