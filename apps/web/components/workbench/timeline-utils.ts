type TimelineEventType =
  | 'run_started'
  | 'progress_step'
  | 'tool_call'
  | 'tool_result'
  | 'assistant_message'
  | 'error'
  | 'snapshot'
  | 'spec_generated'
  | 'spec_verification'

export interface TimelineEventRecord {
  _id: string
  type: string
  content?: string
  status?: string
  progressCategory?: string
  progressToolName?: string
  targetFilePaths?: string[]
  toolName?: string
  error?: string
  createdAt: number
}

export type SpecTimelineStatus = 'generated' | 'verified' | 'failed'

export interface TimelineItem {
  event: TimelineEventRecord
  label: string
  fileCount: number
  isSnapshot: boolean
  isError: boolean
  isSpec: boolean
  specStatus?: SpecTimelineStatus
}

export interface TimelineSelection {
  items: TimelineItem[]
  hasSnapshots: boolean
  title: 'History Checkpoints' | 'Run Timeline'
}

const TIMELINE_EVENT_TYPES = new Set<TimelineEventType>([
  'run_started',
  'progress_step',
  'tool_call',
  'tool_result',
  'assistant_message',
  'error',
  'snapshot',
  'spec_generated',
  'spec_verification',
])

function toTitleCase(value: string): string {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function getTimelineLabel(event: TimelineEventRecord): string {
  switch (event.type) {
    case 'run_started':
      return 'Run Started'
    case 'assistant_message':
      return 'Assistant Response'
    case 'snapshot':
      return 'Checkpoint Created'
    case 'spec_generated':
      return 'Spec Generated'
    case 'spec_verification':
      return 'Spec Verification'
    case 'progress_step': {
      const category = event.progressCategory ? toTitleCase(event.progressCategory) : 'Progress'
      if (event.progressCategory === 'tool' && event.progressToolName) {
        return `Tool Step: ${event.progressToolName}`
      }
      return `${category} Step`
    }
    case 'tool_call':
      return `Tool Call: ${event.toolName ?? 'unknown'}`
    case 'tool_result':
      return `Tool Result: ${event.toolName ?? 'unknown'}`
    case 'error':
      return 'Error'
    default:
      return toTitleCase(event.type)
  }
}

export function selectTimelineEvents(events: TimelineEventRecord[]): TimelineSelection {
  const items = events
    .filter((event): event is TimelineEventRecord & { type: TimelineEventType } =>
      TIMELINE_EVENT_TYPES.has(event.type as TimelineEventType)
    )
    .map((event) => {
      const isSpec = event.type === 'spec_generated' || event.type === 'spec_verification'
      const specStatus: import('./timeline-utils').SpecTimelineStatus | undefined = isSpec
        ? event.type === 'spec_generated'
          ? 'generated'
          : event.status === 'error'
            ? 'failed'
            : 'verified'
        : undefined

      return {
        event,
        label: getTimelineLabel(event),
        fileCount: event.targetFilePaths?.length ?? 0,
        isSnapshot: event.type === 'snapshot',
        isError:
          event.type === 'error' ||
          event.status === 'error' ||
          Boolean(event.error && event.error.length > 0),
        isSpec,
        specStatus,
      }
    })

  const hasSnapshots = items.some((item) => item.isSnapshot)

  return {
    items,
    hasSnapshots,
    title: hasSnapshots ? 'History Checkpoints' : 'Run Timeline',
  }
}
