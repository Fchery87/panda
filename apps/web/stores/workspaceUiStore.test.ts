import { describe, expect, test } from 'bun:test'

import { useWorkspaceUiStore } from './workspaceUiStore'

describe('workspaceUiStore', () => {
  const resetStore = () => {
    useWorkspaceUiStore.getState().reset()
  }

  test('opens and closes the right panel', () => {
    resetStore()
    const state = useWorkspaceUiStore.getState()

    expect(state.isRightPanelOpen).toBe(false)
    state.setRightPanelOpen(true)

    expect(useWorkspaceUiStore.getState().isRightPanelOpen).toBe(true)
  })

  test('right panel tab change implicitly opens the panel', () => {
    resetStore()
    const state = useWorkspaceUiStore.getState()

    state.openRightPanelTab('context')

    const next = useWorkspaceUiStore.getState()
    expect(next.isRightPanelOpen).toBe(true)
    expect(next.rightPanelTab).toBe('context')
  })

  test('bottom dock toggle is independent of right panel', () => {
    resetStore()
    const state = useWorkspaceUiStore.getState()

    state.setBottomDockOpen(true)

    expect(useWorkspaceUiStore.getState().isBottomDockOpen).toBe(true)
    expect(useWorkspaceUiStore.getState().isRightPanelOpen).toBe(false)
  })

  test('reset returns all state to defaults', () => {
    resetStore()
    const state = useWorkspaceUiStore.getState()

    state.setRightPanelOpen(true)
    state.setBottomDockOpen(true)
    state.setActiveCenterTab('diff')
    state.reset()

    const resetState = useWorkspaceUiStore.getState()
    expect(resetState.isRightPanelOpen).toBe(false)
    expect(resetState.isBottomDockOpen).toBe(false)
    expect(resetState.activeCenterTab).toBe('editor')
  })

  test('defaults mobile workspace to chat-first', () => {
    resetStore()

    expect(useWorkspaceUiStore.getState().mobilePrimaryPanel).toBe('chat')
  })
})
