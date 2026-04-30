'use client'

import type { ExecutionSessionViewModel } from '@/lib/workspace/execution-session-view-model'

export type WorkspaceFocusTone = 'neutral' | 'progress' | 'attention' | 'success'

export type WorkspaceFocusActionId =
  | 'open_plan'
  | 'continue_planning'
  | 'build_from_plan'
  | 'open_run'
  | 'review_changes'
  | 'open_preview'

export interface WorkspaceFocusAction {
  id: WorkspaceFocusActionId
  label: string
}

export interface WorkspaceFocusState {
  kind:
    | 'planning-intake'
    | 'plan-review'
    | 'plan-approved'
    | 'executing'
    | 'review-ready'
    | 'execution-session'
  kicker: string
  objective: string
  statusLabel: string
  tone: WorkspaceFocusTone
  detail: string
  nextStep: string
  primaryAction?: WorkspaceFocusAction
  secondaryAction?: WorkspaceFocusAction
  executionSession?: ExecutionSessionViewModel | null
}
