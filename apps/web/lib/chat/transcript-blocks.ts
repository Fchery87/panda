import type { Message, ToolCallInfo } from '@/components/chat/types'
import {
  deriveChatMilestoneSummaries,
  mapLatestRunSummaryProgressSteps,
  type LiveProgressStep,
} from '@/components/chat/live-run-utils'
import type { PersistedRunEventSummaryInfo } from '@/components/chat/types'
import type { ChatMode } from '@/lib/agent/chat-modes'
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

  const summaries = deriveChatMilestoneSummaries(steps)
  if (summaries.length === 0) {
    return items
  }

  const blocks: TranscriptFeedItem[] = summaries.map((summary) => ({
    id: `block-${summary.id}`,
    type: 'block',
    createdAt: summary.createdAt,
    block: {
      id: summary.id,
      kind: 'execution_update',
      title: summary.title,
      detail: summary.detail,
      tone: summary.tone,
      createdAt: summary.createdAt,
    },
  }))

  return [...items, ...blocks]
}
