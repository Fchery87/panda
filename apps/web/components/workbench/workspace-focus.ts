'use client'

export type WorkspaceFocusTone = 'neutral' | 'progress' | 'attention' | 'success'

export type WorkspaceFocusActionId =
  | 'open_plan'
  | 'build_from_plan'
  | 'open_run'
  | 'review_changes'
  | 'open_preview'

export interface WorkspaceFocusAction {
  id: WorkspaceFocusActionId
  label: string
}

export interface WorkspaceFocusState {
  kind: 'planning-intake' | 'plan-review' | 'plan-approved' | 'executing' | 'review-ready'
  kicker: string
  objective: string
  statusLabel: string
  tone: WorkspaceFocusTone
  detail: string
  nextStep: string
  primaryAction?: WorkspaceFocusAction
  secondaryAction?: WorkspaceFocusAction
}
