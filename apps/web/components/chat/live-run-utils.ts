import {
  derivePlanProgressMetadata,
  parsePlanSteps as parsePlanStepsFromDraft,
} from '@/lib/agent/plan-progress'
import type { PersistedRunEventInfo, PersistedRunEventSummaryInfo } from '@/components/chat/types'

export type LiveProgressCategory = 'analysis' | 'rewrite' | 'tool' | 'complete' | 'other'

export interface LiveProgressDetails {
  toolName?: string
  toolCallId?: string
  argsSummary?: string
  durationMs?: number
  errorExcerpt?: string
  targetFilePaths?: string[]
  hasArtifactTarget?: boolean
}

export interface LiveProgressStep {
  id: string
  content: string
  status: 'running' | 'completed' | 'error'
  category?: LiveProgressCategory
  planStepIndex?: number
  planStepTitle?: string
  planTotalSteps?: number
  completedPlanStepIndexes?: number[]
  details?: LiveProgressDetails
  createdAt: number
}

export interface ChatMilestoneSummary {
  id: string
  title: string
  detail?: string
  tone: 'default' | 'primary' | 'warning' | 'danger' | 'success'
  createdAt: number
}

interface LiveProgressGroup {
  key: LiveProgressCategory
  label: string
  steps: LiveProgressStep[]
}

export interface PlanProgressSummary {
  totalSteps: number
  completedSteps: number
  activeStepIndex: number
  statuses: Array<'pending' | 'active' | 'completed'>
}

const GROUP_ORDER: LiveProgressCategory[] = ['analysis', 'rewrite', 'tool', 'complete', 'other']

const GROUP_LABELS: Record<LiveProgressCategory, string> = {
  analysis: 'Planning',
  rewrite: 'Guardrails',
  tool: 'Actions',
  complete: 'Outcome',
  other: 'Updates',
}

function summarizePathList(paths: string[] | undefined): string | undefined {
  if (!paths || paths.length === 0) return undefined
  if (paths.length === 1) return paths[0]
  const preview = paths.slice(0, 2).join(', ')
  return paths.length > 2 ? `${preview} +${paths.length - 2} more` : preview
}

export function describeProgressCategory(category: LiveProgressCategory | undefined): string {
  if (!category) return GROUP_LABELS.other
  return GROUP_LABELS[category]
}

export function deriveChatMilestoneSummaries(steps: LiveProgressStep[]): ChatMilestoneSummary[] {
  const latestSuccessfulWrite = [...steps]
    .reverse()
    .find(
      (step) =>
        step.category === 'tool' &&
        step.status === 'completed' &&
        (step.details?.toolName === 'write_files' || step.details?.toolName === 'apply_patch')
    )

  const latestVerification = [...steps]
    .reverse()
    .find(
      (step) =>
        step.category === 'tool' &&
        step.status === 'completed' &&
        step.details?.toolName === 'run_command'
    )

  const latestOutcome = [...steps]
    .reverse()
    .find(
      (step) =>
        step.category === 'complete' || (step.category === 'tool' && step.status === 'error')
    )

  const summaries: ChatMilestoneSummary[] = []

  if (latestSuccessfulWrite) {
    summaries.push({
      id: `milestone-${latestSuccessfulWrite.id}`,
      title: 'Updated files',
      detail:
        summarizePathList(latestSuccessfulWrite.details?.targetFilePaths) ?? 'Code changes applied',
      tone: 'primary',
      createdAt: latestSuccessfulWrite.createdAt,
    })
  }

  if (latestVerification) {
    summaries.push({
      id: `milestone-${latestVerification.id}`,
      title: 'Ran verification',
      detail: latestVerification.content,
      tone: 'default',
      createdAt: latestVerification.createdAt,
    })
  }

  if (latestOutcome) {
    const outcomeIsError = latestOutcome.status === 'error'
    summaries.push({
      id: `milestone-${latestOutcome.id}`,
      title: outcomeIsError ? 'Needs attention' : 'Completed run',
      detail: outcomeIsError
        ? (latestOutcome.details?.errorExcerpt ?? latestOutcome.content)
        : latestOutcome.content,
      tone: outcomeIsError ? 'danger' : 'success',
      createdAt: latestOutcome.createdAt,
    })
  }

  return summaries.sort((a, b) => a.createdAt - b.createdAt)
}

