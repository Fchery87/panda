'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from 'convex/react'
import type { Id } from '@convex/_generated/dataModel'
import { api } from '@convex/_generated/api'
import { Button } from '@/components/ui/button'
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  History,
  Loader2,
  XCircle,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  derivePlanProgress,
  describeStepMeta,
  formatElapsed,
  groupProgressSteps,
  reconcileProgressSteps,
  mapRunEventsToProgressSteps,
  parsePlanSteps,
  type LiveProgressStep,
} from './live-run-utils'
import { DeliveryStatusStrip } from './DeliveryStatusStrip'
import { mapDeliveryStateToStatusStripProps } from '@/lib/delivery/selectors'
import type { FormalSpecification } from '@/lib/agent/spec/types'
import type { PlanStatus } from '@/lib/chat/planDraft'
import { SpecBadgeMini } from '../workbench/SpecBadge'
import type { PlanningSessionDebugSummary } from '@/components/plan/PlanningSessionDebugCard'
import { PlanningSessionDebugCard } from '@/components/plan/PlanningSessionDebugCard'

interface RunProgressPanelProps {
  chatId?: Id<'chats'> | null
  liveSteps?: LiveProgressStep[]
  isStreaming?: boolean
  tracePersistenceStatus?: 'live' | 'degraded'
  onOpenFile?: (path: string) => void
  onOpenArtifacts?: () => void
  defaultOpen?: boolean
  /** Current spec for this run */
  currentSpec?: FormalSpecification | null
  /** Current plan workflow status for this chat */
  planStatus?: PlanStatus | null
  /** Current plan artifact for progress mapping */
  planDraft?: string | null
  /** Callback when spec badge is clicked */
  onSpecClick?: () => void
  /** Callback when plan badge is clicked */
  onPlanClick?: () => void
  /** Callback when a recoverable runtime checkpoint should be resumed */
  onResumeRuntimeSession?: (sessionID: string) => void | Promise<void>
  /** Maximum total steps to display (default: 24) */
  maxTotalSteps?: number
  /** Maximum steps per group to display (default: 8) */
  maxStepsPerGroup?: number
  /** Structured planning debug summary for operational inspection */
  planningDebug?: PlanningSessionDebugSummary | null
}

const STORAGE_KEY = 'panda.runProgress.isOpen'

