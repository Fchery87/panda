'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { Check, Copy, Settings2, X } from 'lucide-react'
import { EvalPanel } from '@/components/chat/EvalPanel'
import { MemoryBankEditor } from '@/components/chat/MemoryBankEditor'
import { RunProgressPanel } from '@/components/chat/RunProgressPanel'
import { SnapshotTimeline } from '@/components/chat/SnapshotTimeline'
import { SubagentPanel, type PersistedSubagentRunRow } from '@/components/chat/SubagentPanel'
import type {
  LatestRunReceiptInfo,
  PersistedRunEventSummaryInfo,
  ToolCallInfo,
} from '@/components/chat/types'
import { PlanningIntakeSurface } from '@/components/plan/PlanningIntakePopup'
import { PlanPanel } from '@/components/plan/PlanPanel'
import { ArtifactPanel } from '@/components/artifacts/ArtifactPanel'
import { WorkflowArtifactsPanel } from '@/components/workbench/WorkflowArtifactsPanel'
import { WorkflowChainsPanel } from '@/components/workbench/WorkflowChainsPanel'
import { AdvisorReviewsPanel } from '@/components/workbench/AdvisorReviewsPanel'
import { AdvisorReviewRequestsPanel } from '@/components/workbench/AdvisorReviewRequestsPanel'
import { AgentEventsPanel } from '@/components/panels/AgentEventsPanel'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { LiveProgressStep } from '@/components/chat/live-run-utils'
import type { FormalSpecification } from '@/lib/agent/spec/types'
import type { PlanStatus } from '@/lib/chat/planDraft'
import type { ChatMode } from '@/lib/agent/prompt-library'
import type { TracePersistenceStatus } from '@/hooks/useRunEventBuffer'
import type { PlanningSessionDebugSummary } from '@/components/plan/PlanningSessionDebugCard'
import type { GeneratedPlanArtifact, PlanningAnswer, PlanningQuestion } from '@/lib/planning/types'
import type { DiffFileEntry } from '@/components/workbench/DiffTab'
import { cn } from '@/lib/utils'

type PlanningSessionView = {
  sessionId: string
  status: string
  questions: PlanningQuestion[]
  answers: PlanningAnswer[]
  generatedPlan?: GeneratedPlanArtifact
} | null

export type InspectorTab = 'run' | 'context' | 'plan' | 'artifacts' | 'research' | 'memory' | 'evals'
export type ReviewTab = InspectorTab

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