function inferCategory(step: LiveProgressStep): LiveProgressCategory {
  if (step.category) return step.category

  const content = step.content.toLowerCase()
  if (content.includes('guardrail') || content.includes('rewrit')) return 'rewrite'
  if (content.includes('tool')) return 'tool'
  if (content.includes('complete')) return 'complete'
  if (content.includes('iteration') || content.includes('analyz') || content.includes('draft')) {
    return 'analysis'
  }

  return 'other'
}

export function groupProgressSteps(steps: LiveProgressStep[]): LiveProgressGroup[] {
  const grouped = new Map<LiveProgressCategory, LiveProgressStep[]>()

  for (const step of steps) {
    const category = inferCategory(step)
    const bucket = grouped.get(category)
    if (bucket) {
      bucket.push(step)
    } else {
      grouped.set(category, [step])
    }
  }

  return GROUP_ORDER.filter((key) => grouped.has(key)).map((key) => ({
    key,
    label: GROUP_LABELS[key],
    steps: grouped.get(key) ?? [],
  }))
}

export function formatElapsed(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60

  if (minutes === 0) {
    return `${seconds}s`
  }

  return `${minutes}m ${String(remainder).padStart(2, '0')}s`
}

function formatDurationMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function summarizeArgs(args: Record<string, unknown> | undefined): string | undefined {
  if (!args) return undefined
  const serialized = JSON.stringify(args)
  if (!serialized) return undefined
  return serialized.length > 140 ? `${serialized.slice(0, 137)}...` : serialized
}

function buildErrorDetails(error: string | undefined): LiveProgressDetails | undefined {
  return error
    ? {
        errorExcerpt: error,
      }
    : undefined
}

function buildReplayProgressStep(
  id: string,
  content: string,
  status: LiveProgressStep['status'],
  category: LiveProgressStep['category'],
  createdAt: number,
  details?: LiveProgressDetails
): LiveProgressStep {
  return {
    id,
    content,
    status,
    category,
    details,
    createdAt,
  }
}

export function describeStepMeta(step: LiveProgressStep): {
  primary: string
  secondary: string | null
  error: string | null
} {
  const details = step.details
  if (!details) {
    return { primary: '', secondary: null, error: null }
  }

  const primaryParts: string[] = []
  if (details.toolName) primaryParts.push(details.toolName)
  if (typeof details.durationMs === 'number')
    primaryParts.push(formatDurationMs(details.durationMs))

  return {
    primary: primaryParts.join(' • '),
    secondary: details.argsSummary ?? null,
    error: details.errorExcerpt ?? null,
  }
}

export function parsePlanSteps(planDraft: string | null | undefined): string[] {
  return parsePlanStepsFromDraft(planDraft)
}

export function derivePlanProgress(
  planSteps: string[],
  progressSteps: LiveProgressStep[]
): PlanProgressSummary {
  const latestExplicitStep = [...progressSteps]
    .reverse()
    .find(
      (step) =>
        typeof step.planTotalSteps === 'number' && Array.isArray(step.completedPlanStepIndexes)
    )

  if (
    latestExplicitStep?.planTotalSteps !== undefined &&
    latestExplicitStep.planTotalSteps > 0 &&
    latestExplicitStep.completedPlanStepIndexes !== undefined
  ) {
    const totalSteps = latestExplicitStep.planTotalSteps
    const completedPlanStepIndexes = latestExplicitStep.completedPlanStepIndexes
    const statuses: Array<'pending' | 'active' | 'completed'> = Array.from(
      { length: totalSteps },
      (_, index) => (completedPlanStepIndexes.includes(index) ? 'completed' : 'pending')
    )

    const latestActiveStep = [...progressSteps]
      .reverse()
      .find(
        (step) =>
          step.status === 'running' &&
          typeof step.planStepIndex === 'number' &&
          typeof step.planTotalSteps === 'number'
      )

    const activeStepIndex =
      typeof latestActiveStep?.planStepIndex === 'number' ? latestActiveStep.planStepIndex : -1
    if (
      activeStepIndex >= 0 &&
      activeStepIndex < statuses.length &&
      statuses[activeStepIndex] !== 'completed'
    ) {
      statuses[activeStepIndex] = 'active'
    }

    return {
      totalSteps,
      completedSteps: statuses.filter((status) => status === 'completed').length,
      activeStepIndex,
      statuses,
    }
  }

  const statuses: Array<'pending' | 'active' | 'completed'> = planSteps.map(() => 'pending')

  for (let index = 0; index < planSteps.length; index += 1) {
    const matchingCompleted = progressSteps.find((step) => {
      if (step.status !== 'completed') return false
      const metadata = derivePlanProgressMetadata(planSteps, step.content, 'completed', [])
      return metadata?.planStepIndex === index
    })
    if (matchingCompleted) {
      statuses[index] = 'completed'
      continue
    }

    const matchingActive = progressSteps.find((step) => {
      if (step.status !== 'running') return false
      const metadata = derivePlanProgressMetadata(planSteps, step.content, 'running', [])
      return metadata?.planStepIndex === index
    })
    if (matchingActive) {
      statuses[index] = 'active'
    }
  }

  const completedSteps = statuses.filter((status) => status === 'completed').length
  const activeStepIndex = statuses.findIndex((status) => status === 'active')

  return {
    totalSteps: planSteps.length,
    completedSteps,
    activeStepIndex,
    statuses,
  }
}

