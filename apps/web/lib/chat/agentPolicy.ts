import type { ChatMode } from '@/lib/agent/prompt-library'

export type OversightLevel = 'review' | 'autopilot'

export interface AgentPolicy {
  specApprovalMode: 'interactive' | 'auto_approve'
  planApprovalMode: 'interactive' | 'auto_approve'
  showSpecReview: boolean
  showPlanReview: boolean
  showRunTimeline: boolean
  autoOpenInspectorOnExecutionStart: boolean
}

export function resolveAgentPolicy(args: {
  chatMode: ChatMode
  oversightLevel: OversightLevel
}): AgentPolicy {
  const specEngineEnabled = args.chatMode !== 'architect'
  const isAuto = args.oversightLevel === 'autopilot'

  return {
    specApprovalMode: isAuto ? 'auto_approve' : 'interactive',
    planApprovalMode: isAuto ? 'auto_approve' : 'interactive',
    showSpecReview: specEngineEnabled,
    showPlanReview: true,
    showRunTimeline: true,
    autoOpenInspectorOnExecutionStart: !isAuto,
  }
}
