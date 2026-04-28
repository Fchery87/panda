import type { ExecutionReceipt } from '@/lib/agent/receipt'

import type { LiveProgressStep } from './live-run-utils'

export type RunTimelineDetail = 'summary' | 'standard' | 'diagnostic'
export type RunTimelineMode = 'chat' | 'project' | 'admin'

export type RunTimelineStageKind =
  | 'intent'
  | 'routing'
  | 'planning'
  | 'execution'
  | 'validation'
  | 'receipt'
  | 'next_action'

export type RunTimelineStatus =
  | 'idle'
  | 'running'
  | 'blocked'
  | 'succeeded'
  | 'failed'
  | 'cancelled'

export type RunTimelineStageStatus =
  | 'pending'
  | 'active'
  | 'complete'
  | 'blocked'
  | 'failed'
  | 'skipped'

export type RunTimelineEntrySource = 'live_step' | 'execution_receipt' | 'derived'

export interface RunTimelineSource {
  steps?: readonly LiveProgressStep[] | null
  receipt?: ExecutionReceipt | null
  userIntent?: string | null
  isStreaming?: boolean
}

export interface RunTimelineIncludeOptions {
  receipt: boolean
  toolCalls: boolean
  fileChanges: boolean
  diagnostics: boolean
  emptyStages: boolean
}

export interface RunTimelineOptions {
  detail?: RunTimelineDetail
  mode?: RunTimelineMode
  now?: number
  include?: Partial<RunTimelineIncludeOptions>
  stageOrder?: readonly RunTimelineStageKind[]
}

export interface RunTimelineProgress {
  completedStages: number
  totalStages: number
  percent: number
  isIndeterminate: boolean
}

export interface RunTimelineEntry {
  id: string
  label: string
  status: RunTimelineStageStatus
  timestamp?: number
  summary?: string
  detail?: string
  source: RunTimelineEntrySource
}

export interface RunTimelineStage {
  id: string
  kind: RunTimelineStageKind
  label: string
  message?: string
  status: RunTimelineStageStatus
  startedAt?: number
  finishedAt?: number
  durationMs?: number
  entries: readonly RunTimelineEntry[]
}

export interface RunTimelineReceiptSummary {
  label: string
  summary: string
  changedFiles: number
  commandsRun: number
  approvals: number
  resultStatus: ExecutionReceipt['resultStatus']
}

export interface RunTimelineDiagnostics {
  rawStepCount: number
  droppedStepCount: number
  latestEventAt?: number
  warnings: readonly string[]
}

export interface RunTimeline {
  id?: string
  status: RunTimelineStatus
  headline: string
  subheadline?: string
  stages: readonly RunTimelineStage[]
  activeStage?: RunTimelineStageKind
  progress: RunTimelineProgress
  receipt?: RunTimelineReceiptSummary
  diagnostics?: RunTimelineDiagnostics
}

const DEFAULT_STAGE_ORDER: RunTimelineStageKind[] = [
  'intent',
  'routing',
  'planning',
  'execution',
  'validation',
  'receipt',
  'next_action',
]

const DEFAULT_INCLUDE: RunTimelineIncludeOptions = {
  receipt: true,
  toolCalls: true,
  fileChanges: true,
  diagnostics: false,
  emptyStages: false,
}

const STAGE_LABELS: Record<RunTimelineStageKind, string> = {
  intent: 'Intent',
  routing: 'Routing',
  planning: 'Plan',
  execution: 'Work',
  validation: 'Validation',
  receipt: 'Receipt',
  next_action: 'Next action',
}

function toStageStatus(status: LiveProgressStep['status']): RunTimelineStageStatus {
  if (status === 'completed') return 'complete'
  if (status === 'error') return 'failed'
  return 'active'
}

function statusRank(status: RunTimelineStageStatus): number {
  switch (status) {
    case 'failed':
      return 5
    case 'blocked':
      return 4
    case 'active':
      return 3
    case 'complete':
      return 2
    case 'pending':
      return 1
    case 'skipped':
      return 0
  }
}

function strongestStatus(statuses: RunTimelineStageStatus[]): RunTimelineStageStatus {
  return statuses.reduce<RunTimelineStageStatus>(
    (strongest, status) => (statusRank(status) > statusRank(strongest) ? status : strongest),
    'pending'
  )
}

