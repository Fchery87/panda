'use client'

import { useEffect, useState } from 'react'
import { useLayoutPersistence } from './useLayoutPersistence'

type MobilePrimaryPanel = 'workspace' | 'chat' | 'review'
type ChatInspectorTab = 'run' | 'plan' | 'artifacts' | 'memory' | 'evals'

export function useProjectWorkspaceUi() {
  const [isArtifactPanelOpen, setIsArtifactPanelOpen] = useState(false)
  const { isChatPanelOpen, setIsChatPanelOpen } = useLayoutPersistence()
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null)
  const [selectedFileLocation, setSelectedFileLocation] = useState<{
    line: number
    column: number
    nonce: number
  } | null>(null)
  const [openTabs, setOpenTabs] = useState<Array<{ path: string; isDirty?: boolean }>>([])
  const [cursorPosition, setCursorPosition] = useState<{ line: number; column: number } | null>(
    null
  )
  const [isMobileLayout, setIsMobileLayout] = useState(false)
  const [isCompactDesktopLayout, setIsCompactDesktopLayout] = useState(false)
  const [mobilePrimaryPanel, setMobilePrimaryPanel] = useState<MobilePrimaryPanel>('workspace')
  const [mobileUnreadCount, setMobileUnreadCount] = useState(0)
  const [isMobileKeyboardOpen, setIsMobileKeyboardOpen] = useState(false)
  const [isChatInspectorOpen, setIsChatInspectorOpen] = useState(false)
  const [chatInspectorTab, setChatInspectorTab] = useState<ChatInspectorTab>('run')
  const [isSpecDrawerOpen, setIsSpecDrawerOpen] = useState(false)
  const [isSpecPanelOpen, setIsSpecPanelOpen] = useState(false)
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)

  useEffect(() => {
    const mobileMedia = window.matchMedia('(max-width: 1023px)')
    const compactDesktopMedia = window.matchMedia('(min-width: 1024px) and (max-width: 1279px)')
    const update = () => {
      setIsMobileLayout(mobileMedia.matches)
      setIsCompactDesktopLayout(compactDesktopMedia.matches)
    }
    update()
    mobileMedia.addEventListener('change', update)
    compactDesktopMedia.addEventListener('change', update)
    return () => {
      mobileMedia.removeEventListener('change', update)
      compactDesktopMedia.removeEventListener('change', update)
    }
  }, [])
  // Keyboard shortcuts moved to the shared shortcut registry.
  // Terminal toggle: Ctrl+` -> shortcut registry.
  // Sidebar toggle: Ctrl+B -> useSidebar.

  return {
    isArtifactPanelOpen,
    setIsArtifactPanelOpen,
    isChatPanelOpen,
    setIsChatPanelOpen,
    selectedFilePath,
    setSelectedFilePath,
    selectedFileLocation,
    setSelectedFileLocation,
    openTabs,
    setOpenTabs,
    cursorPosition,
    setCursorPosition,
    isMobileLayout,
    isCompactDesktopLayout,
    mobilePrimaryPanel,
    setMobilePrimaryPanel,
    mobileUnreadCount,
    setMobileUnreadCount,
    isMobileKeyboardOpen,
    setIsMobileKeyboardOpen,
    isChatInspectorOpen,
    setIsChatInspectorOpen,
    chatInspectorTab,
    setChatInspectorTab,
    isSpecDrawerOpen,
    setIsSpecDrawerOpen,
    isSpecPanelOpen,
    setIsSpecPanelOpen,
    isShareDialogOpen,
    setIsShareDialogOpen,
  }
}
