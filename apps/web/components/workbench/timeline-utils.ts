type TimelineEventType = 'progress_step' | 'tool_call' | 'tool_result' | 'error' | 'snapshot'

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

export interface TimelineItem {
  event: TimelineEventRecord
  label: string
  fileCount: number
  isSnapshot: boolean
  isError: boolean
}

export interface TimelineSelection {
  items: TimelineItem[]
  hasSnapshots: boolean
  title: 'History Checkpoints' | 'Run Timeline'
}

const TIMELINE_EVENT_TYPES = new Set<TimelineEventType>([
  'progress_step',
  'tool_call',
  'tool_result',
  'error',
  'snapshot',
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
    case 'snapshot':
      return 'Checkpoint Created'
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
    .map((event) => ({
      event,
      label: getTimelineLabel(event),
      fileCount: event.targetFilePaths?.length ?? 0,
      isSnapshot: event.type === 'snapshot',
      isError:
        event.type === 'error' ||
        event.status === 'error' ||
        Boolean(event.error && event.error.length > 0),
    }))

  const hasSnapshots = items.some((item) => item.isSnapshot)

  return {
    items,
    hasSnapshots,
    title: hasSnapshots ? 'History Checkpoints' : 'Run Timeline',
  }
}
