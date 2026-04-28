'use client'

import { useCallback, useEffect } from 'react'

type RightPanelTab = 'chat' | 'run' | 'changes' | 'context' | 'preview'
type MobilePrimaryPanel = 'workspace' | 'chat' | 'review'

interface UseWorkbenchPanelStateArgs {
  isMobileLayout: boolean
  setRightPanelTab: React.Dispatch<React.SetStateAction<RightPanelTab>>
  setIsRightPanelOpen: React.Dispatch<React.SetStateAction<boolean>>
  setMobilePrimaryPanel: React.Dispatch<React.SetStateAction<MobilePrimaryPanel>>
  setIsMobileKeyboardOpen: React.Dispatch<React.SetStateAction<boolean>>
}

interface UseWorkbenchPanelStateReturn {
  openRightPanelTab: (tab: RightPanelTab) => void
}

export function useWorkbenchPanelState({
  isMobileLayout,
  setRightPanelTab,
  setIsRightPanelOpen,
  setMobilePrimaryPanel,
  setIsMobileKeyboardOpen,
}: UseWorkbenchPanelStateArgs): UseWorkbenchPanelStateReturn {
  const openRightPanelTab = useCallback(
    (tab: RightPanelTab) => {
      setRightPanelTab(tab)
      if (isMobileLayout) {
        setMobilePrimaryPanel('review')
        return
      }
      setIsRightPanelOpen(true)
    },
    [isMobileLayout, setIsRightPanelOpen, setMobilePrimaryPanel, setRightPanelTab]
  )

  useEffect(() => {
    if (!isMobileLayout) {
      setIsMobileKeyboardOpen(false)
      return
    }

    let focusedInput = false
    let viewportKeyboardOpen = false

    const commitState = () => setIsMobileKeyboardOpen(focusedInput || viewportKeyboardOpen)

    const isTextInputTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false
      if (target.isContentEditable) return true
      return Boolean(target.closest('input, textarea, [contenteditable="true"]'))
    }

    const onFocusIn = (event: FocusEvent) => {
      focusedInput = isTextInputTarget(event.target)
      commitState()
    }

    const onFocusOut = () => {
      window.setTimeout(() => {
        focusedInput = isTextInputTarget(document.activeElement)
        commitState()
      }, 0)
    }

    const onViewportChange = () => {
      if (!window.visualViewport) return
      const heightDelta = window.innerHeight - window.visualViewport.height
      viewportKeyboardOpen = heightDelta > 140
      commitState()
    }

    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    window.visualViewport?.addEventListener('resize', onViewportChange)
    window.visualViewport?.addEventListener('scroll', onViewportChange)
    onViewportChange()
    commitState()

    return () => {
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
      window.visualViewport?.removeEventListener('resize', onViewportChange)
      window.visualViewport?.removeEventListener('scroll', onViewportChange)
    }
  }, [isMobileLayout, setIsMobileKeyboardOpen])

  return { openRightPanelTab }
}
