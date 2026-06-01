'use client'

import { useCallback, type SetStateAction } from 'react'

import {
  useWorkspaceUiStore,
  type MobilePrimaryPanel,
  type RightPanelTab,
} from '@/stores/workspaceUiStore'

export function useProjectShellUiState() {
  const {
    isMobileLayout,
    isCompactDesktopLayout,
    mobilePrimaryPanel,
    setMobilePrimaryPanel,
    mobileUnreadCount,
    setMobileUnreadCount,
    isMobileKeyboardOpen,
    setIsMobileKeyboardOpen,
    setSpecSurfaceMode,
    isShareDialogOpen,
    setShareDialogOpen,
    isComposerOpen,
    setComposerOpen,
    isShortcutHelpOpen,
    setShortcutHelpOpen,
    isBottomDockOpen,
    setBottomDockOpen,
    activeBottomDockTab,
    setActiveBottomDockTab,
    activeCenterTab,
    setActiveCenterTab,
    isRightPanelOpen,
    setRightPanelOpen,
    setRightPanelTab,
    setWorkspaceFocusMode,
  } = useWorkspaceUiStore()

  const setRightPanelTabFromAction = useCallback(
    (tab: SetStateAction<RightPanelTab>) => {
      const current = useWorkspaceUiStore.getState().rightPanelTab
      const next = typeof tab === 'function' ? tab(current) : tab
      if (next !== current) setRightPanelTab(next)
    },
    [setRightPanelTab]
  )
  const setRightPanelOpenFromAction = useCallback(
    (open: SetStateAction<boolean>) => {
      const current = useWorkspaceUiStore.getState().isRightPanelOpen
      const next = typeof open === 'function' ? open(current) : open
      if (next !== current) setRightPanelOpen(next)
    },
    [setRightPanelOpen]
  )
  const setBottomDockOpenFromAction = useCallback(
    (open: SetStateAction<boolean>) => {
      const current = useWorkspaceUiStore.getState().isBottomDockOpen
      const next = typeof open === 'function' ? open(current) : open
      if (next !== current) setBottomDockOpen(next)
    },
    [setBottomDockOpen]
  )
  const setMobilePrimaryPanelFromAction = useCallback(
    (panel: SetStateAction<MobilePrimaryPanel>) => {
      const current = useWorkspaceUiStore.getState().mobilePrimaryPanel
      const next = typeof panel === 'function' ? panel(current) : panel
      if (next !== current) setMobilePrimaryPanel(next)
    },
    [setMobilePrimaryPanel]
  )
  const setMobileKeyboardOpenFromAction = useCallback(
    (open: SetStateAction<boolean>) => {
      const current = useWorkspaceUiStore.getState().isMobileKeyboardOpen
      const next = typeof open === 'function' ? open(current) : open
      if (next !== current) setIsMobileKeyboardOpen(next)
    },
    [setIsMobileKeyboardOpen]
  )
  const setMobileUnreadCountFromAction = useCallback(
    (count: SetStateAction<number>) => {
      const current = useWorkspaceUiStore.getState().mobileUnreadCount
      const next = typeof count === 'function' ? count(current) : count
      if (next !== current) setMobileUnreadCount(next)
    },
    [setMobileUnreadCount]
  )

  return {
    isMobileLayout,
    isCompactDesktopLayout,
    mobilePrimaryPanel,
    setMobilePrimaryPanel,
    mobileUnreadCount,
    setMobileUnreadCount,
    isMobileKeyboardOpen,
    setIsMobileKeyboardOpen,
    setSpecSurfaceMode,
    isShareDialogOpen,
    setShareDialogOpen,
    isComposerOpen,
    setComposerOpen,
    isShortcutHelpOpen,
    setShortcutHelpOpen,
    isBottomDockOpen,
    setBottomDockOpen,
    activeBottomDockTab,
    setActiveBottomDockTab,
    activeCenterTab,
    setActiveCenterTab,
    isRightPanelOpen,
    setRightPanelOpen,
    setRightPanelTab,
    setRightPanelTabFromAction,
    setRightPanelOpenFromAction,
    setBottomDockOpenFromAction,
    setMobilePrimaryPanelFromAction,
    setMobileKeyboardOpenFromAction,
    setMobileUnreadCountFromAction,
    setWorkspaceFocusMode,
  }
}
