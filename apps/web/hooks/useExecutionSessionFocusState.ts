'use client'

import { useCallback, useMemo } from 'react'

import type {
  WorkspaceFocusActionId,
  WorkspaceFocusState,
} from '@/components/workbench/workspace-focus'
import type {
  ExecutionSessionNextActionId,
  ExecutionSessionViewModel,
} from '@/lib/workspace/execution-session-view-model'

interface UseExecutionSessionFocusStateArgs {
  executionSession: ExecutionSessionViewModel | null
  handleBuildFromPlan: () => void | Promise<void>
  openRightPanelTab: (tab: 'context' | 'proof' | 'changes') => void
  setActiveCenterTab: (tab: 'diff') => void
}

export function useExecutionSessionFocusState({
  executionSession,
  handleBuildFromPlan,
  openRightPanelTab,
  setActiveCenterTab,
}: UseExecutionSessionFocusStateArgs) {
  const workspaceFocusState = useMemo<WorkspaceFocusState | null>(() => {
    if (!executionSession) return null

    return {
      kind: 'execution-session',
      kicker: 'Execution Session',
      objective: executionSession.title,
      statusLabel: executionSession.statusLabel,
      tone: executionSession.tone,
      detail: executionSession.summary,
      nextStep: executionSession.nextStep,
      primaryAction: mapExecutionSessionAction(executionSession.primaryAction),
      secondaryAction: mapExecutionSessionAction(executionSession.secondaryAction),
      executionSession,
    }
  }, [executionSession])

  const handleFocusAction = useCallback(
    (actionId?: WorkspaceFocusActionId) => {
      if (!actionId) return

      switch (actionId) {
        case 'continue_planning':
        case 'open_plan':
          openRightPanelTab('context')
          break
        case 'build_from_plan':
          void handleBuildFromPlan()
          break
        case 'open_run':
          openRightPanelTab('proof')
          break
        case 'review_changes':
          setActiveCenterTab('diff')
          openRightPanelTab('changes')
          break
      }
    },
    [handleBuildFromPlan, openRightPanelTab, setActiveCenterTab]
  )

  const handleFocusPrimaryAction = useCallback(() => {
    handleFocusAction(workspaceFocusState?.primaryAction?.id)
  }, [handleFocusAction, workspaceFocusState?.primaryAction?.id])

  const handleFocusSecondaryAction = useCallback(() => {
    handleFocusAction(workspaceFocusState?.secondaryAction?.id)
  }, [handleFocusAction, workspaceFocusState?.secondaryAction?.id])

  return {
    workspaceFocusState,
    handleFocusPrimaryAction,
    handleFocusSecondaryAction,
  }
}

function mapExecutionSessionAction(action?: {
  id: ExecutionSessionNextActionId
  label: string
}): WorkspaceFocusState['primaryAction'] {
  if (!action) return undefined

  switch (action.id) {
    case 'continue_planning':
      return { id: 'continue_planning', label: action.label }
    case 'review_plan':
      return { id: 'open_plan', label: action.label }
    case 'build_from_plan':
      return { id: 'build_from_plan', label: action.label }
    case 'open_run':
      return { id: 'open_run', label: action.label }
    case 'review_changes':
      return { id: 'review_changes', label: action.label }
    case 'open_preview':
      return { id: 'open_preview', label: action.label }
    case 'start_session':
      return { id: 'open_run', label: action.label }
  }
}
