import type { Message, ToolCallInfo } from '@/components/chat/types'
import {
  mapLatestRunSummaryProgressSteps,
  type LiveProgressStep,
} from '@/components/chat/live-run-utils'
import type { PersistedRunEventSummaryInfo } from '@/components/chat/types'
import type { ExecutionReceipt } from '@/lib/agent/receipt'
import type { ChatMode } from '@/lib/agent/chat-modes'
import { getRunTimeline, type RunTimelineStage } from '@/components/chat/run-timeline'
import { getTranscriptModePolicy } from './transcript-policy'

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
  | {
      id: string
      kind: 'execution_update'
      title: string
      detail?: string
      tone: 'default' | 'primary' | 'warning' | 'danger' | 'success'
      kicker?: string
      meta?: string
      action?: {
        label: string
        target: 'run' | 'changes'
      }
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

  return blocks
}

export function buildTranscriptFeedItems(args: {
  messages: Message[]
  chatMode: ChatMode
  liveSteps?: LiveProgressStep[]
  runEvents?: PersistedRunEventSummaryInfo[]
  latestRunReceipt?: ExecutionReceipt | null
  userIntent?: string | null
  currentSpec?: unknown
  pendingSpec?: unknown
  planStatus?: unknown
  isStreaming?: boolean
}): TranscriptFeedItem[] {
  const items: TranscriptFeedItem[] = args.messages.map((message) => ({
    id: `message-${message._id}`,
    type: 'message' as const,
    createdAt: message.createdAt,
    message,
  }))

  const policy = getTranscriptModePolicy(args.chatMode)
  if (!policy.chatAllows.includes('milestone_summaries')) {
    return items
  }

  const steps =
    args.liveSteps && args.liveSteps.length > 0
      ? args.liveSteps
      : mapLatestRunSummaryProgressSteps(args.runEvents ?? [])

  const timeline = getRunTimeline(
    {
      steps,
      receipt: args.latestRunReceipt,
      userIntent: args.userIntent,
      isStreaming: args.isStreaming,
    },
    {
      mode: 'chat',
      detail: 'summary',
      include: {
        emptyStages: false,
        diagnostics: false,
      },
    }
  )
  const surfacedStages = timeline.stages.filter((stage) => stage.kind !== 'intent')

  if (surfacedStages.length === 0) {
    return items
  }

  const blocks: TranscriptFeedItem[] = surfacedStages.map((stage) => ({
    id: `block-${stage.id}`,
    type: 'block',
    createdAt: stage.finishedAt ?? stage.startedAt ?? Date.now(),
    block: buildExecutionUpdateBlock(stage),
  }))

  return [...items, ...blocks]
}

function executionToneForStage(
  stage: RunTimelineStage
): Extract<TranscriptBlock, { kind: 'execution_update' }>['tone'] {
  if (stage.status === 'failed') return 'danger'
  if (stage.status === 'blocked') return 'warning'
  if (stage.kind === 'routing' || stage.kind === 'execution') return 'primary'
  if (stage.kind === 'receipt' && stage.status === 'complete') return 'success'
  if (stage.kind === 'validation' && stage.status === 'complete') return 'success'
  return 'default'
}

function summarizeStage(stage: RunTimelineStage): string | undefined {
  const primaryEntry = stage.entries.at(-1)
  const summary = primaryEntry?.summary ?? primaryEntry?.detail
  if (summary) return summary
  return stage.message
}

function buildStageAction(
  stage: RunTimelineStage
): Extract<TranscriptBlock, { kind: 'execution_update' }>['action'] | undefined {
  if (stage.kind === 'receipt') {
    return { label: 'Open Run Proof', target: 'run' }
  }
  if (stage.kind === 'execution' && stage.entries.some((entry) => entry.summary)) {
    return { label: 'Inspect Changes', target: 'changes' }
  }
  return undefined
}

function buildExecutionUpdateBlock(
  stage: RunTimelineStage
): Extract<TranscriptBlock, { kind: 'execution_update' }> {
  const latestEntry = stage.entries.at(-1)
  const entryCount = stage.entries.length

  return {
    id: stage.id,
    kind: 'execution_update',
    title: latestEntry?.label ?? stage.label,
    detail: summarizeStage(stage),
    tone: executionToneForStage(stage),
    kicker: stage.label,
    meta: entryCount > 1 ? `${entryCount} signals` : undefined,
    action: buildStageAction(stage),
    createdAt: stage.finishedAt ?? stage.startedAt ?? Date.now(),
  }
}
