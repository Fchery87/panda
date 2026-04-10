'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { useLayoutPersistence } from './useLayoutPersistence'
import type { WorkspaceOpenTab } from '@/contexts/WorkspaceContext'
import type { BottomDockTab } from '@/components/layout/BottomDock'

type MobilePrimaryPanel = 'workspace' | 'chat' | 'review'
type ChatInspectorTab =
  | 'run'
  | 'plan'
  | 'artifacts'
  | 'memory'
  | 'evals'
  | 'tasks'
  | 'qa'
  | 'state'
  | 'browser'
  | 'activity'
  | 'decisions'

type RightPanelTab = 'chat' | 'plan' | 'review' | 'inspect' | 'run' | 'comments'

type CenterTab = 'home' | 'editor' | 'diff' | 'preview' | 'logs' | 'tests'

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

const DOCK_OPEN_KEY = 'panda:dock-open'
const RIGHT_PANEL_OPEN_KEY = 'panda:right-panel-open'

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

  // New: Bottom dock state
  const [isBottomDockOpen, setIsBottomDockOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(DOCK_OPEN_KEY) === 'true'
  })
  const [activeBottomDockTab, setActiveBottomDockTab] = useState<BottomDockTab>('terminal')

  // New: Center tab state
  const [activeCenterTab, setActiveCenterTab] = useState<CenterTab>('home')

  // New: Right panel state (replaces isChatPanelOpen as primary right panel control)
  const [isRightPanelOpen, setIsRightPanelOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(RIGHT_PANEL_OPEN_KEY) === 'true'
  })
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('chat')

  // New: Task header visibility
  const [taskHeaderVisible, setTaskHeaderVisible] = useState(false)

  const planningPopupState = useSyncExternalStore(
    subscribePlanningPopup,
    () => sharedPlanningPopupState,
    () => sharedPlanningPopupState
  )

  // Persist dock state
  useEffect(() => {
    localStorage.setItem(DOCK_OPEN_KEY, String(isBottomDockOpen))
  }, [isBottomDockOpen])

  // Persist right panel state
  useEffect(() => {
    localStorage.setItem(RIGHT_PANEL_OPEN_KEY, String(isRightPanelOpen))
  }, [isRightPanelOpen])

  // Auto-switch center tab to editor when a file is selected
  useEffect(() => {
    if (selectedFilePath) {
      setActiveCenterTab('editor')
    }
  }, [selectedFilePath])

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

    // New state
    isBottomDockOpen,
    setIsBottomDockOpen,
    activeBottomDockTab,
    setActiveBottomDockTab,
    activeCenterTab,
    setActiveCenterTab,
    isRightPanelOpen,
    setIsRightPanelOpen,
    rightPanelTab,
    setRightPanelTab,
    taskHeaderVisible,
    setTaskHeaderVisible,

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