export function RunProgressPanel({
  chatId,
  liveSteps: externalLiveSteps,
  isStreaming = false,
  tracePersistenceStatus = 'live',
  onOpenFile,
  onOpenArtifacts,
  defaultOpen = false,
  currentSpec,
  planStatus,
  planDraft,
  onSpecClick,
  onPlanClick,
  onResumeRuntimeSession,
  maxTotalSteps = 24,
  maxStepsPerGroup = 8,
  planningDebug = null,
}: RunProgressPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [hasLoadedPreference, setHasLoadedPreference] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    analysis: true,
    rewrite: true,
    tool: true,
    complete: true,
    other: false,
  })
  const [nowMs, setNowMs] = useState(() => Date.now())

  const queriedEvents = useQuery(
    api.agentRuns.listEventsByChat,
    chatId ? { chatId, limit: 60 } : 'skip'
  )
  const runtimeCheckpoints = useQuery(
    api.agentRuns.listRuntimeCheckpoints,
    chatId ? { chatId, limit: 6 } : 'skip'
  ) as
    | Array<{
        _id: string
        reason?: 'step' | 'complete' | 'error'
        savedAt?: number
        sessionID?: string
      }>
    | undefined
  const forgeProjectSnapshot = useQuery(api.forge.getProjectSnapshot, chatId ? { chatId } : 'skip')

  useEffect(() => {
    if (!isStreaming) return
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [isStreaming])

  useEffect(() => {
    try {
      const persisted = window.localStorage.getItem(STORAGE_KEY)
      if (persisted === '1') setIsOpen(true)
      if (persisted === '0') setIsOpen(false)
    } catch (error) {
      void error
      // localStorage not available (SSR or privacy mode)
    } finally {
      setHasLoadedPreference(true)
    }
  }, [])

  useEffect(() => {
    if (!hasLoadedPreference) return
    try {
      window.localStorage.setItem(STORAGE_KEY, isOpen ? '1' : '0')
    } catch (error) {
      void error
      // localStorage not available (SSR or privacy mode)
    }
  }, [isOpen, hasLoadedPreference])

  const historicalSteps = useMemo(() => {
    if (!queriedEvents) return []
    return mapRunEventsToProgressSteps(queriedEvents)
  }, [queriedEvents])

  const steps = useMemo(() => {
    if (isStreaming && externalLiveSteps && externalLiveSteps.length > 0) {
      return externalLiveSteps.slice(-maxTotalSteps)
    }
    return historicalSteps.slice(-maxTotalSteps)
  }, [isStreaming, externalLiveSteps, historicalSteps, maxTotalSteps])

  const reconciledSteps = useMemo(
    () => reconcileProgressSteps(steps, { isStreaming }),
    [steps, isStreaming]
  )

  const groups = useMemo(() => groupProgressSteps(reconciledSteps), [reconciledSteps])
  const planProgress = useMemo(() => {
    const parsedPlanSteps = parsePlanSteps(planDraft)
    if (parsedPlanSteps.length === 0) return null
    return derivePlanProgress(parsedPlanSteps, reconciledSteps)
  }, [planDraft, reconciledSteps])

  const startedAt = steps[0]?.createdAt ?? null
  const elapsedMs = startedAt ? Math.max(0, nowMs - startedAt) : 0
  const toolCount = steps.filter((s) => s.category === 'tool').length
  const interruptCount = steps.filter((s) => /interrupt|permission/i.test(s.content)).length
  const latestRuntimeCheckpoint = runtimeCheckpoints?.[0]
  const hasRecoverableCheckpoint =
    !!latestRuntimeCheckpoint &&
    latestRuntimeCheckpoint.reason !== 'complete' &&
    typeof latestRuntimeCheckpoint.sessionID === 'string'
  const deliveryStatus = useMemo(
    () =>
      mapDeliveryStateToStatusStripProps(
        forgeProjectSnapshot
          ? {
              currentPhase: forgeProjectSnapshot.state.phase,
              activeRole: forgeProjectSnapshot.state.activeRole,
              reviewGateStatus: forgeProjectSnapshot.state.gates.implementation_review,
              qaGateStatus: forgeProjectSnapshot.state.gates.qa_review,
              shipGateStatus: forgeProjectSnapshot.state.gates.ship_review,
              evidenceMissing: false,
              summary: {
                goal: forgeProjectSnapshot.state.summary.goal,
                activeTaskTitle: forgeProjectSnapshot.taskBoard.tasks.find(
                  (task) => task._id === forgeProjectSnapshot.taskBoard.activeTaskId
                )?.title,
              },
            }
          : null
      ),
    [forgeProjectSnapshot]
  )

  if (!isStreaming && steps.length === 0 && !runtimeCheckpoints?.length) {
    return null
  }

  return (
    <div className="surface-2 border-b border-border bg-[linear-gradient(180deg,rgba(245,158,11,0.08),transparent_42%)] px-3 py-2.5">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full flex-wrap items-center gap-x-2 gap-y-1 text-left"
      >
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <span className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-muted-foreground">
          {isStreaming ? (
            <>
              <Zap className="h-3 w-3 animate-pulse text-primary" />
              <span>Running</span>
            </>
          ) : (
            <>
              <History className="h-3 w-3" />
              <span>Run Progress</span>
            </>
          )}
        </span>
        <span className="ml-auto max-w-full font-mono text-[11px] text-muted-foreground/70 [overflow-wrap:anywhere] max-sm:ml-0 max-sm:w-full">
          {startedAt ? formatElapsed(elapsedMs) : '0s'}
          {isStreaming ? ' • live' : ` • ${steps.length} events`}
          {toolCount > 0 && ` • ${toolCount} tools`}
          {interruptCount > 0 && ` • ${interruptCount} approvals`}
        </span>
      </button>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'shadow-sharp-sm border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.22em]',
            tracePersistenceStatus === 'degraded'
              ? 'border-destructive/60 bg-destructive/5 text-destructive'
              : 'border-border bg-background/70 text-muted-foreground'
          )}
        >
          Trace {tracePersistenceStatus}
        </span>
        {tracePersistenceStatus === 'degraded' ? (
          <span className="font-mono text-[10px] text-muted-foreground [overflow-wrap:anywhere]">
            Live UI still works, but durable run timeline may be incomplete.
          </span>
        ) : null}
        {runtimeCheckpoints ? (
          <span
            className={cn(
              'shadow-sharp-sm border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.22em]',
              hasRecoverableCheckpoint
                ? 'border-primary/50 bg-primary/5 text-primary'
                : 'border-border bg-background/70 text-muted-foreground'
            )}
            title={
              latestRuntimeCheckpoint?.savedAt
                ? `Latest runtime checkpoint: ${new Date(latestRuntimeCheckpoint.savedAt).toLocaleString()}`
                : undefined
            }
          >
            {hasRecoverableCheckpoint
              ? `Resume Ready (${runtimeCheckpoints.length})`
              : `Checkpoints ${runtimeCheckpoints.length}`}
          </span>
        ) : null}
        {planProgress && (
          <span
            className={cn(
              'shadow-sharp-sm border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.22em]',
              planProgress.completedSteps === planProgress.totalSteps && planProgress.totalSteps > 0
                ? 'border-primary/50 bg-primary/5 text-primary'
                : 'border-border bg-background/70 text-muted-foreground'
            )}
          >
            Plan {planProgress.completedSteps}/{planProgress.totalSteps}
            {planProgress.activeStepIndex >= 0 && ` • Step ${planProgress.activeStepIndex + 1}`}
          </span>
        )}
        {hasRecoverableCheckpoint &&
        latestRuntimeCheckpoint?.sessionID &&
        onResumeRuntimeSession ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isStreaming}
            onClick={() => onResumeRuntimeSession(latestRuntimeCheckpoint.sessionID!)}
            className="h-7 rounded-none border-primary/40 bg-background/80 px-2.5 font-mono text-[10px] uppercase tracking-[0.2em]"
          >
            Resume Run
          </Button>
        ) : null}
        {currentSpec && (
          <button
            type="button"
            onClick={onSpecClick}
            className={cn(
              'shadow-sharp-sm flex flex-wrap items-center gap-1.5 border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors hover:bg-muted/50',
              currentSpec.status === 'verified' && 'border-success/50 bg-success/5 text-success',
              currentSpec.status === 'failed' &&
                'border-destructive/50 bg-destructive/5 text-destructive',
              currentSpec.status === 'drifted' && 'border-warning/50 bg-warning/5 text-warning',
              (currentSpec.status === 'executing' || currentSpec.status === 'approved') &&
                'border-primary/50 bg-primary/5 text-primary',
              (currentSpec.status === 'draft' || currentSpec.status === 'validated') &&
                'border-border bg-muted/50 text-muted-foreground'
            )}
          >
            <SpecBadgeMini status={currentSpec.status} />
            <span>Spec {currentSpec.status}</span>
            {currentSpec.intent.constraints.length > 0 && (
              <span className="text-muted-foreground">
                • {currentSpec.intent.constraints.length} constraints
              </span>
            )}
          </button>
        )}
        {planStatus && planStatus !== 'idle' && (
          <button
            type="button"
            onClick={onPlanClick}
            className={cn(
              'shadow-sharp-sm flex flex-wrap items-center gap-1.5 border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors hover:bg-muted/50',
              planStatus === 'approved' && 'border-primary/50 bg-primary/5 text-primary',
              planStatus === 'executing' && 'border-primary/50 bg-primary/5 text-primary',
              planStatus === 'partial' && 'border-warning/50 bg-warning/5 text-warning',
              planStatus === 'completed' &&
                'border-emerald-500/50 bg-emerald-500/5 text-emerald-500',
              planStatus === 'failed' && 'border-destructive/50 bg-destructive/5 text-destructive',
              planStatus === 'awaiting_review' && 'border-border bg-muted/50 text-muted-foreground',
              planStatus === 'stale' && 'border-warning/50 bg-warning/5 text-warning',
              planStatus === 'drafting' && 'border-border bg-muted/50 text-muted-foreground'
            )}
          >
            <CheckCircle2 className="h-3 w-3" />
            <span>Plan {planStatus.replace('_', ' ')}</span>
          </button>
        )}
      </div>

      <DeliveryStatusStrip
        currentPhase={deliveryStatus.currentPhase}
        activeRole={deliveryStatus.activeRole}
        currentTaskTitle={deliveryStatus.currentTaskTitle}
        reviewGateStatus={deliveryStatus.reviewGateStatus}
        qaGateStatus={deliveryStatus.qaGateStatus}
        shipGateStatus={deliveryStatus.shipGateStatus}
        evidenceMissing={deliveryStatus.evidenceMissing}
      />

      {!isOpen ? null : groups.length === 0 ? (
        <div className="font-mono text-xs text-muted-foreground">
          {isStreaming ? 'Preparing run...' : 'No run events yet'}
        </div>
      ) : (
        <div className="mt-2 space-y-1">
          {groups.map((group) => {
            const expanded = expandedGroups[group.key] ?? true
            const hasError = group.steps.some((step) => step.status === 'error')
            const hasRunning = group.steps.some((step) => step.status === 'running')
            const latestStatus = hasError ? 'error' : hasRunning ? 'running' : 'completed'

            return (
              <div
                key={group.key}
                className="shadow-sharp-sm overflow-hidden border border-border bg-background/80"
              >
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left font-mono text-[11px] uppercase tracking-[0.18em]"
                  onClick={() =>
                    setExpandedGroups((prev) => ({
                      ...prev,
                      [group.key]: !expanded,
                    }))
                  }
                >
                  {expanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  <span>{group.label}</span>
                  <span className="ml-1 text-muted-foreground/80">({group.steps.length})</span>
                  <span className="ml-auto uppercase text-muted-foreground">{latestStatus}</span>
                </button>

                {expanded && (
                  <div className="space-y-1.5 border-t border-border/80 bg-muted/20 px-2.5 py-2">
                    {group.steps.slice(-maxStepsPerGroup).map((step) => (
                      <div
                        key={step.id}
                        className={cn(
                          'shadow-sharp-sm flex items-start gap-2 border border-border/70 bg-background/85 px-2 py-1.5 font-mono text-xs',
                          step.status === 'error' && 'text-destructive'
                        )}
                      >
                        {step.status === 'running' ? (
                          <Loader2 className="mt-0.5 h-3 w-3 shrink-0 animate-spin" />
                        ) : step.status === 'error' ? (
                          <XCircle className="mt-0.5 h-3 w-3 shrink-0" />
                        ) : (
                          <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="leading-relaxed [overflow-wrap:anywhere]">
                            {step.content}
                          </div>
                          {(() => {
                            const meta = describeStepMeta(step)
                            return (
                              <>
                                {meta.primary ? (
                                  <div className="text-muted-foreground/80 [overflow-wrap:anywhere]">
                                    {meta.primary}
                                  </div>
                                ) : null}
                                {meta.secondary ? (
                                  <div className="text-muted-foreground/80 [overflow-wrap:anywhere]">
                                    args: {meta.secondary}
                                  </div>
                                ) : null}
                                {meta.error ? (
                                  <div className="text-destructive/90 [overflow-wrap:anywhere]">
                                    {meta.error}
                                  </div>
                                ) : null}
                                {step.details?.targetFilePaths &&
                                step.details.targetFilePaths.length > 0 ? (
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {step.details.targetFilePaths.slice(0, 2).map((path) => (
                                      <button
                                        key={`${step.id}-${path}`}
                                        type="button"
                                        onClick={() => onOpenFile?.(path)}
                                        className="border border-border px-1.5 py-0.5 text-xs hover:bg-muted/40"
                                      >
                                        open {path}
                                      </button>
                                    ))}
                                  </div>
                                ) : null}
                                {step.details?.hasArtifactTarget ? (
                                  <div className="mt-1">
                                    <button
                                      type="button"
                                      onClick={() => onOpenArtifacts?.()}
                                      className="border border-border px-1.5 py-0.5 text-xs hover:bg-muted/40"
                                    >
                                      open artifacts
                                    </button>
                                  </div>
                                ) : null}
                              </>
                            )
                          })()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {process.env.NODE_ENV !== 'production' && planningDebug ? (
        <div className="mt-2">
          <PlanningSessionDebugCard summary={planningDebug} />
        </div>
      ) : null}
    </div>
  )
}

export type { LiveProgressStep }
