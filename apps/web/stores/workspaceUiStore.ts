import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { BottomDockTab } from '@/components/layout/BottomDock'

export type RightPanelTab = 'proof' | 'changes' | 'context'
export type CenterTab = 'editor' | 'diff' | 'logs' | 'tests'
export type MobilePrimaryPanel = 'work' | 'chat' | 'changes' | 'proof'
export type WorkspaceFocusMode = 'chat' | 'workbench' | 'proof' | 'changes'
export type ChatDockSide = 'right' | 'left'
export type InspectorRailEvent =
  | 'pending-changes'
  | 'run-failed'
  | 'permission-blocked'
  | 'validation-failed'
  | 'plan-review'

export type ChatInspectorTab =
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

export interface WorkspaceUiState {
  isMobileLayout: boolean
  isCompactDesktopLayout: boolean
  setLayoutBreakpoints: (breakpoints: {
    isMobileLayout: boolean
    isCompactDesktopLayout: boolean
  }) => void

  isRightPanelOpen: boolean
  rightPanelTab: RightPanelTab
  setRightPanelOpen: (open: boolean) => void
  setRightPanelTab: (tab: RightPanelTab) => void
  openRightPanelTab: (tab: RightPanelTab) => void
  openInspectorForEvent: (event: InspectorRailEvent) => void

  isBottomDockOpen: boolean
  activeBottomDockTab: BottomDockTab
  setBottomDockOpen: (open: boolean) => void
  setActiveBottomDockTab: (tab: BottomDockTab) => void

  activeCenterTab: CenterTab
  setActiveCenterTab: (tab: CenterTab) => void

  workspaceFocusMode: WorkspaceFocusMode
  setWorkspaceFocusMode: (mode: WorkspaceFocusMode) => void
  isChatDockOpen: boolean
  chatDockSide: ChatDockSide
  setChatDockOpen: (open: boolean) => void
  setChatDockSide: (side: ChatDockSide) => void

  mobilePrimaryPanel: MobilePrimaryPanel
  setMobilePrimaryPanel: (panel: MobilePrimaryPanel) => void
  mobileUnreadCount: number
  setMobileUnreadCount: (count: number) => void
  isMobileKeyboardOpen: boolean
  setIsMobileKeyboardOpen: (open: boolean) => void

  isChatInspectorOpen: boolean
  chatInspectorTab: ChatInspectorTab
  setChatInspectorOpen: (open: boolean) => void
  setChatInspectorTab: (tab: ChatInspectorTab) => void

  specSurfaceMode: 'closed' | 'inspect'
  setSpecSurfaceMode: (mode: 'closed' | 'inspect') => void

  isShareDialogOpen: boolean
  setShareDialogOpen: (open: boolean) => void
  taskHeaderVisible: boolean
  setTaskHeaderVisible: (visible: boolean) => void
  isComposerOpen: boolean
  setComposerOpen: (open: boolean) => void
  isShortcutHelpOpen: boolean
  setShortcutHelpOpen: (open: boolean) => void

  isPlanningPopupOpen: boolean
  planningSessionId: string | null
  openPlanningPopup: (sessionId?: string) => void
  closePlanningPopup: () => void

  reset: () => void
}

const DEFAULTS = {
  isMobileLayout: false,
  isCompactDesktopLayout: false,
  isRightPanelOpen: false,
  rightPanelTab: 'proof' as RightPanelTab,
  isBottomDockOpen: false,
  activeBottomDockTab: 'terminal' as BottomDockTab,
  activeCenterTab: 'editor' as CenterTab,
  workspaceFocusMode: 'workbench' as WorkspaceFocusMode,
  isChatDockOpen: true,
  chatDockSide: 'right' as ChatDockSide,
  mobilePrimaryPanel: 'chat' as MobilePrimaryPanel,
  mobileUnreadCount: 0,
  isMobileKeyboardOpen: false,
  isChatInspectorOpen: false,
  chatInspectorTab: 'run' as ChatInspectorTab,
  specSurfaceMode: 'closed' as const,
  isShareDialogOpen: false,
  taskHeaderVisible: false,
  isComposerOpen: false,
  isShortcutHelpOpen: false,
  isPlanningPopupOpen: false,
  planningSessionId: null,
}

