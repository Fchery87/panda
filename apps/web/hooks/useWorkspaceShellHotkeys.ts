'use client'

import { useHotkeys } from 'react-hotkeys-hook'

import { useWorkspaceUiStore } from '@/stores/workspaceUiStore'

export function useWorkspaceShellHotkeys() {
  useHotkeys(
    'mod+i',
    (event) => {
      event.preventDefault()
      const state = useWorkspaceUiStore.getState()
      state.setComposerOpen(!state.isComposerOpen)
    },
    { enableOnFormTags: ['INPUT', 'TEXTAREA'] }
  )

  useHotkeys(
    'mod+/',
    (event) => {
      event.preventDefault()
      const state = useWorkspaceUiStore.getState()
      state.setShortcutHelpOpen(!state.isShortcutHelpOpen)
    },
    { enableOnFormTags: ['INPUT', 'TEXTAREA'] }
  )
}