function InspectorResearchContent({
  projectId,
  chatId,
}: {
  projectId: Id<'projects'>
  chatId: Id<'chats'> | null | undefined
}) {
  const [copiedSourceId, setCopiedSourceId] = useState<string | null>(null)
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null)
  const sources = useQuery(api.researchSources.listByProject, {
    projectId,
    ...(chatId ? { chatId } : {}),
    limit: 50,
  }) as
    | Array<{
        _id: string
        kind: string
        url: string
        title?: string
        provider?: string
        summary?: string
        createdAt: number
      }>
    | undefined
  const selectedSource = useQuery(
    api.researchSources.get,
    selectedSourceId ? { sourceId: selectedSourceId as Id<'researchSources'> } : 'skip'
  ) as
    | {
        _id: string
        kind: string
        url: string
        title?: string
        provider?: string
        summary?: string
        extractedMarkdown?: string
        createdAt: number
      }
    | null
    | undefined

  const copyText = (sourceId: string, text: string) => {
    void navigator.clipboard?.writeText(text)
    setCopiedSourceId(sourceId)
    window.setTimeout(() => setCopiedSourceId(null), 1200)
  }

  return (
    <div className="m-0 grid h-[420px] grid-cols-1 overflow-hidden border border-border bg-background md:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)]">
      <div className="min-h-0 overflow-y-auto p-3">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Research sources
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              External web, search, GitHub, and PDF sources captured for this chat/project.
            </p>
          </div>
          <div className="border border-border px-2 py-1 font-mono text-[10px] uppercase text-muted-foreground">
            {sources ? sources.length : '…'} sources
          </div>
        </div>

        {!sources ? (
          <div className="border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
            Loading research sources…
          </div>
        ) : sources.length === 0 ? (
          <div className="border border-dashed border-border bg-muted/10 p-4 text-xs text-muted-foreground">
            No research sources yet. Ask Panda to fetch a URL, inspect a GitHub repo, or run web research.
          </div>
        ) : (
          <div className="space-y-2">
            {sources.map((source) => (
              <div
                key={source._id}
                className={cn(
                  'cursor-pointer border bg-card p-3 transition-colors',
                  selectedSourceId === source._id ? 'border-primary/60' : 'border-border hover:border-primary/30'
                )}
                onClick={() => setSelectedSourceId(source._id)}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="border border-primary/30 bg-primary/5 px-1.5 py-0.5 font-mono text-[10px] uppercase text-primary">
                      {source.kind.replace('_', ' ')}
                    </span>
                    {source.provider ? (
                      <span className="border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
                        {source.provider}
                      </span>
                    ) : null}
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {new Date(source.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 rounded-none px-2 font-mono text-[10px] uppercase tracking-[0.14em]"
                    onClick={(event) => {
                      event.stopPropagation()
                      copyText(source._id, `[${source.title ?? source.url}](${source.url}) — source:${source._id}`)
                    }}
                  >
                    {copiedSourceId === source._id ? (
                      <Check className="mr-1 h-3 w-3" />
                    ) : (
                      <Copy className="mr-1 h-3 w-3" />
                    )}
                    Copy cite
                  </Button>
                </div>
                <div className="mt-2 text-sm font-medium text-foreground [overflow-wrap:anywhere]">
                  {source.title ?? source.url}
                </div>
                {source.summary ? (
                  <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                    {source.summary}
                  </p>
                ) : null}
                <a
                  href={source.url.startsWith('search:') ? undefined : source.url}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    'mt-2 block font-mono text-[11px] [overflow-wrap:anywhere]',
                    source.url.startsWith('search:')
                      ? 'pointer-events-none text-muted-foreground'
                      : 'text-primary hover:underline'
                  )}
                  onClick={(event) => event.stopPropagation()}
                >
                  {source.url}
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="min-h-0 overflow-y-auto border-t border-border bg-muted/10 p-3 md:border-l md:border-t-0">
        {!selectedSourceId ? (
          <div className="border border-dashed border-border bg-background/60 p-4 text-xs text-muted-foreground">
            Select a research source to inspect extracted content, summary, and copy reusable context.
          </div>
        ) : !selectedSource ? (
          <div className="border border-border bg-background/60 p-3 text-xs text-muted-foreground">
            Loading source detail…
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Source detail
              </div>
              <h3 className="mt-1 text-sm font-semibold text-foreground [overflow-wrap:anywhere]">
                {selectedSource.title ?? selectedSource.url}
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 rounded-none px-2 font-mono text-[10px] uppercase tracking-[0.14em]"
                  onClick={() =>
                    copyText(
                      selectedSource._id,
                      `[${selectedSource.title ?? selectedSource.url}](${selectedSource.url}) — source:${selectedSource._id}`
                    )
                  }
                >
                  <Copy className="mr-1 h-3 w-3" /> Copy citation
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 rounded-none px-2 font-mono text-[10px] uppercase tracking-[0.14em]"
                  onClick={() =>
                    copyText(
                      selectedSource._id,
                      `SOURCE_ID: ${selectedSource._id}\nSOURCE_URL: ${selectedSource.url}\nTRUST_LEVEL: untrusted_external_content\n\n${selectedSource.extractedMarkdown ?? selectedSource.summary ?? ''}`
                    )
                  }
                >
                  <Copy className="mr-1 h-3 w-3" /> Copy content
                </Button>
              </div>
            </div>
            {selectedSource.summary ? (
              <div className="border border-border bg-background p-2">
                <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Summary
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">{selectedSource.summary}</p>
              </div>
            ) : null}
            <div className="border border-border bg-background p-2">
              <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Extracted preview
              </div>
              <pre className="max-h-56 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                {(selectedSource.extractedMarkdown ?? selectedSource.summary ?? 'No extracted content stored.').slice(0, 8000)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
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
  const errorEvents = (runEvents ?? []).filter((event) => event.status === 'error' || event.errorPreview)
  const hasWalkthrough = Boolean(receipt || filesChanged.length > 0 || commandsRun.length > 0)

  return (
    <div className="bg-background/80 border border-border">
      <div className="surface-1 border-b border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        Walkthrough
      </div>
      <div className="space-y-3 p-3">
        <div className="border border-border bg-background/70 p-3">
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
          <PlanFileList title="Files changed" files={filesChanged} emptyLabel="No file changes recorded" />
          <div className="bg-background/80 border border-border px-3 py-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Commands run
            </div>
            {commandsRun.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {commandsRun.slice(0, 8).map((command, index) => (
                  <li key={`${command.command}-${index}`} className="truncate font-mono text-xs text-foreground">
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
                    <span className="font-mono text-foreground">{evidence.changeType}</span>: {evidence.validationCommands.length || 0} validation command{evidence.validationCommands.length === 1 ? '' : 's'}
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
          <div className="border border-border bg-background/70 p-3">
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
            <SubagentPanel
              toolCalls={subagentToolCalls}
              persistedSubagents={persistedSubagents}
            />
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

function InspectorContextContent({
  projectId,
  runEvents,
}: {
  projectId: Id<'projects'>
  runEvents?: PersistedRunEventSummaryInfo[]
}) {
  const contextEvents = (runEvents ?? []).filter(
    (event) => event.type === 'context_pack' || event.progressCategory === 'context'
  )
  const latest = contextEvents.at(-1)
  const stats = useQuery(api.contextChunks.stats, { projectId })
  const rebuildProject = useMutation(api.contextChunks.rebuildProject)
  const purgeProject = useMutation(api.contextChunks.purgeProject)

  return (
    <div className="m-0 space-y-3">
      <div className="grid grid-cols-3 gap-1.5">
        <div className="bg-background/70 border border-border px-3 py-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Packs
          </div>
          <div className="mt-1 text-xs font-medium text-foreground">{contextEvents.length}</div>
        </div>
        <div className="bg-background/70 border border-border px-3 py-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Status
          </div>
          <div className="mt-1 text-xs font-medium text-foreground">
            {latest?.status ?? 'Not built'}
          </div>
        </div>
        <div className="bg-background/70 border border-border px-3 py-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Source
          </div>
          <div className="mt-1 text-xs font-medium text-foreground">Convex</div>
        </div>
      </div>

      <div className="bg-background/80 border border-border">
        <div className="surface-1 flex items-center justify-between border-b border-border px-3 py-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Index maintenance
          </div>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 rounded-none font-mono text-[10px]"
              onClick={() => void rebuildProject({ projectId })}
            >
              Rebuild
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 rounded-none font-mono text-[10px]"
              onClick={() => void purgeProject({ projectId })}
            >
              Purge
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1.5 p-3">
          <div className="bg-background/70 border border-border px-2 py-2">
            <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
              Chunks
            </div>
            <div className="mt-1 text-xs font-medium text-foreground">
              {stats?.chunkCount ?? '—'}
            </div>
          </div>
          <div className="bg-background/70 border border-border px-2 py-2">
            <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
              Tokens
            </div>
            <div className="mt-1 text-xs font-medium text-foreground">
              {stats?.tokenCount ?? '—'}
            </div>
          </div>
          <div className="bg-background/70 border border-border px-2 py-2">
            <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
              Sources
            </div>
            <div className="mt-1 text-xs font-medium text-foreground">
              {stats ? Object.keys(stats.bySourceType).length : '—'}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-background/80 border border-border">
        <div className="surface-1 border-b border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Retrieval audit
        </div>
        <div className="space-y-2 p-3">
          {contextEvents.length > 0 ? (
            contextEvents.map((event) => (
              <div
                key={event._id ?? `${event.type}-${event.createdAt}`}
                className="bg-background/70 border border-border p-2"
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  {event.createdAt
                    ? new Date(event.createdAt).toLocaleTimeString()
                    : 'Context Pack'}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-foreground">
                  {event.contentPreview ?? 'Context pack was assembled for this run.'}
                </p>
              </div>
            ))
          ) : (
            <p className="font-mono text-xs text-muted-foreground">
              Retrieved context pack audits will appear here after a run starts.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

type PlanLifecycleStep = {
  label: string
  state: 'done' | 'active' | 'upcoming'
}

function getPlanLifecycleSteps(
  artifactStatus?: GeneratedPlanArtifact['status'],
  planStatus?: PlanStatus | null
): PlanLifecycleStep[] {
  const hasDraft = Boolean(planStatus && planStatus !== 'idle') || Boolean(artifactStatus)
  const order = ['Draft', 'Review', 'Approved', 'Building', 'Changes', 'Verified']
  const activeIndex = artifactStatus
    ? artifactStatus === 'ready_for_review'
      ? 1
      : artifactStatus === 'accepted'
        ? 2
        : artifactStatus === 'executing'
          ? 3
          : artifactStatus === 'completed'
            ? 5
            : artifactStatus === 'failed'
              ? 4
              : 0
    : hasDraft
      ? 0
      : -1

  return order.map((label, index) => ({
    label,
    state: index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'upcoming',
  }))
}

function extractPlanFilePaths(artifact?: GeneratedPlanArtifact | null): string[] {
  if (!artifact) return []
  const content = [artifact.summary, artifact.markdown, ...artifact.sections.map((s) => s.content)]
    .filter(Boolean)
    .join('\n')
  const matches = content.match(/(?:[\w.-]+\/)+[\w.-]+\.[A-Za-z0-9]+/g) ?? []
  return Array.from(new Set(matches)).slice(0, 12)
}

function PlanFileList({
  title,
  files,
  emptyLabel,
}: {
  title: string
  files: string[]
  emptyLabel: string
}) {
  return (
    <div className="bg-background/80 border border-border px-3 py-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </div>
      {files.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {files.map((file) => (
            <li key={file} className="truncate font-mono text-xs text-foreground">
              {file}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">{emptyLabel}</p>
      )}
    </div>
  )
}

export interface InspectorPlanContentProps {
  planDraft: string
  generatedPlanArtifact?: GeneratedPlanArtifact | null
  planStatus?: PlanStatus | null
  onPlanDraftChange: (value: string) => void
  onSavePlanDraft: () => void
  onApprovePlan: () => void
  onBuildFromPlan: () => void
  isSavingPlanDraft: boolean
  lastSavedAt?: number | null
  lastGeneratedAt?: number | null
  approveDisabled: boolean
  buildDisabled: boolean
  pendingDiffEntries?: DiffFileEntry[]
  onReviewDiff?: () => void
}

export function InspectorPlanContent({
  planDraft,
  generatedPlanArtifact,
  planStatus,
  onPlanDraftChange,
  onSavePlanDraft,
  onApprovePlan,
  onBuildFromPlan,
  isSavingPlanDraft,
  lastSavedAt,
  lastGeneratedAt,
  approveDisabled,
  buildDisabled,
  pendingDiffEntries = [],
  onReviewDiff,
}: InspectorPlanContentProps) {
  const generatedSummary = generatedPlanArtifact?.summary?.trim() || null
  const acceptanceCheckCount = generatedPlanArtifact?.acceptanceChecks.length ?? 0
  const expectedFiles = extractPlanFilePaths(generatedPlanArtifact)
  const actualChangedFiles = Array.from(new Set(pendingDiffEntries.map((entry) => entry.path)))
  const lifecycleSteps = getPlanLifecycleSteps(generatedPlanArtifact?.status, planStatus)

  return (
    <div className="m-0 space-y-3">
      <div className="grid grid-cols-3 gap-1.5">
        <div className="bg-background/70 border border-border px-2 py-2">
          <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
            Plan status
          </div>
          <div className="mt-1 text-xs font-medium text-foreground">
            {(planStatus ?? 'idle').replace('_', ' ')}
          </div>
        </div>
        <div className="bg-background/70 border border-border px-2 py-2">
          <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
            Acceptance checks
          </div>
          <div className="mt-1 text-xs font-medium text-foreground">
            {acceptanceCheckCount || 'None'}
          </div>
        </div>
        <div className="bg-background/70 border border-border px-2 py-2">
          <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
            Draft
          </div>
          <div className="mt-1 text-xs font-medium text-foreground">
            {isSavingPlanDraft ? 'Saving' : lastSavedAt ? 'Saved' : 'Unsaved'}
          </div>
        </div>
      </div>

      <div className="bg-background/80 border border-border px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Implementation lifecycle
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Plan context moves from draft to reviewed changes and proof.
            </p>
          </div>
          {actualChangedFiles.length > 0 && onReviewDiff ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 shrink-0 rounded-none font-mono text-[10px] uppercase tracking-[0.16em]"
              onClick={onReviewDiff}
            >
              Open Review Diff
            </Button>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {lifecycleSteps.map((step) => (
            <span
              key={step.label}
              className={cn(
                'border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em]',
                step.state === 'done' && 'border-primary/30 bg-primary/10 text-primary',
                step.state === 'active' &&
                  'border-[oklch(var(--status-warning)/0.35)] bg-[oklch(var(--status-warning)/0.1)] text-[oklch(var(--status-warning))]',
                step.state === 'upcoming' && 'border-border bg-background/60 text-muted-foreground'
              )}
            >
              {step.label}
            </span>
          ))}
        </div>
      </div>

      {(expectedFiles.length > 0 || actualChangedFiles.length > 0) && (
        <div className="grid gap-3 md:grid-cols-2">
          <PlanFileList title="Expected files" files={expectedFiles} emptyLabel="Not specified" />
          <PlanFileList
            title="Actual changed files"
            files={actualChangedFiles}
            emptyLabel="No generated changes yet"
          />
        </div>
      )}

      {generatedSummary ? (
        <div className="bg-background/80 border border-border px-3 py-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Plan summary
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{generatedSummary}</p>
        </div>
      ) : null}

      <div className="m-0 border border-border bg-background">
        <PlanPanel
          planDraft={planDraft}
          generatedPlanArtifact={generatedPlanArtifact}
          planStatus={planStatus ?? 'idle'}
          onChange={onPlanDraftChange}
          onSave={onSavePlanDraft}
          onApprove={onApprovePlan}
          onBuildFromPlan={onBuildFromPlan}
          isSaving={isSavingPlanDraft}
          lastSavedAt={lastSavedAt ?? null}
          lastGeneratedAt={lastGeneratedAt ?? null}
          approveDisabled={approveDisabled}
          buildDisabled={buildDisabled}
        />
      </div>
    </div>
  )
}

export interface InspectorMemoryContentProps {
  memoryBank: string | null | undefined
  onSaveMemoryBank: (content: string) => Promise<void>
}

export function InspectorMemoryContent({
  memoryBank,
  onSaveMemoryBank,
}: InspectorMemoryContentProps) {
  return (
    <div className="m-0 space-y-3">
      <div className="bg-background/80 border border-border px-3 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Project memory
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Keep durable instructions and project context here so future runs stay aligned without
          repeating yourself.
        </p>
      </div>
      <div className="border border-border bg-background">
        <MemoryBankEditor memoryBank={memoryBank} onSave={onSaveMemoryBank} />
      </div>
    </div>
  )
}

export interface InspectorEvalsContentProps {
  projectId: Id<'projects'>
  chatId?: Id<'chats'> | null
  lastUserPrompt?: string | null
  lastAssistantReply?: string | null
  onRunEvalScenario?: (scenario: {
    input?: unknown
    prompt?: string
    expected?: unknown
    mode?: string
    evalMode?: 'read_only' | 'full'
    subagentName?: string
  }) => Promise<{
    output: string
    error?: string
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number }
  }>
}

export function InspectorEvalsContent({
  projectId,
  chatId,
  lastUserPrompt,
  lastAssistantReply,
  onRunEvalScenario,
}: InspectorEvalsContentProps) {
  return (
    <div className="m-0 space-y-3">
      <div className="bg-background/80 border border-border px-3 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Eval checks
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Re-run common prompts and verification scenarios without leaving the active project
          context.
        </p>
      </div>
      <div className="border border-border bg-background">
        <EvalPanel
          projectId={projectId}
          chatId={chatId}
          lastUserPrompt={lastUserPrompt}
          lastAssistantReply={lastAssistantReply}
          onRunScenario={onRunEvalScenario}
        />
      </div>
    </div>
  )
}

export interface ProjectChatInspectorProps
  extends
    InspectorRunContentProps,
    InspectorPlanContentProps,
    InspectorMemoryContentProps,
    InspectorEvalsContentProps {
  isMobileLayout: boolean
  isOpen: boolean
  tab: InspectorTab
  planningSession: PlanningSessionView
  planningCurrentQuestion: PlanningQuestion | null
  onStartPlanningIntake: () => Promise<unknown> | unknown
  onAnswerPlanningQuestion: (input: {
    questionId: string
    selectedOptionId?: string
    freeformValue?: string
    source: 'suggestion' | 'freeform'
  }) => Promise<unknown> | unknown
  onClearPlanningIntake: () => Promise<unknown> | unknown
  onStartWorkflowChain?: (
    prompt: string,
    targetMode?: ChatMode,
    metadata?: { workflowChainId: Id<'workflowChains'>; workflowChainStepId: string }
  ) => void
  onOpenChange: (open: boolean) => void
  onTabChange: (tab: InspectorTab) => void
}

export function ProjectChatInspector({
  projectId,
  chatId,
  isMobileLayout,
  isOpen,
  tab,
  planningSession,
  planningCurrentQuestion,
  onStartPlanningIntake,
  onAnswerPlanningQuestion,
  onClearPlanningIntake,
  onStartWorkflowChain,
  onOpenChange,
  onTabChange,
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
  onPlanDraftChange,
  onSavePlanDraft,
  onApprovePlan,
  onBuildFromPlan,
  isSavingPlanDraft,
  lastSavedAt,
  lastGeneratedAt,
  approveDisabled,
  buildDisabled,
  memoryBank,
  onSaveMemoryBank,
  lastUserPrompt,
  lastAssistantReply,
  onRunEvalScenario,
}: ProjectChatInspectorProps) {
  const tabs = (
    <div className="space-y-3">
      <PlanningIntakeSurface
        session={planningSession}
        currentQuestion={planningCurrentQuestion}
        onStartIntake={onStartPlanningIntake}
        onAnswerQuestion={onAnswerPlanningQuestion}
        onClearIntake={onClearPlanningIntake}
        key={planningSession?.sessionId ?? 'planning-intake'}
      />
      <Tabs
        value={tab}
        onValueChange={(value) => onTabChange(value as InspectorTab)}
        className="gap-2"
      >
        <div className="overflow-x-auto pb-1">
          <TabsList className="shadow-sharp-sm bg-background/90 h-9 min-w-max justify-start rounded-none border border-border p-0 font-mono text-xs">
            <TabsTrigger
              value="run"
              className="h-full rounded-none border-r border-border px-3 font-mono text-[11px] uppercase tracking-[0.18em] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Run
            </TabsTrigger>
            <TabsTrigger
              value="context"
              className="h-full rounded-none border-r border-border px-3 font-mono text-[11px] uppercase tracking-[0.18em] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Context
            </TabsTrigger>
            <TabsTrigger
              value="plan"
              className="h-full rounded-none border-r border-border px-3 font-mono text-[11px] uppercase tracking-[0.18em] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Plan
            </TabsTrigger>
            <TabsTrigger
              value="artifacts"
              className="h-full rounded-none border-r border-border px-3 font-mono text-[11px] uppercase tracking-[0.18em] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Artifacts
            </TabsTrigger>
            <TabsTrigger
              value="research"
              className="h-full rounded-none border-r border-border px-3 font-mono text-[11px] uppercase tracking-[0.18em] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Research
            </TabsTrigger>
            <TabsTrigger
              value="memory"
              className="h-full rounded-none border-r border-border px-3 font-mono text-[11px] uppercase tracking-[0.18em] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Memory
            </TabsTrigger>
            <TabsTrigger
              value="evals"
              className="h-full rounded-none px-3 font-mono text-[11px] uppercase tracking-[0.18em] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Evals
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="run" className="m-0">
          <InspectorRunContent
            chatId={chatId}
            liveSteps={liveSteps}
            runEvents={runEvents}
            latestRunReceipt={latestRunReceipt}
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
            snapshotEvents={snapshotEvents}
            subagentToolCalls={subagentToolCalls}
          />
        </TabsContent>

        <TabsContent value="context" className="m-0">
          <InspectorContextContent projectId={projectId} runEvents={runEvents} />
        </TabsContent>

        <TabsContent value="plan" className="m-0">
          <div className="mb-3 space-y-3">
            <div className="border border-border bg-background p-3">
              <WorkflowChainsPanel
                projectId={projectId}
                chatId={chatId}
                userGoal={lastUserPrompt}
                onStartChain={onStartWorkflowChain}
              />
            </div>
            <div className="border border-border bg-background p-3">
              <AdvisorReviewRequestsPanel chatId={chatId} />
            </div>
            <div className="border border-border bg-background p-3">
              <AdvisorReviewsPanel chatId={chatId} />
            </div>
          </div>
          <InspectorPlanContent
            planDraft={planDraft}
            generatedPlanArtifact={planningSession?.generatedPlan ?? null}
            planStatus={planStatus}
            onPlanDraftChange={onPlanDraftChange}
            onSavePlanDraft={onSavePlanDraft}
            onApprovePlan={onApprovePlan}
            onBuildFromPlan={onBuildFromPlan}
            isSavingPlanDraft={isSavingPlanDraft}
            lastSavedAt={lastSavedAt}
            lastGeneratedAt={lastGeneratedAt}
            approveDisabled={approveDisabled}
            buildDisabled={buildDisabled}
          />
        </TabsContent>

        <TabsContent value="artifacts" className="m-0">
          <div className="m-0 h-[420px] space-y-3 overflow-y-auto border border-border bg-background p-3">
            <WorkflowArtifactsPanel chatId={chatId} />
            <div className="border-t border-border pt-3">
              <ArtifactPanel projectId={projectId} chatId={chatId} position="right" />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="research" className="m-0">
          <InspectorResearchContent projectId={projectId} chatId={chatId} />
        </TabsContent>

        <TabsContent value="memory" className="m-0">
          <InspectorMemoryContent memoryBank={memoryBank} onSaveMemoryBank={onSaveMemoryBank} />
        </TabsContent>

        <TabsContent value="evals" className="m-0">
          <InspectorEvalsContent
            projectId={projectId}
            chatId={chatId}
            lastUserPrompt={lastUserPrompt}
            lastAssistantReply={lastAssistantReply}
            onRunEvalScenario={onRunEvalScenario}
          />
        </TabsContent>
      </Tabs>
    </div>
  )

  return (
    <AnimatePresence>
      {isMobileLayout && isOpen ? (
        <>
          <motion.button
            type="button"
            aria-label="Close inspector"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            className="bg-background/55 absolute inset-0 z-20 backdrop-blur-[1px]"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="shadow-sharp-lg absolute inset-x-0 bottom-0 z-30 max-h-[85vh] border-t border-border bg-background sm:inset-x-3 sm:bottom-3 sm:max-h-[75vh] sm:border"
          >
            <div className="bg-background/90 flex items-center justify-between border-b border-border px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="h-1 w-8 bg-border sm:hidden" />
                <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wide">
                  <Settings2 className="h-3.5 w-3.5 text-primary" />
                  Evidence
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-none"
                onClick={() => onOpenChange(false)}
                aria-label="Close inspector"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="max-h-[calc(85vh-44px)] overflow-y-auto p-2 pb-[env(safe-area-inset-bottom)] sm:max-h-[calc(75vh-44px)] sm:p-3">
              {tabs}
            </div>
          </motion.div>
        </>
      ) : null}

      {!isMobileLayout && isOpen ? (
        <>
          <motion.button
            type="button"
            aria-label="Close inspector"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            className="bg-background/30 absolute inset-0 z-20"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="shadow-sharp-lg absolute inset-x-0 bottom-0 z-30 max-h-[60vh] border-t border-border bg-background"
          >
            <div className="bg-background/90 flex items-center justify-between border-b border-border px-3 py-2">
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wide">
                <Settings2 className="h-3.5 w-3.5 text-primary" />
                Evidence
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-none"
                onClick={() => onOpenChange(false)}
                aria-label="Close inspector"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="max-h-[calc(60vh-44px)] overflow-y-auto p-2">{tabs}</div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  )
}
