'use client'

import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { motion } from 'framer-motion'
import { Check as IconCheck, Loader2 as IconSpinner, XCircle as IconError } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatMode } from '@/lib/agent/prompt-library'

interface ActivityFeedProps {
  projectId: Id<'projects'>
  onOpenHistory?: () => void
  className?: string
}

type AgentRunStatus = 'running' | 'completed' | 'failed' | 'stopped'

interface AgentRun {
  _id: Id<'agentRuns'>
  _creationTime: number
  mode: ChatMode
  status: AgentRunStatus
  userMessage?: string
  summary?: string
  startedAt: number
  completedAt?: number
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

function getModeLabel(mode: string): string {
  const labels: Record<string, string> = {
    ask: 'Ask',
    plan: 'Plan',
    code: 'Code',
    build: 'Build',
  }
  return labels[mode] || mode
}

function getModeBadgeColor(mode: string): string {
  const colors: Record<string, string> = {
    ask: 'bg-muted text-muted-foreground',
    plan: 'bg-purple-500/20 text-purple-600',
    code: 'bg-blue-500/20 text-blue-600',
    build: 'bg-green-500/20 text-green-600',
  }
  return colors[mode] || 'bg-muted text-muted-foreground'
}

function StatusIcon({ status }: { status: AgentRunStatus }) {
  switch (status) {
    case 'completed':
      return <IconCheck className="h-3.5 w-3.5 text-green-500" />
    case 'failed':
      return <IconError className="h-3.5 w-3.5 text-destructive" />
    case 'running':
      return <IconSpinner className="h-3.5 w-3.5 animate-spin text-primary" />
    default:
      return <IconCheck className="h-3.5 w-3.5 text-muted-foreground" />
  }
}

export function ActivityFeed({ projectId, onOpenHistory, className }: ActivityFeedProps) {
  const recentRuns = useQuery(api.agentRuns.listRecentByProject, {
    projectId,
    limit: 5,
  }) as AgentRun[] | undefined

  if (!recentRuns || recentRuns.length === 0) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('border-t border-border px-3 py-4', className)}
    >
      <div className="space-y-2">
        {recentRuns.map((run, index) => {
          const taskSummary = run.summary || run.userMessage || 'Untitled task'
          const truncatedSummary =
            taskSummary.length > 60 ? `${taskSummary.slice(0, 57)}...` : taskSummary

          return (
            <motion.div
              key={run._id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center justify-between gap-3 py-1.5"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <StatusIcon status={run.status} />
                <span className="truncate font-mono text-xs text-foreground" title={taskSummary}>
                  {truncatedSummary}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={cn(
                    'rounded-none px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide',
                    getModeBadgeColor(run.mode)
                  )}
                >
                  {getModeLabel(run.mode)}
                </span>
                <span className="min-w-8 text-right font-mono text-xs text-muted-foreground">
                  {formatRelativeTime(run.startedAt)}
                </span>
              </div>
            </motion.div>
          )
        })}
      </div>

      {onOpenHistory && (
        <button
          type="button"
          onClick={onOpenHistory}
          className="mt-3 font-mono text-xs uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
        >
          See all
        </button>
      )}
    </motion.div>
  )
}