function classifyStep(step: LiveProgressStep): RunTimelineStageKind {
  if (step.category === 'analysis') return 'planning'
  if (step.category === 'rewrite') return 'routing'
  if (step.category === 'complete') return 'receipt'

  if (step.category === 'tool') {
    const toolName = step.details?.toolName?.toLowerCase() ?? ''
    const content = step.content.toLowerCase()
    if (
      toolName === 'run_command' ||
      /test|typecheck|lint|format|verify|check/u.test(`${toolName} ${content}`)
    ) {
      return 'validation'
    }
    return 'execution'
  }

  return 'execution'
}

function summarizeStep(step: LiveProgressStep): string | undefined {
  const paths = step.details?.targetFilePaths
  if (paths && paths.length > 0) {
    const preview = paths.slice(0, 2).join(', ')
    return paths.length > 2 ? `${preview} +${paths.length - 2} more` : preview
  }
  return step.details?.toolName
}

function buildEntryFromStep(step: LiveProgressStep): RunTimelineEntry {
  return {
    id: step.id,
    label: step.content,
    status: toStageStatus(step.status),
    timestamp: step.createdAt,
    summary: summarizeStep(step),
    detail: step.details?.errorExcerpt ?? step.details?.argsSummary,
    source: 'live_step',
  }
}

function buildReceiptSummary(receipt: ExecutionReceipt): RunTimelineReceiptSummary {
  const changedFiles = receipt.webcontainer.filesWritten.length
  const commandsRun = receipt.webcontainer.commandsRun.length
  const approvals = receipt.nativeExecution.approvalsRequested.length

  return {
    label: `${receipt.resolvedMode} receipt`,
    summary: `${changedFiles} changed, ${commandsRun} commands, ${approvals} approvals`,
    changedFiles,
    commandsRun,
    approvals,
    resultStatus: receipt.resultStatus,
  }
}

function buildReceiptEntries(receipt: ExecutionReceipt): RunTimelineEntry[] {
  const entries: RunTimelineEntry[] = [
    {
      id: 'receipt-routing',
      label: `${receipt.requestedMode} -> ${receipt.resolvedMode}`,
      status: 'complete',
      summary: receipt.routingDecision.rationale,
      source: 'execution_receipt',
    },
  ]

  if (receipt.webcontainer.filesWritten.length > 0) {
    entries.push({
      id: 'receipt-files-written',
      label: 'Changed files recorded',
      status: 'complete',
      summary: `${receipt.webcontainer.filesWritten.length} paths`,
      source: 'execution_receipt',
    })
  }

  if (receipt.webcontainer.commandsRun.length > 0) {
    entries.push({
      id: 'receipt-commands-run',
      label: 'Commands recorded',
      status: 'complete',
      summary: `${receipt.webcontainer.commandsRun.length} commands`,
      source: 'execution_receipt',
    })
  }

  return entries
}

function deriveTimelineStatus(args: {
  isStreaming: boolean
  steps: readonly LiveProgressStep[]
  receipt?: ExecutionReceipt | null
}): RunTimelineStatus {
  if (args.isStreaming || args.steps.some((step) => step.status === 'running')) return 'running'
  if (args.steps.some((step) => step.status === 'error')) return 'failed'

  switch (args.receipt?.resultStatus) {
    case 'complete':
      return 'succeeded'
    case 'error':
      return 'failed'
    case 'aborted':
      return 'cancelled'
    case 'approval_timeout':
      return 'blocked'
    default:
      return args.steps.length > 0 ? 'succeeded' : 'idle'
  }
}

function buildHeadline(status: RunTimelineStatus): string {
  switch (status) {
    case 'running':
      return 'Run in progress'
    case 'blocked':
      return 'Run needs attention'
    case 'succeeded':
      return 'Run complete'
    case 'failed':
      return 'Run failed'
    case 'cancelled':
      return 'Run stopped'
    case 'idle':
      return 'No run activity'
  }
}

function stageMessage(
  kind: RunTimelineStageKind,
  status: RunTimelineStageStatus
): string | undefined {
  if (kind === 'next_action') return 'Review the proof, inspect changes, or continue from chat.'
  if (kind === 'receipt' && status === 'complete') return 'Proof is available for this run.'
  if (kind === 'validation' && status === 'pending') return 'No validation evidence recorded yet.'
  return undefined
}

