import type { Id } from '@convex/_generated/dataModel'

export type SessionRailState = 'idle' | 'running' | 'blocked' | 'review' | 'complete'

export interface RecentRunSummary {
  _id: Id<'agentRuns'> | string
  chatId: Id<'chats'> | string
  status: 'running' | 'completed' | 'failed' | 'stopped'
  userMessage?: string
  summary?: string
  error?: string
  changedFiles: number
  approvalCount: number
  resultStatus?: 'complete' | 'error' | 'aborted' | 'approval_timeout'
  startedAt: number
  completedAt?: number
}

export interface SessionRailTask {
  id: string
  chatId: string
  title: string
  status: 'running' | 'waiting' | 'review' | 'failed' | 'complete'
  lastActivity: string
  changedFiles: number
}

export interface SessionRailSummary {
  state: SessionRailState
  label: string
  count: number
  tasks: SessionRailTask[]
}

export interface SessionRailGroup {
  id: 'active' | 'needs_review' | 'recent' | 'idle'
  label: string
  sessions: SessionRailTask[]
}

function formatRelativeTime(timestamp: number, now: number): string {
  const diff = Math.max(0, now - timestamp)
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (days > 0) return `${days}d`
  if (hours > 0) return `${hours}h`
  if (minutes > 0) return `${minutes}m`
  return 'now'
}

function runState(run: RecentRunSummary): SessionRailTask['status'] {
  if (run.status === 'running') return 'running'
  if (run.status === 'failed' || run.resultStatus === 'error') return 'failed'
  if (run.resultStatus === 'approval_timeout') return 'waiting'
  if (run.changedFiles > 0) return 'review'
  return 'complete'
}

function summarizeState(
  tasks: SessionRailTask[]
): Pick<SessionRailSummary, 'state' | 'label' | 'count'> {
  const running = tasks.filter((task) => task.status === 'running').length
  if (running > 0) return { state: 'running', label: 'Running', count: running }

  const blocked = tasks.filter(
    (task) => task.status === 'waiting' || task.status === 'failed'
  ).length
  if (blocked > 0) return { state: 'blocked', label: 'Needs attention', count: blocked }

  const review = tasks.filter((task) => task.status === 'review').length
  if (review > 0) return { state: 'review', label: 'Review ready', count: review }

  const complete = tasks.filter((task) => task.status === 'complete').length
  if (complete > 0) return { state: 'complete', label: 'Complete', count: complete }

  return { state: 'idle', label: 'Idle', count: 0 }
}

export function buildSessionRailSummary(args: {
  runs?: readonly RecentRunSummary[] | null
  activeChatId?: Id<'chats'> | string | null
  activeChatTitle?: string | null
  isStreaming?: boolean
  pendingChangedFilesCount?: number
  now?: number
}): SessionRailSummary {
  const now = args.now ?? Date.now()
  const tasks = (args.runs ?? []).slice(0, 8).map<SessionRailTask>((run) => {
    const isActiveChat = args.activeChatId
      ? String(run.chatId) === String(args.activeChatId)
      : false
    const status = args.isStreaming && isActiveChat ? 'running' : runState(run)
    const changedFiles = isActiveChat
      ? Math.max(run.changedFiles, args.pendingChangedFilesCount ?? 0)
      : run.changedFiles

    return {
      id: String(run._id),
      chatId: String(run.chatId),
      title:
        (isActiveChat ? args.activeChatTitle : null) ??
        run.summary ??
        run.userMessage ??
        'Agent run',
      status,
      lastActivity: formatRelativeTime(run.completedAt ?? run.startedAt, now),
      changedFiles,
    }
  })

  if (
    args.isStreaming &&
    args.activeChatId &&
    !tasks.some((task) => task.chatId === String(args.activeChatId))
  ) {
    tasks.unshift({
      id: 'active-run',
      chatId: String(args.activeChatId),
      title: args.activeChatTitle ?? 'Active task',
      status: 'running',
      lastActivity: 'now',
      changedFiles: args.pendingChangedFilesCount ?? 0,
    })
  }

  return {
    ...summarizeState(tasks),
    tasks,
  }
}

export function buildSessionRailGroups(tasks: readonly SessionRailTask[]): SessionRailGroup[] {
  const active = tasks.filter((task) => task.status === 'running')
  const needsReview = tasks.filter(
    (task) => task.status === 'waiting' || task.status === 'failed' || task.status === 'review'
  )
  const recent = tasks.filter((task) => task.status === 'complete')

  return [
    { id: 'active', label: 'Active session', sessions: active },
    { id: 'needs_review', label: 'Needs review', sessions: needsReview },
    { id: 'recent', label: 'Recent sessions', sessions: recent },
    { id: 'idle', label: 'Idle sessions', sessions: [] },
  ]
}
