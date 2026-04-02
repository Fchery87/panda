'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { useLayoutPersistence } from './useLayoutPersistence'
import type { WorkspaceOpenTab } from '@/contexts/WorkspaceContext'

type MobilePrimaryPanel = 'workspace' | 'chat' | 'review'
type ChatInspectorTab = 'run' | 'plan' | 'artifacts' | 'memory' | 'evals'

type PlanningPopupState = {
  isPlanningPopupOpen: boolean
  planningSessionId: string | null
}

export function createPlanningPopupState(): PlanningPopupState {
  return {
    isPlanningPopupOpen: false,
    planningSessionId: null,
  }
}

export function openPlanningPopupState(
  currentState: PlanningPopupState,
  planningSessionId?: string
): PlanningPopupState {
  return {
    isPlanningPopupOpen: true,
    planningSessionId:
      planningSessionId ?? currentState.planningSessionId ?? `planning_${Date.now().toString(36)}`,
  }
}

export function closePlanningPopupState(_currentState: PlanningPopupState): PlanningPopupState {
  return {
    isPlanningPopupOpen: false,
    planningSessionId: null,
  }
}

let sharedPlanningPopupState: PlanningPopupState = {
  isPlanningPopupOpen: false,
  planningSessionId: null,
}

const sharedPlanningPopupListeners = new Set<() => void>()

function subscribePlanningPopup(listener: () => void) {
  sharedPlanningPopupListeners.add(listener)
  return () => sharedPlanningPopupListeners.delete(listener)
}

function emitPlanningPopupChange() {
  for (const listener of sharedPlanningPopupListeners) {
    listener()
  }
}

function setSharedPlanningPopupState(
  nextState: PlanningPopupState | ((currentState: PlanningPopupState) => PlanningPopupState)
) {
  sharedPlanningPopupState =
    typeof nextState === 'function' ? nextState(sharedPlanningPopupState) : nextState
  emitPlanningPopupChange()
}

export function openPlanningPopup(planningSessionId?: string) {
  setSharedPlanningPopupState((currentState) =>
    openPlanningPopupState(currentState, planningSessionId)
  )
}

export function closePlanningPopup() {
  setSharedPlanningPopupState((currentState) => closePlanningPopupState(currentState))
}

export function useProjectWorkspaceUi() {
  const [isArtifactPanelOpen, setIsArtifactPanelOpen] = useState(false)
  const { isChatPanelOpen, setIsChatPanelOpen } = useLayoutPersistence()
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null)
  const [selectedFileLocation, setSelectedFileLocation] = useState<{
    line: number
    column: number
    nonce: number
  } | null>(null)
  const [openTabs, setOpenTabs] = useState<WorkspaceOpenTab[]>([])
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
  const planningPopupState = useSyncExternalStore(
    subscribePlanningPopup,
    () => sharedPlanningPopupState,
    () => sharedPlanningPopupState
  )

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
    isPlanningPopupOpen: planningPopupState.isPlanningPopupOpen,
    planningSessionId: planningPopupState.planningSessionId,
    setIsPlanningPopupOpen: (isPlanningPopupOpen: boolean) => {
      if (isPlanningPopupOpen) {
        openPlanningPopup(planningPopupState.planningSessionId ?? undefined)
        return
      }

      closePlanningPopup()
    },
    setPlanningSessionId: (planningSessionId: string | null) => {
      setSharedPlanningPopupState((currentState) => ({
        ...currentState,
        planningSessionId,
      }))
    },
  }
}