export const useWorkspaceUiStore = create<WorkspaceUiState>()(
  persist(
    (set) => ({
      ...DEFAULTS,

      setLayoutBreakpoints: (breakpoints) => set(breakpoints),

      setRightPanelOpen: (open) => set({ isRightPanelOpen: open }),
      setRightPanelTab: (tab) => set({ rightPanelTab: tab }),
      openRightPanelTab: (tab) => set({ rightPanelTab: tab, isRightPanelOpen: true }),
      openInspectorForEvent: (event) =>
        set({
          isRightPanelOpen: true,
          rightPanelTab:
            event === 'pending-changes' ? 'changes' : event === 'plan-review' ? 'context' : 'proof',
        }),

      setBottomDockOpen: (open) => set({ isBottomDockOpen: open }),
      setActiveBottomDockTab: (tab) => set({ activeBottomDockTab: tab }),

      setActiveCenterTab: (tab) => set({ activeCenterTab: tab }),

      setWorkspaceFocusMode: (mode) => set({ workspaceFocusMode: mode }),
      setChatDockOpen: (open) => set({ isChatDockOpen: open }),
      setChatDockSide: (side) => set({ chatDockSide: side }),

      setMobilePrimaryPanel: (panel) => set({ mobilePrimaryPanel: panel }),
      setMobileUnreadCount: (count) => set({ mobileUnreadCount: count }),
      setIsMobileKeyboardOpen: (open) => set({ isMobileKeyboardOpen: open }),

      setChatInspectorOpen: (open) => set({ isChatInspectorOpen: open }),
      setChatInspectorTab: (tab) => set({ chatInspectorTab: tab }),

      setSpecSurfaceMode: (mode) => set({ specSurfaceMode: mode }),

      setShareDialogOpen: (open) => set({ isShareDialogOpen: open }),
      setTaskHeaderVisible: (visible) => set({ taskHeaderVisible: visible }),
      setComposerOpen: (open) => set({ isComposerOpen: open }),
      setShortcutHelpOpen: (open) => set({ isShortcutHelpOpen: open }),

      openPlanningPopup: (sessionId) =>
        set((state) => ({
          isPlanningPopupOpen: true,
          planningSessionId:
            sessionId ?? state.planningSessionId ?? `planning_${Date.now().toString(36)}`,
        })),
      closePlanningPopup: () => set({ isPlanningPopupOpen: false, planningSessionId: null }),

      reset: () => set(DEFAULTS),
    }),
    {
      name: 'panda:workspaceUi',
      version: 6,
      migrate: (persistedState) => {
        if (!persistedState || typeof persistedState !== 'object') return persistedState
        const state = persistedState as Record<string, unknown>
        const tab = state.rightPanelTab
        const rightPanelTab =
          tab === 'run' || tab === 'chat' || tab === 'work' || tab === 'preview' ? 'proof' : tab
        const mobilePanel = state.mobilePrimaryPanel
        const mobilePrimaryPanel =
          mobilePanel === 'workspace'
            ? 'work'
            : mobilePanel === 'review' || mobilePanel === 'preview'
              ? 'proof'
              : mobilePanel
        const priorFocusMode = state.workspaceFocusMode
        return {
          ...state,
          rightPanelTab,
          mobilePrimaryPanel,
          workspaceFocusMode:
            priorFocusMode === 'chat'
              ? DEFAULTS.workspaceFocusMode
              : (priorFocusMode ?? DEFAULTS.workspaceFocusMode),
          isChatDockOpen: typeof state.isChatDockOpen === 'boolean' ? state.isChatDockOpen : true,
          chatDockSide: state.chatDockSide === 'left' ? 'left' : DEFAULTS.chatDockSide,
        }
      },
      partialize: (state) => ({
        isRightPanelOpen: state.isRightPanelOpen,
        rightPanelTab: state.rightPanelTab,
        isBottomDockOpen: state.isBottomDockOpen,
        activeBottomDockTab: state.activeBottomDockTab,
        workspaceFocusMode: state.workspaceFocusMode,
        isChatDockOpen: state.isChatDockOpen,
        chatDockSide: state.chatDockSide,
      }),
    }
  )
)
