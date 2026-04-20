'use client'

import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
  IconBot,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconError,
  IconSpinner,
  IconX,
  IconStop,
} from '@/components/ui/icons'
import type { ChatMode } from '@/lib/agent/prompt-library'
import type { LiveProgressStep } from '@/components/chat/live-run-utils'

interface AgentManagerDrawerProps {
  projectId: Id<'projects'>
  isOpen: boolean
  onClose: () => void
  /** Live active run data (optional, falls back to query) */
  liveSteps?: LiveProgressStep[]
  currentRunId?: string | null
  isStreaming?: boolean
  onStopRun?: () => void
  onNavigateToChat?: (chatId: Id<'chats'>) => void
}

type AgentRunStatus = 'running' | 'completed' | 'failed' | 'stopped'

interface AgentRun {
  _id: Id<'agentRuns'>
  _creationTime: number
  chatId: Id<'chats'>
  mode: ChatMode
  status: AgentRunStatus
  userMessage?: string
  summary?: string
  model?: string
  startedAt: number
  completedAt?: number
}

function formatDuration(startedAt: number, completedAt?: number): string {
  const end = completedAt || Date.now()
  const durationMs = end - startedAt
  const minutes = Math.floor(durationMs / 60000)
  const seconds = Math.floor((durationMs % 60000) / 1000)

  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }
  return `${seconds}s`
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (days > 0) return `${days}d`
  if (hours > 0) return `${hours}h`
  return 'now'
}

function getModeLabel(mode: string): string {
  const labels: Record<string, string> = {
    ask: 'Ask',
    plan: 'Plan',
    code: 'Code',
    build: 'Build',
    discuss: 'Discuss',
    debug: 'Debug',
    review: 'Review',
  }
  return labels[mode] || mode
}

function StatusIcon({ status }: { status: AgentRunStatus }) {
  switch (status) {
    case 'completed':
      return <IconCheck className="h-4 w-4 text-green-500" weight="bold" />
    case 'failed':
      return <IconError className="h-4 w-4 text-destructive" weight="bold" />
    case 'running':
      return <IconSpinner className="h-4 w-4 animate-spin text-primary" />
    case 'stopped':
      return <IconStop className="h-4 w-4 text-muted-foreground" />
    default:
      return <IconCheck className="h-4 w-4 text-muted-foreground" weight="bold" />
  }
}

export function AgentManagerDrawer({
  projectId,
  isOpen,
  onClose,
  liveSteps,
  currentRunId,
  isStreaming,
  onStopRun,
  onNavigateToChat,
}: AgentManagerDrawerProps) {
  const [showProfiles, setShowProfiles] = useState(false)

  const recentRuns = useQuery(api.agentRuns.listRecentByProject, {
    projectId,
    limit: 10,
  }) as AgentRun[] | undefined

  // Find active run from recent runs or use currentRunId
  const activeRun = recentRuns?.find((run) => run.status === 'running' || run._id === currentRunId)

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="surface-1 shadow-sharp-lg fixed right-0 top-0 z-50 h-full w-[400px] border-l border-border"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <IconBot className="h-5 w-5 text-primary" weight="duotone" />
                <span className="font-mono text-sm font-medium">Agent Manager</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 rounded-none"
              >
                <IconX className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex h-[calc(100%-60px)] flex-col overflow-hidden">
              {/* Active Run Section */}
              {activeRun && (
                <div className="border-b border-border p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-mono text-[10px] font-medium uppercase tracking-wide text-primary">
                      Active Run
                    </span>
                    {isStreaming && onStopRun && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onStopRun}
                        className="h-6 rounded-none border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <IconStop className="mr-1 h-3 w-3" />
                        Stop
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="font-mono text-sm">
                      {activeRun.summary || activeRun.userMessage || 'Running...'}
                    </p>

                    <div className="flex items-center gap-3 font-mono text-xs text-muted-foreground">
                      <span className="bg-surface-2 rounded-none px-1.5 py-0.5">
                        {getModeLabel(activeRun.mode)}
                      </span>
                      {activeRun.model && <span>{activeRun.model}</span>}
                      <span>{formatDuration(activeRun.startedAt)}</span>
                      {liveSteps && liveSteps.length > 0 && <span>Step {liveSteps.length}</span>}
                    </div>

                    {liveSteps && liveSteps.length > 0 && (
                      <div className="mt-3 max-h-32 overflow-y-auto rounded-none border border-border bg-background p-2">
                        {liveSteps.slice(-3).map((step, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 py-1 font-mono text-[10px] text-muted-foreground"
                          >
                            <span className="text-primary">{step.category}</span>
                            <span className="truncate">
                              {step.details?.toolName || step.content}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Recent Runs Section */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-mono text-[10px] font-medium uppercase tracking-wide">
                    Recent Runs
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {recentRuns?.length || 0} runs
                  </span>
                </div>

                <div className="space-y-2">
                  {recentRuns?.map((run, index) => {
                    const taskSummary = run.summary || run.userMessage || 'Untitled task'
                    const truncatedSummary =
                      taskSummary.length > 60 ? `${taskSummary.slice(0, 57)}...` : taskSummary

                    return (
                      <motion.button
                        key={run._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        type="button"
                        onClick={() => onNavigateToChat?.(run.chatId)}
                        className="hover:bg-surface-2 flex w-full items-start gap-3 rounded-none border border-border bg-background p-3 text-left transition-colors"
                      >
                        <StatusIcon status={run.status} />

                        <div className="min-w-0 flex-1">
                          <p className="truncate font-mono text-xs">{truncatedSummary}</p>

                          <div className="mt-1 flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
                            <span className="bg-surface-2 rounded-none px-1">
                              {getModeLabel(run.mode)}
                            </span>
                            {run.model && <span>{run.model}</span>}
                            <span>{formatDuration(run.startedAt, run.completedAt)}</span>
                            <span>{formatRelativeTime(run.startedAt)}</span>
                          </div>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>

                {/* Agent Profiles Section */}
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => setShowProfiles(!showProfiles)}
                    className="flex w-full items-center justify-between py-2 font-mono text-[10px] font-medium uppercase tracking-wide transition-colors hover:text-primary"
                  >
                    <span>Agent Profiles</span>
                    {showProfiles ? (
                      <IconChevronDown className="h-3 w-3" />
                    ) : (
                      <IconChevronRight className="h-3 w-3" />
                    )}
                  </button>

                  <AnimatePresence>
                    {showProfiles && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-2 py-2">
                          {[
                            {
                              mode: 'code',
                              name: 'Code',
                              description: 'General implementation and coding tasks',
                            },
                            {
                              mode: 'plan',
                              name: 'Plan',
                              description: 'System design and planning mode',
                            },
                            {
                              mode: 'build',
                              name: 'Build',
                              description: 'Full implementation with automation',
                            },
                          ].map((profile) => (
                            <div
                              key={profile.mode}
                              className="rounded-none border border-border bg-background p-3"
                            >
                              <div className="flex items-center gap-2">
                                <IconBot className="h-4 w-4 text-primary" weight="duotone" />
                                <span className="font-mono text-xs font-medium">
                                  {profile.name}
                                </span>
                              </div>
                              <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                                {profile.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
