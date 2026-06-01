'use client'

import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { RunProgressPanel } from '@/components/chat/RunProgressPanel'
import { SnapshotTimeline } from '@/components/chat/SnapshotTimeline'
import { SubagentPanel, type PersistedSubagentRunRow } from '@/components/chat/SubagentPanel'
import type {
  LatestRunReceiptInfo,
  PersistedRunEventSummaryInfo,
  ToolCallInfo,
} from '@/components/chat/types'
import { AgentEventsPanel } from '@/components/panels/AgentEventsPanel'
import type { LiveProgressStep } from '@/components/chat/live-run-utils'
import type { FormalSpecification } from '@/lib/agent/spec/types'
import type { PlanStatus } from '@/lib/chat/planDraft'
import type { TracePersistenceStatus } from '@/hooks/useRunEventBuffer'
import type { PlanningSessionDebugSummary } from '@/components/plan/PlanningSessionDebugCard'
import type { DiffFileEntry } from '@/components/workbench/DiffTab'
import { PlanFileList } from '@/components/chat/inspector/InspectorPlanContent'

type InspectorChildRunSummary = {
  _id: Id<'agentRuns'> | string
  subagentName?: string
  status: 'running' | 'completed' | 'failed' | 'stopped'
  delegatedTaskSummary?: string
  summary?: string
  userMessage?: string
  error?: string
  startedAt: number
  completedAt?: number
  lastActivityAt?: number
  artifactCount?: number
  errorCategory?: 'registry' | 'policy' | 'isolation' | 'runtime' | 'persistence' | 'unknown'
  patchProposals?: Array<{
    kind: 'patch-proposal'
    title: string
    summary?: string
    files: string[]
    patch?: string
  }>
}

type InspectorRunTree = {
  children: InspectorChildRunSummary[]
}

type SnapshotEvent = {
  _id?: string
  type: string
  content?: string
  createdAt?: number
  snapshot?: {
    hash?: string
    step?: number
    files?: string[]
  }
}

export interface InspectorRunContentProps {
  chatId?: Id<'chats'> | null
  liveSteps: LiveProgressStep[]
  runEvents?: PersistedRunEventSummaryInfo[]
  latestRunReceipt?: LatestRunReceiptInfo | null
  isStreaming: boolean
  tracePersistenceStatus: TracePersistenceStatus
  onOpenFile: (path: string) => void
  onOpenArtifacts: () => void
  currentSpec: FormalSpecification | null
  planStatus?: PlanStatus | null
  planDraft: string
  onSpecClick: () => void
  onPlanClick: () => void
  onResumeRuntimeSession: (sessionID: string) => Promise<void>
  snapshotEvents: SnapshotEvent[]
  subagentToolCalls: ToolCallInfo[]
  planningDebug?: PlanningSessionDebugSummary | null
  pendingDiffEntries?: DiffFileEntry[]
}

