'use client'

import { useEffect, useState } from 'react'
import { useLayoutPersistence } from './useLayoutPersistence'

type MobilePrimaryPanel = 'workspace' | 'chat'
type ChatInspectorTab = 'run' | 'plan' | 'memory' | 'evals'

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        setIsChatPanelOpen((prev) => !prev)
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'a') {
        e.preventDefault()
        setIsArtifactPanelOpen((prev) => !prev)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '`') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('panda:toggle-terminal'))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setIsChatPanelOpen])

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
