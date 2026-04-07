import type { Message, PersistedRunEventInfo, ToolCallInfo } from '@/components/chat/types'
import type { LiveProgressStep } from '@/components/chat/live-run-utils'
import type { FormalSpecification } from '@/lib/agent/spec/types'
import type { PlanStatus } from '@/lib/chat/planDraft'
import { mapLatestRunProgressSteps } from '@/components/chat/live-run-utils'

export type TranscriptBlock =
  | {
      id: string
      kind: 'assistant_text'
      content: string
      createdAt: number
    }
  | {
      id: string
      kind: 'thinking_teaser'
      content: string
      fullContent: string
      createdAt: number
    }
  | {
      id: string
      kind: 'thinking_expanded'
      content: string
      createdAt: number
    }
  | {
      id: string
      kind: 'thinking_redacted'
      content: string
      createdAt: number
    }
  | {
      id: string
      kind: 'tool_use'
      call: ToolCallInfo
      createdAt: number
    }
  | {
      id: string
      kind: 'tool_result'
      call: ToolCallInfo
      createdAt: number
    }
  | {
      id: string
      kind: 'progress_line'
      step: LiveProgressStep
      createdAt: number
    }
  | {
      id: string
      kind: 'approval_request'
      title: string
      detail?: string
      createdAt: number
    }
  | {
      id: string
      kind: 'snapshot_marker'
      title: string
      detail?: string
      createdAt: number
    }
  | {
      id: string
      kind: 'spec_status'
      title: string
      detail?: string
      tone: 'default' | 'primary' | 'warning' | 'danger' | 'success'
      createdAt: number
    }

export type TranscriptFeedItem =
  | {
      id: string
      type: 'message'
      createdAt: number
      message: Message
    }
  | {
      id: string
      type: 'block'
      createdAt: number
      block: TranscriptBlock
    }

function buildReasoningPreview(content: string): string {
  const normalized = content.replace(/\s+/g, ' ').trim()
  if (normalized.length <= 140) return normalized
  return `${normalized.slice(0, 137).trimEnd()}...`
}

export function buildAssistantMessageTranscriptBlocks(message: Message): TranscriptBlock[] {
  if (message.role !== 'assistant') {
    return []
  }

  const blocks: TranscriptBlock[] = []
  const reasoningContent = message.reasoningContent?.trim()

  if (reasoningContent) {
    blocks.push({
      id: `${message._id}-thinking`,
      kind: 'thinking_teaser',
      content: buildReasoningPreview(reasoningContent),
      fullContent: reasoningContent,
      createdAt: message.createdAt,
    })
  } else if (message.annotations?.reasoningTokens) {
    blocks.push({
      id: `${message._id}-thinking-redacted`,
      kind: 'thinking_redacted',
      content: 'Thinking is available in the run trace for this step.',
      createdAt: message.createdAt,
    })
  }

  blocks.push({
    id: `${message._id}-text`,
    kind: 'assistant_text',
    content: message.content,
    createdAt: message.createdAt,
  })

  for (const call of message.toolCalls ?? []) {
    blocks.push({
      id: `${message._id}-${call.id}-${call.status === 'completed' || call.status === 'error' ? 'result' : 'use'}`,
      kind: call.status === 'completed' || call.status === 'error' ? 'tool_result' : 'tool_use',
      call,
      createdAt: message.createdAt,
    })
  }

  return blocks
}

function scopeLatestRunEvents(events: PersistedRunEventInfo[]): PersistedRunEventInfo[] {
  const latestRunId = [...events]
    .reverse()
    .find((event) => typeof event.runId === 'string' && event.runId.length > 0)?.runId

  if (!latestRunId) return events
  return events.filter((event) => event.runId === latestRunId)
}

function shouldShowTranscriptTail(args: {
  isStreaming: boolean
  lastMessageAt: number | null
  lastEventAt: number | null
}): boolean {
  if (args.isStreaming) return true
  if (args.lastMessageAt === null || args.lastEventAt === null) return false
  return args.lastEventAt >= args.lastMessageAt - 15_000
}

function buildApprovalRequestBlock(
  events: PersistedRunEventInfo[],
  pendingSpec: FormalSpecification | null | undefined
): TranscriptBlock | null {
  if (pendingSpec) {
    return {
      id: `approval-spec-${pendingSpec.id}`,
      kind: 'approval_request',
      title: 'Specification approval required',
      detail: pendingSpec.intent.goal,
      createdAt: Date.now(),
    }
  }

  const latestApprovalEvent = [...events]
    .reverse()
    .find((event) =>
      ['spec_pending_approval', 'permission_request', 'interrupt_request'].includes(event.type)
    )

  if (!latestApprovalEvent) return null

  return {
    id: latestApprovalEvent._id ?? `approval-${latestApprovalEvent.type}`,
    kind: 'approval_request',
    title:
      latestApprovalEvent.type === 'spec_pending_approval'
        ? 'Specification approval required'
        : 'Approval requested',
    detail: latestApprovalEvent.content,
    createdAt: latestApprovalEvent.createdAt ?? Date.now(),
  }
}

