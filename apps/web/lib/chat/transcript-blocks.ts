import type { Message, ToolCallInfo } from '@/components/chat/types'
import {
  derivePlanProgress,
  mapLatestRunSummaryProgressSteps,
  parsePlanSteps,
  type LiveProgressStep,
  type PlanProgressSummary,
} from '@/components/chat/live-run-utils'
import type { PersistedRunEventSummaryInfo } from '@/components/chat/types'
import type { ExecutionReceipt } from '@/lib/agent/receipt'
import type { ChatMode } from '@/lib/agent/chat-modes'
import { getTranscriptModePolicy } from './transcript-policy'

/* -------------------------------------------------------------------------- */
/*  Block types                                                               */
/* -------------------------------------------------------------------------- */

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
        target: 'proof' | 'changes'
      }
      createdAt: number
    }
  /**
   * Collapsed tool-chip row.
   *
   * Groups completed tool calls into a single compact row the user can expand.
   * Inspired by Cursor's inline tool-chip UX: show a one-line summary like
   * "Edited 3 files · Ran 2 commands" and let the user click to see details.
   */
  | {
      id: string
      kind: 'tool_chips'
      /** Pre-grouped summaries for quick rendering */
      groups: ToolChipGroup[]
      /** Expanded detail entries (shown when user clicks to expand) */
      entries: ToolChipEntry[]
      createdAt: number
    }
  /**
   * Plan checklist.
   *
   * A Windsurf-inspired checklist showing plan step progress in the chat.
   * Each step shows its status (completed / active / pending) so the user
   * can see exactly where the agent is in the plan at a glance.
   */
  | {
      id: string
      kind: 'plan_checklist'
      steps: PlanChecklistStep[]
      completedCount: number
      totalCount: number
      createdAt: number
    }

export type ToolChipGroup = {
  label: string
  count: number
  tone: 'default' | 'primary' | 'success' | 'danger'
}

export type ToolChipEntry = {
  id: string
  label: string
  summary?: string
  status: 'completed' | 'error' | 'running'
  filePaths?: string[]
  durationMs?: number
}

export type PlanChecklistStep = {
  index: number
  title: string
  status: 'completed' | 'active' | 'pending'
}

/* -------------------------------------------------------------------------- */
/*  Feed item type                                                            */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/*  Message block helpers                                                     */
/* -------------------------------------------------------------------------- */

function buildAssistantBlocksFromStructuredMessage(message: Message): TranscriptBlock[] | null {
  if (!message.blocks?.length) return null

  const blocks: TranscriptBlock[] = []

  message.blocks.forEach((block, index) => {
    const createdAt = message.createdAt
    const id = `${message._id}-block-${index}`

    switch (block.type) {
      case 'reasoning_summary': {
        if (block.redacted || !block.text?.trim()) {
          blocks.push({
            id,
            kind: 'thinking_redacted',
            content: buildReasoningUnavailableText(block.tokenCount),
            createdAt,
          })
        } else {
          blocks.push({
            id,
            kind: 'thinking_teaser',
            content: buildReasoningPreview(block.text),
            fullContent: block.text,
            createdAt,
          })
        }
        break
      }
      case 'text': {
        blocks.push({
          id,
          kind: 'assistant_text',
          content: block.text,
          createdAt,
        })
        break
      }
      case 'error': {
        blocks.push({
          id,
          kind: 'assistant_text',
          content: block.message,
          createdAt,
        })
        break
      }
      default:
        break
    }
  })

  return blocks.length > 0 ? blocks : null
}

/* -------------------------------------------------------------------------- */
/*  Reasoning helpers                                                         */
/* -------------------------------------------------------------------------- */

function buildReasoningPreview(content: string): string {
  const normalized = content.replace(/\s+/g, ' ').trim()
  if (normalized.length <= 140) return normalized
  return `${normalized.slice(0, 137).trimEnd()}...`
}

function buildReasoningUnavailableText(reasoningTokens?: number): string {
  if (
    typeof reasoningTokens === 'number' &&
    Number.isFinite(reasoningTokens) &&
    reasoningTokens > 0
  ) {
    return `Thinking used · summary unavailable · ${reasoningTokens.toLocaleString()} tokens`
  }
  return 'Thinking used · summary unavailable'
}

/* -------------------------------------------------------------------------- */
/*  Assistant message blocks                                                  */
/* -------------------------------------------------------------------------- */