function resolveStageStatus(
  kind: RunTimelineStageKind,
  entries: RunTimelineEntry[]
): RunTimelineStageStatus {
  if (entries.length > 0) return strongestStatus(entries.map((entry) => entry.status))
  if (kind === 'next_action') return 'pending'
  return 'skipped'
}

function buildProgress(stages: readonly RunTimelineStage[]): RunTimelineProgress {
  const counted = stages.filter((stage) => stage.status !== 'skipped')
  const completedStages = counted.filter((stage) => stage.status === 'complete').length
  const totalStages = counted.length

  return {
    completedStages,
    totalStages,
    percent: totalStages === 0 ? 0 : Math.round((completedStages / totalStages) * 100),
    isIndeterminate: counted.some((stage) => stage.status === 'active'),
  }
}

export function getRunTimeline(
  source: RunTimelineSource,
  options: RunTimelineOptions = {}
): RunTimeline {
  const steps = [...(source.steps ?? [])].sort((a, b) => a.createdAt - b.createdAt)
  const include = { ...DEFAULT_INCLUDE, ...options.include }
  const stageOrder = options.stageOrder ?? DEFAULT_STAGE_ORDER
  const entriesByStage = new Map<RunTimelineStageKind, RunTimelineEntry[]>()
  const warnings: string[] = []

  const addEntry = (kind: RunTimelineStageKind, entry: RunTimelineEntry) => {
    const entries = entriesByStage.get(kind) ?? []
    entries.push(entry)
    entriesByStage.set(kind, entries)
  }

  if (source.userIntent?.trim()) {
    addEntry('intent', {
      id: 'intent-user',
      label: source.userIntent.trim(),
      status: 'complete',
      source: 'derived',
    })
  }

  for (const step of steps) {
    const kind = classifyStep(step)
    if (!include.toolCalls && kind === 'execution' && step.details?.toolName) continue
    addEntry(kind, buildEntryFromStep(step))
  }

  if (source.receipt && include.receipt) {
    for (const entry of buildReceiptEntries(source.receipt)) {
      addEntry('receipt', entry)
    }
  }

  if (source.receipt?.resultStatus === 'approval_timeout') {
    addEntry('next_action', {
      id: 'next-action-approval-timeout',
      label: 'Approve, revise, or stop the run',
      status: 'blocked',
      source: 'execution_receipt',
    })
  } else if (source.receipt || steps.length > 0) {
    addEntry('next_action', {
      id: 'next-action-review',
      label: 'Review proof and continue from chat',
      status: 'pending',
      source: 'derived',
    })
  }

  const stages = stageOrder.flatMap<RunTimelineStage>((kind) => {
    const entries = entriesByStage.get(kind) ?? []
    if (!include.emptyStages && entries.length === 0) return []
    const status = resolveStageStatus(kind, entries)
    const timestamps = entries
      .map((entry) => entry.timestamp)
      .filter((timestamp): timestamp is number => typeof timestamp === 'number')

    return {
      id: `stage-${kind}`,
      kind,
      label: STAGE_LABELS[kind],
      message: stageMessage(kind, status),
      status,
      startedAt: timestamps[0],
      finishedAt: timestamps.at(-1),
      entries,
    }
  })

  if (source.receipt?.contextSources.truncated) {
    warnings.push('Context audit was truncated before receipt persistence.')
  }

  const status = deriveTimelineStatus({
    isStreaming: source.isStreaming ?? false,
    steps,
    receipt: source.receipt,
  })
  const activeStage = stages.find((stage) => stage.status === 'active')?.kind
  const progress = buildProgress(stages)
  const latestEventAt = steps.at(-1)?.createdAt

  return {
    status,
    headline: buildHeadline(status),
    subheadline:
      stages.length > 0
        ? `${progress.completedStages}/${progress.totalStages} stages complete`
        : undefined,
    stages,
    activeStage,
    progress,
    receipt: source.receipt && include.receipt ? buildReceiptSummary(source.receipt) : undefined,
    diagnostics:
      include.diagnostics || options.detail === 'diagnostic'
        ? {
            rawStepCount: steps.length,
            droppedStepCount: 0,
            latestEventAt,
            warnings,
          }
        : undefined,
  }
}

export const RUN_TIMELINE_STAGE_ORDER = DEFAULT_STAGE_ORDER