function WalkthroughSummary({
  latestRunReceipt,
  runEvents,
  pendingDiffEntries = [],
}: {
  latestRunReceipt?: LatestRunReceiptInfo | null
  runEvents?: PersistedRunEventSummaryInfo[]
  pendingDiffEntries?: DiffFileEntry[]
}) {
  const receipt = latestRunReceipt?.receipt
  const receiptFiles = receipt?.webcontainer?.filesWritten ?? []
  const pendingFiles = pendingDiffEntries.map((entry) => entry.path)
  const eventFiles = (runEvents ?? []).flatMap((event) => event.targetFilePaths ?? [])
  const filesChanged = Array.from(new Set([...pendingFiles, ...receiptFiles, ...eventFiles])).slice(
    0,
    12
  )
  const commandsRun = receipt?.webcontainer?.commandsRun ?? []
  const validationEvidence = receipt?.validationEvidence ?? []
  const errorEvents = (runEvents ?? []).filter(
    (event) => event.status === 'error' || event.errorPreview
  )
  const hasWalkthrough = Boolean(receipt || filesChanged.length > 0 || commandsRun.length > 0)

  return (
    <div className="bg-background/80 border border-border">
      <div className="surface-1 border-b border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        Walkthrough
      </div>
      <div className="space-y-3 p-3">
        <div className="bg-background/70 border border-border p-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Summary
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {hasWalkthrough
              ? `Latest run ${latestRunReceipt?.status ?? 'activity'} captured ${filesChanged.length} changed file${filesChanged.length === 1 ? '' : 's'} and ${commandsRun.length} command${commandsRun.length === 1 ? '' : 's'}.`
              : 'A completed run walkthrough will appear here after Panda records changed files, commands, or validation evidence.'}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <PlanFileList
            title="Files changed"
            files={filesChanged}
            emptyLabel="No file changes recorded"
          />
          <div className="bg-background/80 border border-border px-3 py-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Commands run
            </div>
            {commandsRun.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {commandsRun.slice(0, 8).map((command, index) => (
                  <li
                    key={`${command.command}-${index}`}
                    className="truncate font-mono text-xs text-foreground"
                  >
                    {command.command}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">No commands recorded</p>
            )}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="bg-background/80 border border-border px-3 py-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Validation
            </div>
            {validationEvidence.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {validationEvidence.slice(0, 8).map((evidence) => (
                  <li key={evidence.changeType} className="text-xs text-muted-foreground">
                    <span className="font-mono text-foreground">{evidence.changeType}</span>:{' '}
                    {evidence.validationCommands.length || 0} validation command
                    {evidence.validationCommands.length === 1 ? '' : 's'}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">No validation evidence recorded</p>
            )}
          </div>
          <div className="bg-background/80 border border-border px-3 py-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Known issues
            </div>
            {errorEvents.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {errorEvents.slice(0, 5).map((event, index) => (
                  <li key={event._id ?? index} className="text-xs text-destructive">
                    {event.errorPreview ?? event.contentPreview ?? 'Run event reported an error'}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">No known issues recorded</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function formatRelativeRunTime(timestamp?: number): string | undefined {
  if (!timestamp) return undefined
  const diff = Math.max(0, Date.now() - timestamp)
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (days > 0) return `${days}d`
  if (hours > 0) return `${hours}h`
  if (minutes > 0) return `${minutes}m`
  return 'now'
}

function getLatestSnapshotSummary(events: InspectorRunContentProps['snapshotEvents']) {
  const snapshots = events.filter((event) => event.snapshot?.hash)
  return snapshots.at(-1) ?? null
}

export function InspectorRunContent({
  chatId,
  liveSteps,
  runEvents,
  latestRunReceipt,
  isStreaming,
  tracePersistenceStatus,
  onOpenFile,
  onOpenArtifacts,
  currentSpec,
  planStatus,
  planDraft,
  onSpecClick,
  onPlanClick,
  onResumeRuntimeSession,
  snapshotEvents,
  subagentToolCalls,
  planningDebug,
  pendingDiffEntries = [],
}: InspectorRunContentProps) {
  const hasActivePlan = Boolean(planStatus && planStatus !== 'idle')
  const hasSpec = Boolean(currentSpec)
  const hasSnapshots = snapshotEvents.length > 0
  const latestSnapshot = getLatestSnapshotSummary(snapshotEvents)
  const runTree = useQuery(
    api.agentRuns.listRunTree,
    latestRunReceipt?.runId
      ? { runId: latestRunReceipt.runId as Id<'agentRuns'>, childLimit: 40 }
      : 'skip'
  ) as InspectorRunTree | undefined
  const persistedSubagents: PersistedSubagentRunRow[] = (runTree?.children ?? []).map((child) => {
    const startedAt = child.startedAt
    const completedAt = child.completedAt
    return {
      id: String(child._id),
      name: child.subagentName ?? 'subagent',
      status: child.status,
      summary: child.delegatedTaskSummary ?? child.summary ?? child.userMessage ?? 'Delegated task',
      lastActivity: formatRelativeRunTime(child.lastActivityAt ?? completedAt ?? startedAt),
      durationMs: completedAt ? completedAt - startedAt : undefined,
      error: child.error,
      artifactCount: child.artifactCount,
      patchProposalCount: child.patchProposals?.length,
      patchProposals: child.patchProposals,
      errorCategory: child.errorCategory,
    }
  })
  const hasSubagents = subagentToolCalls.length > 0 || persistedSubagents.length > 0

  return (
    <div className="m-0 space-y-3">
      <div className="grid grid-cols-2 gap-1.5">
        <div className="bg-background/70 border border-border px-3 py-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Execution
          </div>
          <div className="mt-1 text-xs font-medium text-foreground">
            {isStreaming ? 'Running' : 'Idle'}
          </div>
        </div>
        <div className="bg-background/70 border border-border px-3 py-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Plan context
          </div>
          <div className="mt-1 text-xs font-medium text-foreground">
            {hasActivePlan ? planStatus?.replace('_', ' ') : 'None'}
          </div>
        </div>
        <div className="bg-background/70 border border-border px-3 py-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Snapshots
          </div>
          <div className="mt-1 text-xs font-medium text-foreground">
            {hasSnapshots ? `${snapshotEvents.length} captured` : 'None'}
          </div>
        </div>
        <div className="bg-background/70 border border-border px-3 py-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Constraints
          </div>
          <div className="mt-1 text-xs font-medium text-foreground">
            {hasSpec ? (currentSpec?.status ?? 'Attached') : 'None'}
          </div>
        </div>
      </div>

      <div className="bg-background/80 border border-border">
        <div className="surface-1 border-b border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Run timeline
        </div>
        <div className="p-3">
          <RunProgressPanel
            chatId={chatId}
            liveSteps={liveSteps}
            runEvents={runEvents}
            latestRunReceipt={latestRunReceipt?.receipt ?? null}
            isStreaming={isStreaming}
            tracePersistenceStatus={tracePersistenceStatus}
            onOpenFile={onOpenFile}
            onOpenArtifacts={onOpenArtifacts}
            currentSpec={currentSpec}
            planStatus={planStatus}
            planDraft={planDraft}
            onSpecClick={onSpecClick}
            onPlanClick={onPlanClick}
            onResumeRuntimeSession={onResumeRuntimeSession}
            planningDebug={planningDebug}
          />
        </div>
      </div>

      <WalkthroughSummary
        latestRunReceipt={latestRunReceipt}
        runEvents={runEvents}
        pendingDiffEntries={pendingDiffEntries}
      />

      <div className="bg-background/80 border border-border">
        <div className="surface-1 border-b border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Agent events
        </div>
        <div className="h-40 min-h-0 p-3">
          <AgentEventsPanel />
        </div>
      </div>

      <div className="bg-background/80 border border-border">
        <div className="surface-1 border-b border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Recovery and delegation
        </div>
        <div className="space-y-3 p-3">
          <div className="bg-background/70 border border-border p-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Recovery checkpoint
            </div>
            {latestSnapshot?.snapshot?.hash ? (
              <div className="mt-2 space-y-1">
                <div className="font-mono text-xs text-foreground">
                  Latest snapshot: {latestSnapshot.snapshot.hash.slice(0, 8)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Use the snapshot timeline below to view diffs or restore work before accepting
                  generated changes.
                </p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                Recovery checkpoints will appear here after the runtime captures a snapshot.
              </p>
            )}
          </div>
          {hasSnapshots ? <SnapshotTimeline events={snapshotEvents} /> : null}
          {hasSubagents ? (
            <SubagentPanel toolCalls={subagentToolCalls} persistedSubagents={persistedSubagents} />
          ) : null}
          {!hasSnapshots && !hasSubagents ? (
            <p className="font-mono text-xs text-muted-foreground">
              Delegated subagent activity will appear here when it is available.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
