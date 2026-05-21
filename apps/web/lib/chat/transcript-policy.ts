import type { PersistedRunEventInfo } from '@/components/chat/types'
import type { ChatMode } from '@/lib/agent/chat-modes'

export type TranscriptSurface = 'chat' | 'inspector'

export type ChatSurfaceCapability =
  | 'messages'
  | 'reasoning'
  | 'compact_tool_chips'
  | 'plan_checklist'
  | 'run_summary'

export type InspectorSurfaceCapability =
  | 'tool_calls'
  | 'progress_steps'
  | 'snapshots'
  | 'debug_labels'
  | 'run_trace'
  | 'approvals'
  | 'artifacts'
  | 'memory'
  | 'evals'

export const TRANSCRIPT_SURFACE_OWNERSHIP = {
  chat: 'user intent, assistant answer, compact reasoning, compact run summary',
  proof: 'run trace, tool calls, approvals, snapshots, debug/provenance',
  changes: 'artifacts, diffs, generated/modified files',
  context: 'plan, memory, evals, specifications',
  workbench: 'editor, file tabs, preview, active file work',
  terminal: 'command logs and running processes',
} as const

export type TranscriptModePolicy = {
  mode: ChatMode
  surfaceLabel: 'Plan' | 'Code' | 'Build'
  surfaced: boolean
  chatAllows: ChatSurfaceCapability[]
  inspectorOwns: InspectorSurfaceCapability[]
  summary: string
}

const DEFAULT_INSPECTOR_OWNERSHIP: InspectorSurfaceCapability[] = [
  'tool_calls',
  'progress_steps',
  'snapshots',
  'debug_labels',
  'run_trace',
  'approvals',
  'artifacts',
  'memory',
  'evals',
]

export const TRANSCRIPT_MODE_POLICIES: Record<ChatMode, TranscriptModePolicy> = {
  ask: {
    mode: 'ask',
    surfaceLabel: 'Code',
    surfaced: false,
    chatAllows: ['messages', 'reasoning', 'run_summary'],
    inspectorOwns: DEFAULT_INSPECTOR_OWNERSHIP,
    summary:
      'Internal ask behavior stays conversational and is surfaced under the Code experience.',
  },
  plan: {
    mode: 'plan',
    surfaceLabel: 'Plan',
    surfaced: true,
    chatAllows: ['messages', 'reasoning', 'plan_checklist', 'run_summary'],
    inspectorOwns: DEFAULT_INSPECTOR_OWNERSHIP,
    summary:
      'Plan mode shows structured planning output and approval surfaces, not execution trace.',
  },
  code: {
    mode: 'code',
    surfaceLabel: 'Code',
    surfaced: true,
    chatAllows: ['messages', 'reasoning', 'compact_tool_chips', 'plan_checklist', 'run_summary'],
    inspectorOwns: DEFAULT_INSPECTOR_OWNERSHIP,
    summary:
      'Code mode keeps the transcript conversational while the inspector carries detailed trace.',
  },
  build: {
    mode: 'build',
    surfaceLabel: 'Build',
    surfaced: true,
    chatAllows: ['messages', 'reasoning', 'compact_tool_chips', 'plan_checklist', 'run_summary'],
    inspectorOwns: DEFAULT_INSPECTOR_OWNERSHIP,
    summary:
      'Build mode keeps the transcript conversational while the inspector carries detailed trace.',
  },
}

export function getTranscriptModePolicy(mode: ChatMode): TranscriptModePolicy {
  return TRANSCRIPT_MODE_POLICIES[mode]
}

export function getSurfacedTranscriptModePolicies(): TranscriptModePolicy[] {
  return Object.values(TRANSCRIPT_MODE_POLICIES).filter((policy) => policy.surfaced)
}

export function mapRunEventToSurface(event: PersistedRunEventInfo): TranscriptSurface {
  if (
    event.type === 'tool_call' ||
    event.type === 'tool_result' ||
    event.type === 'progress_step' ||
    event.type === 'snapshot' ||
    event.type === 'permission_request' ||
    event.type === 'interrupt_request' ||
    event.type === 'spec_pending_approval' ||
    event.progressCategory === 'analysis' ||
    event.progressCategory === 'tool' ||
    event.progressCategory === 'rewrite' ||
    event.progressCategory === 'complete'
  ) {
    return 'inspector'
  }

  return 'chat'
}