export function extractTargetFilePaths(
  toolName: string | undefined,
  args: Record<string, unknown> | undefined
): string[] {
  if (!toolName || !args) return []

  if (toolName === 'read_files') {
    const paths = args.paths
    return Array.isArray(paths) ? paths.filter((p): p is string => typeof p === 'string') : []
  }

  if (toolName === 'write_files') {
    const files = args.files
    return Array.isArray(files)
      ? files
          .map((file) =>
            typeof file === 'object' && file !== null && 'path' in file
              ? (file.path as unknown)
              : undefined
          )
          .filter((p): p is string => typeof p === 'string')
      : []
  }

  return []
}

export function mapRunEventsToProgressSteps(events: PersistedRunEventInfo[]): LiveProgressStep[] {
  return events.flatMap((event, index) => {
    if (event.type === 'progress_step' && typeof event.content === 'string') {
      const step: LiveProgressStep = {
        id: event._id ?? `progress-replay-${index}`,
        content: event.content,
        status: event.status === 'completed' || event.status === 'error' ? event.status : 'running',
        category:
          event.progressCategory === 'analysis' ||
          event.progressCategory === 'rewrite' ||
          event.progressCategory === 'tool' ||
          event.progressCategory === 'complete'
            ? event.progressCategory
            : 'other',
        details:
          event.progressToolName ||
          event.toolCallId ||
          event.args ||
          event.durationMs !== undefined ||
          event.error ||
          event.targetFilePaths ||
          event.progressHasArtifactTarget !== undefined
            ? {
                toolName: event.progressToolName,
                toolCallId: event.toolCallId,
                argsSummary: summarizeArgs(event.args),
                durationMs: event.durationMs,
                errorExcerpt: event.error,
                targetFilePaths: event.targetFilePaths,
                hasArtifactTarget: event.progressHasArtifactTarget,
              }
            : undefined,
        planStepIndex: event.planStepIndex,
        planStepTitle: event.planStepTitle,
        planTotalSteps: event.planTotalSteps,
        completedPlanStepIndexes: event.completedPlanStepIndexes,
        createdAt: event.createdAt ?? Date.now(),
      }
      return [step]
    }

    if (event.type === 'spec_verification') {
      return [
        buildReplayProgressStep(
          event._id ?? `spec-verification-${index}`,
          event.content ?? 'Specification verification completed',
          event.status === 'verified' ? 'completed' : 'error',
          'complete',
          event.createdAt ?? Date.now(),
          buildErrorDetails(event.error)
        ),
      ]
    }

    if (event.type === 'error') {
      return [
        buildReplayProgressStep(
          event._id ?? `run-error-${index}`,
          'Run failed',
          'error',
          'complete',
          event.createdAt ?? Date.now(),
          buildErrorDetails(event.error)
        ),
      ]
    }

    return []
  })
}

