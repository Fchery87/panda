import type { ChatMode } from '@/lib/agent/prompt-library'

interface BackgroundExecutionPolicy {
  harnessSpecApprovalMode: 'interactive' | 'auto_approve'
  autoOpenInspectorOnExecutionStart: boolean
  autoOpenInspectorOnPlanExecution: boolean
  showInlinePlanReview: boolean
  showInlineSpecReview: boolean
  showInlineRunTimeline: boolean
}

/**
 * Resolve background execution policy for a chat mode.
 * All modes currently auto-approve specs for streamlined execution.
 */
export function resolveBackgroundExecutionPolicy(_mode: ChatMode): BackgroundExecutionPolicy {
  return {
    harnessSpecApprovalMode: 'auto_approve',
    autoOpenInspectorOnExecutionStart: false,
    autoOpenInspectorOnPlanExecution: false,
    showInlinePlanReview: true,
    showInlineSpecReview: true,
    showInlineRunTimeline: true,
  }
}
