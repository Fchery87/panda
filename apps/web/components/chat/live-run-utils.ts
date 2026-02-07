export type LiveProgressCategory = 'analysis' | 'rewrite' | 'tool' | 'complete' | 'other'

export interface LiveProgressDetails {
  toolName?: string
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
  details?: LiveProgressDetails
  createdAt: number
}

interface PersistedRunEvent {
  _id?: string
  runId?: string
  type: string
  content?: string
  status?: string
  progressCategory?: string
  progressToolName?: string
  progressHasArtifactTarget?: boolean
  targetFilePaths?: string[]
  args?: Record<string, unknown>
  durationMs?: number
  error?: string
  createdAt?: number
}

interface LiveProgressGroup {
  key: LiveProgressCategory
  label: string
  steps: LiveProgressStep[]
}

const GROUP_ORDER: LiveProgressCategory[] = ['analysis', 'rewrite', 'tool', 'complete', 'other']

const GROUP_LABELS: Record<LiveProgressCategory, string> = {
  analysis: 'Analysis',
  rewrite: 'Guardrails',
  tool: 'Tool Execution',
  complete: 'Completion',
  other: 'Other',
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

export function extractTargetFilePaths(
  toolName: string | undefined,
  args: Record<string, unknown> | undefined
): string[] {
  if (!toolName || !args) return []

  if (toolName === 'read_files') {
    const paths = args.paths
    if (Array.isArray(paths)) {
      return paths.filter((p): p is string => typeof p === 'string')
    }
    return []
  }

  if (toolName === 'write_files') {
    const files = args.files
    if (Array.isArray(files)) {
      return files
        .map((file) =>
          typeof file === 'object' && file !== null && 'path' in file
            ? (file.path as unknown)
            : undefined
        )
        .filter((p): p is string => typeof p === 'string')
    }
    return []
  }

  return []
}

export function mapRunEventsToProgressSteps(events: PersistedRunEvent[]): LiveProgressStep[] {
  return events
    .filter((event) => event.type === 'progress_step' && typeof event.content === 'string')
    .map((event, index) => ({
      id: event._id ?? `progress-replay-${index}`,
      content: event.content!,
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
        event.args ||
        event.durationMs !== undefined ||
        event.error ||
        event.targetFilePaths ||
        event.progressHasArtifactTarget !== undefined
          ? {
              toolName: event.progressToolName,
              argsSummary: summarizeArgs(event.args),
              durationMs: event.durationMs,
              errorExcerpt: event.error,
              targetFilePaths: event.targetFilePaths,
              hasArtifactTarget: event.progressHasArtifactTarget,
            }
          : undefined,
      createdAt: event.createdAt ?? Date.now(),
    }))
}

export function mapLatestRunProgressSteps(events: PersistedRunEvent[]): LiveProgressStep[] {
  const latestRunId = [...events]
    .reverse()
    .find((event) => typeof event.runId === 'string' && event.runId.length > 0)?.runId

  const scopedEvents =
    latestRunId === undefined ? events : events.filter((event) => event.runId === latestRunId)

  return mapRunEventsToProgressSteps(scopedEvents)
}
