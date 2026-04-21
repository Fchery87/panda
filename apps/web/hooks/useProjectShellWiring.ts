'use client'

import { useEffect } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import type { Id } from '@convex/_generated/dataModel'
import { useWorkspaceUiStore } from '@/stores/workspaceUiStore'
import { useShortcutListener } from '@/hooks/useShortcuts'
import { useSpecDriftDetection } from '@/hooks/useSpecDriftDetection'

interface UseProjectShellWiringArgs {
  projectId: Id<'projects'>
  agentIsLoading: boolean
  refreshGitStatus: () => Promise<unknown>
}

export function useProjectShellWiring({
  projectId,
  agentIsLoading,
  refreshGitStatus,
}: UseProjectShellWiringArgs) {
  const setTaskHeaderVisible = useWorkspaceUiStore((s) => s.setTaskHeaderVisible)

  useEffect(() => {
    void refreshGitStatus()
  }, [refreshGitStatus])

  useEffect(() => {
    setTaskHeaderVisible(agentIsLoading)
  }, [agentIsLoading, setTaskHeaderVisible])

  useHotkeys(
    'ctrl+j',
    (e) => {
      e.preventDefault()
      const s = useWorkspaceUiStore.getState()
      s.setBottomDockOpen(!s.isBottomDockOpen)
    },
    { enableOnFormTags: ['INPUT', 'TEXTAREA'] }
  )

  useHotkeys(
    'mod+l',
    (e) => {
      e.preventDefault()
      const s = useWorkspaceUiStore.getState()
      s.setRightPanelOpen(!s.isRightPanelOpen)
    },
    { enableOnFormTags: ['INPUT', 'TEXTAREA'] }
  )

  useShortcutListener()
  useSpecDriftDetection({ projectId })
}