export function buildAssistantMessageTranscriptBlocks(message: Message): TranscriptBlock[] {
  if (message.role !== 'assistant') {
    return []
  }

  const structuredBlocks = buildAssistantBlocksFromStructuredMessage(message)
  if (structuredBlocks) return structuredBlocks

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
      content: buildReasoningUnavailableText(message.annotations.reasoningTokens),
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

/* -------------------------------------------------------------------------- */
/*  Tool chip builders                                                        */
/* -------------------------------------------------------------------------- */

function classifyToolName(
  toolName: string | undefined
): 'edit' | 'command' | 'search' | 'read' | 'other' {
  if (!toolName) return 'other'
  const lower = toolName.toLowerCase()
  if (
    lower.includes('write') ||
    lower.includes('edit') ||
    lower.includes('patch') ||
    lower.includes('apply')
  ) {
    return 'edit'
  }
  if (
    lower.includes('command') ||
    lower.includes('terminal') ||
    lower.includes('shell') ||
    lower.includes('run') ||
    lower.includes('test') ||
    lower.includes('lint')
  ) {
    return 'command'
  }
  if (lower.includes('search') || lower.includes('grep') || lower.includes('find')) {
    return 'search'
  }
  if (lower.includes('read') || lower.includes('list') || lower.includes('dir')) {
    return 'read'
  }
  return 'other'
}

const TOOL_GROUP_LABELS: Record<string, string> = {
  edit: 'Edited',
  command: 'Ran',
  search: 'Searched',
  read: 'Read',
  other: 'Used',
}

function summarizeToolEntry(step: LiveProgressStep): string | undefined {
  const paths = step.details?.targetFilePaths
  if (paths && paths.length > 0) {
    const preview = paths.slice(0, 2).join(', ')
    return paths.length > 2 ? `${preview} +${paths.length - 2} more` : preview
  }
  return step.details?.argsSummary
}

function buildToolChipsFromSteps(steps: LiveProgressStep[]): TranscriptBlock | null {
  const toolSteps = steps.filter(
    (step) =>
      step.category === 'tool' && (step.status === 'completed' || step.status === 'error')
  )

  if (toolSteps.length === 0) return null

  // Group by classification
  const groupsMap = new Map<string, { count: number; hasError: boolean }>()
  const entries: ToolChipEntry[] = []

  for (const step of toolSteps) {
    const classification = classifyToolName(step.details?.toolName)
    const group = groupsMap.get(classification)
    const hasError = step.status === 'error'

    if (group) {
      group.count++
      group.hasError = group.hasError || hasError
    } else {
      groupsMap.set(classification, { count: 1, hasError })
    }

    entries.push({
      id: step.id,
      label: step.content,
      summary: summarizeToolEntry(step),
      status: step.status,
      filePaths: step.details?.targetFilePaths,
      durationMs: step.details?.durationMs,
    })
  }

  const groups: ToolChipGroup[] = []
  for (const [classification, data] of groupsMap) {
    groups.push({
      label: TOOL_GROUP_LABELS[classification] ?? 'Used',
      count: data.count,
      tone: data.hasError ? 'danger' : classification === 'edit' ? 'primary' : 'default',
    })
  }

  return {
    id: `tool-chips-${toolSteps[0].id}`,
    kind: 'tool_chips',
    groups,
    entries,
    createdAt: toolSteps[0].createdAt,
  }
}

/* -------------------------------------------------------------------------- */
/*  Plan checklist builder                                                    */
/* -------------------------------------------------------------------------- */

function buildPlanChecklist(
  planDraft: string | null | undefined,
  steps: LiveProgressStep[]
): TranscriptBlock | null {
  const planSteps = parsePlanSteps(planDraft)
  if (planSteps.length === 0) return null

  const progress = derivePlanProgress(planSteps, steps)

  const checklistSteps: PlanChecklistStep[] = planSteps.map((title, index) => ({
    index,
    title,
    status: progress.statuses[index] ?? 'pending',
  }))

  return {
    id: 'plan-checklist',
    kind: 'plan_checklist',
    steps: checklistSteps,
    completedCount: progress.completedSteps,
    totalCount: progress.totalSteps,
    createdAt: steps[0]?.createdAt ?? Date.now(),
  }
}

/* -------------------------------------------------------------------------- */
/*  Main feed builder                                                         */
/* -------------------------------------------------------------------------- */

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
  /** Plan draft text for checklist rendering */
  planDraft?: string | null
}): TranscriptFeedItem[] {
  const items: TranscriptFeedItem[] = args.messages.map((message) => ({
    id: `message-${message._id}`,
    type: 'message' as const,
    createdAt: message.createdAt,
    message,
  }))

  const policy = getTranscriptModePolicy(args.chatMode)

  const steps =
    args.liveSteps && args.liveSteps.length > 0
      ? args.liveSteps
      : mapLatestRunSummaryProgressSteps(args.runEvents ?? [])

  // Chat owns only compact tool summaries; full tool details belong in the Proof inspector.
  if (policy.chatAllows.includes('compact_tool_chips')) {
    const toolChipBlock = buildToolChipsFromSteps(steps)
    if (toolChipBlock) {
      items.push({
        id: `block-${toolChipBlock.id}`,
        type: 'block',
        createdAt: toolChipBlock.createdAt,
        block: toolChipBlock,
      })
    }
  }

  // Chat may show a compact plan checklist; plan detail stays in Context.
  if (policy.chatAllows.includes('plan_checklist') && args.planDraft) {
    const checklistBlock = buildPlanChecklist(args.planDraft, steps)
    if (checklistBlock) {
      items.push({
        id: `block-${checklistBlock.id}`,
        type: 'block',
        createdAt: checklistBlock.createdAt,
        block: checklistBlock,
      })
    }
  }

  return items
}