function buildSnapshotBlocks(events: PersistedRunEventInfo[]): TranscriptBlock[] {
  return events
    .filter((event) => event.type === 'snapshot' && event.snapshot)
    .slice(-2)
    .map((event, index) => ({
      id: event._id ?? `snapshot-${event.snapshot?.hash ?? index}`,
      kind: 'snapshot_marker' as const,
      title: event.content ?? `Snapshot saved · step ${event.snapshot?.step ?? index + 1}`,
      detail:
        event.snapshot?.files && event.snapshot.files.length > 0
          ? event.snapshot.files.slice(0, 2).join(', ')
          : undefined,
      createdAt: event.createdAt ?? event.snapshot?.timestamp ?? Date.now(),
    }))
}

function buildSpecStatusBlock(
  currentSpec: FormalSpecification | null | undefined,
  planStatus: PlanStatus | null | undefined,
  fallbackCreatedAt: number
): TranscriptBlock | null {
  if (currentSpec) {
    const tone: 'default' | 'primary' | 'warning' | 'danger' | 'success' =
      currentSpec.status === 'verified'
        ? 'success'
        : currentSpec.status === 'failed'
          ? 'danger'
          : currentSpec.status === 'drifted'
            ? 'warning'
            : currentSpec.status === 'approved' || currentSpec.status === 'executing'
              ? 'primary'
              : 'default'

    return {
      id: `spec-${currentSpec.id}-${currentSpec.status}`,
      kind: 'spec_status',
      title: `Spec ${currentSpec.status}`,
      detail: currentSpec.intent.goal,
      tone,
      createdAt: fallbackCreatedAt,
    }
  }

  if (!planStatus || planStatus === 'idle') return null

  return {
    id: `plan-${planStatus}`,
    kind: 'spec_status',
    title: `Plan ${planStatus.replace('_', ' ')}`,
    detail: 'Accepted plans remain the execution contract for delivery.',
    tone:
      planStatus === 'completed'
        ? 'success'
        : planStatus === 'failed'
          ? 'danger'
          : planStatus === 'partial' || planStatus === 'stale'
            ? 'warning'
            : 'primary',
    createdAt: fallbackCreatedAt,
  }
}

export function buildTranscriptFeedItems(args: {
  messages: Message[]
  liveSteps?: LiveProgressStep[]
  runEvents?: PersistedRunEventInfo[]
  currentSpec?: FormalSpecification | null
  pendingSpec?: FormalSpecification | null
  planStatus?: PlanStatus | null
  isStreaming?: boolean
}): TranscriptFeedItem[] {
  const messageItems: TranscriptFeedItem[] = args.messages.map((message) => ({
    id: `message-${message._id}`,
    type: 'message',
    createdAt: message.createdAt,
    message,
  }))

  const scopedEvents = scopeLatestRunEvents(args.runEvents ?? [])
  const progressSteps =
    args.liveSteps && args.liveSteps.length > 0
      ? args.liveSteps
      : mapLatestRunProgressSteps(scopedEvents)
  const lastMessageAt =
    args.messages.length > 0 ? args.messages[args.messages.length - 1]!.createdAt : null
  const lastEventAt =
    scopedEvents.length > 0 ? (scopedEvents[scopedEvents.length - 1]!.createdAt ?? null) : null

  if (
    !shouldShowTranscriptTail({
      isStreaming: Boolean(args.isStreaming),
      lastMessageAt,
      lastEventAt,
    })
  ) {
    return messageItems
  }

  const tailBlocks: TranscriptBlock[] = []

  for (const step of progressSteps.slice(-4)) {
    tailBlocks.push({
      id: `progress-${step.id}`,
      kind: 'progress_line',
      step,
      createdAt: step.createdAt,
    })
  }

  const approvalBlock = buildApprovalRequestBlock(scopedEvents, args.pendingSpec)
  if (approvalBlock) {
    tailBlocks.push(approvalBlock)
  }

  tailBlocks.push(...buildSnapshotBlocks(scopedEvents))

  const specStatusBlock = buildSpecStatusBlock(
    args.currentSpec,
    args.planStatus,
    lastEventAt ?? lastMessageAt ?? Date.now()
  )
  if (specStatusBlock) {
    tailBlocks.push(specStatusBlock)
  }

  if (tailBlocks.length === 0) {
    return messageItems
  }

  const blockItems: TranscriptFeedItem[] = tailBlocks
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((block) => ({
      id: `block-${block.id}`,
      type: 'block',
      createdAt: block.createdAt,
      block,
    }))

  const lastAssistantIndex = [...messageItems]
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.type === 'message' && item.message.role === 'assistant')
    .map(({ index }) => index)
    .pop()

  if (lastAssistantIndex === undefined) {
    return [...messageItems, ...blockItems]
  }

  return [
    ...messageItems.slice(0, lastAssistantIndex + 1),
    ...blockItems,
    ...messageItems.slice(lastAssistantIndex + 1),
  ]
}