export function mapRunEventSummariesToProgressSteps(
  events: PersistedRunEventSummaryInfo[]
): LiveProgressStep[] {
  return events.flatMap((event, index) => {
    if (event.type === 'progress_step' && typeof event.contentPreview === 'string') {
      const step: LiveProgressStep = {
        id: event._id ?? `progress-replay-${index}`,
        content: event.contentPreview,
        status: event.status === 'completed' || event.status === 'error' ? event.status : 'running',
        category:
          event.progressCategory === 'analysis' ||
          event.progressCategory === 'rewrite' ||
          event.progressCategory === 'tool' ||
          event.progressCategory === 'complete'
            ? event.progressCategory
            : 'other',
        details:
          event.progressToolName ||
          event.toolCallId ||
          event.durationMs !== undefined ||
          event.errorPreview ||
          event.targetFilePaths ||
          event.progressHasArtifactTarget !== undefined
            ? {
                toolName: event.progressToolName,
                toolCallId: event.toolCallId,
                durationMs: event.durationMs,
                errorExcerpt: event.errorPreview,
                targetFilePaths: event.targetFilePaths,
                hasArtifactTarget: event.progressHasArtifactTarget,
              }
            : undefined,
        planStepIndex: event.planStepIndex,
        planStepTitle: event.planStepTitle,
        planTotalSteps: event.planTotalSteps,
        completedPlanStepIndexes: event.completedPlanStepIndexes,
        createdAt: event.createdAt ?? Date.now(),
      }
      return [step]
    }

    if (event.type === 'spec_verification') {
      return [
        buildReplayProgressStep(
          event._id ?? `spec-verification-${index}`,
          event.contentPreview ?? 'Specification verification completed',
          event.status === 'verified' ? 'completed' : 'error',
          'complete',
          event.createdAt ?? Date.now(),
          buildErrorDetails(event.errorPreview)
        ),
      ]
    }

    if (event.type === 'error') {
      return [
        buildReplayProgressStep(
          event._id ?? `run-error-${index}`,
          'Run failed',
          'error',
          'complete',
          event.createdAt ?? Date.now(),
          buildErrorDetails(event.errorPreview)
        ),
      ]
    }

    return []
  })
}

export function mapLatestRunProgressSteps(events: PersistedRunEventInfo[]): LiveProgressStep[] {
  const latestRunId = [...events]
    .reverse()
    .find((event) => typeof event.runId === 'string' && event.runId.length > 0)?.runId

  const scopedEvents =
    latestRunId === undefined ? events : events.filter((event) => event.runId === latestRunId)

  return mapRunEventsToProgressSteps(scopedEvents)
}

export function mapLatestRunSummaryProgressSteps(
  events: PersistedRunEventSummaryInfo[]
): LiveProgressStep[] {
  const latestRunId = [...events]
    .reverse()
    .find((event) => typeof event.runId === 'string' && event.runId.length > 0)?.runId

  const scopedEvents =
    latestRunId === undefined ? events : events.filter((event) => event.runId === latestRunId)

  return mapRunEventSummariesToProgressSteps(scopedEvents)
}

export function reconcileProgressSteps(
  steps: LiveProgressStep[],
  options: { isStreaming: boolean }
): LiveProgressStep[] {
  const completedToolCallIds = new Set(
    steps
      .filter(
        (step) =>
          step.category === 'tool' &&
          (step.status === 'completed' || step.status === 'error') &&
          typeof step.details?.toolCallId === 'string'
      )
      .map((step) => step.details!.toolCallId as string)
  )

  const completedToolNames = new Set(
    steps
      .filter(
        (step) =>
          step.category === 'tool' &&
          (step.status === 'completed' || step.status === 'error') &&
          typeof step.details?.toolName === 'string' &&
          !step.details?.toolCallId // Only fallback to names if no call ID
      )
      .map((step) => step.details!.toolName as string)
  )
  const hasCompleteMarker = steps.some(
    (step) => step.category === 'complete' && step.status === 'completed'
  )

  return steps.map((step) => {
    if (step.status !== 'running') return step

    if (step.category === 'tool') {
      const toolCallId = step.details?.toolCallId
      const toolName = step.details?.toolName

      if (toolCallId && completedToolCallIds.has(toolCallId)) {
        return { ...step, status: 'completed' }
      }

      if (!toolCallId && toolName && completedToolNames.has(toolName)) {
        return { ...step, status: 'completed' }
      }
      return step
    }

    if (!options.isStreaming && step.category === 'analysis' && hasCompleteMarker) {
      return { ...step, status: 'completed' }
    }

    return step
  })
}
