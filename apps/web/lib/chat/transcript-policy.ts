import type { PersistedRunEventInfo } from '@/components/chat/types'
import type { ChatMode } from '@/lib/agent/chat-modes'

export type TranscriptSurface = 'chat' | 'inspector'

export type TranscriptModePolicy = {
  mode: ChatMode
  surfaceLabel: 'Plan' | 'Code' | 'Build'
  surfaced: boolean
  chatAllows: Array<
    'messages' | 'reasoning' | 'plan_actions' | 'spec_actions' | 'milestone_summaries'
  >
  inspectorOwns: Array<'tool_calls' | 'progress_steps' | 'snapshots' | 'debug_labels' | 'run_trace'>
  summary: string
}

export const TRANSCRIPT_MODE_POLICIES: Record<ChatMode, TranscriptModePolicy> = {
  ask: {
    mode: 'ask',
    surfaceLabel: 'Code',
    surfaced: false,
    chatAllows: ['messages', 'reasoning'],
    inspectorOwns: ['tool_calls', 'progress_steps', 'snapshots', 'debug_labels', 'run_trace'],
    summary:
      'Internal ask behavior stays conversational and is surfaced under the Code experience.',
  },
  plan: {
    mode: 'plan',
    surfaceLabel: 'Plan',
    surfaced: true,
    chatAllows: ['messages', 'reasoning', 'plan_actions', 'spec_actions'],
    inspectorOwns: ['tool_calls', 'progress_steps', 'snapshots', 'debug_labels', 'run_trace'],
    summary:
      'Plan mode shows structured planning output and approval surfaces, not execution trace.',
  },
  code: {
    mode: 'code',
    surfaceLabel: 'Code',
    surfaced: true,
    chatAllows: ['messages', 'reasoning', 'plan_actions', 'spec_actions', 'milestone_summaries'],
    inspectorOwns: ['tool_calls', 'progress_steps', 'snapshots', 'debug_labels', 'run_trace'],
    summary:
      'Code mode keeps the transcript outcome-focused while the inspector carries detailed trace.',
  },
  build: {
    mode: 'build',
    surfaceLabel: 'Build',
    surfaced: true,
    chatAllows: ['messages', 'reasoning', 'plan_actions', 'spec_actions', 'milestone_summaries'],
    inspectorOwns: ['tool_calls', 'progress_steps', 'snapshots', 'debug_labels', 'run_trace'],
    summary:
      'Build mode allows concise milestone messaging in chat and full execution detail in the inspector.',
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
