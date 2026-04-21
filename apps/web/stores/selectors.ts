import { useChatSessionStore } from './chatSessionStore'
import { useEditorContextStore } from './editorContextStore'
import { useWorkspaceUiStore } from './workspaceUiStore'

export const useActiveFilePath = () => useEditorContextStore((state) => state.selectedFilePath)
export const useOpenTabs = () => useEditorContextStore((state) => state.openTabs)
export const useEditorSelection = () => useEditorContextStore((state) => state.selection)
export const useChatMode = () => useChatSessionStore((state) => state.chatMode)
export const useActiveChatId = () => useChatSessionStore((state) => state.activeChatId)
export const useOversightLevel = () => useChatSessionStore((state) => state.oversightLevel)
export const useRightPanelOpen = () => useWorkspaceUiStore((state) => state.isRightPanelOpen)
export const useRightPanelTab = () => useWorkspaceUiStore((state) => state.rightPanelTab)
export const useIsMobileLayout = () => useWorkspaceUiStore((state) => state.isMobileLayout)
export const useIsCompactDesktopLayout = () =>
  useWorkspaceUiStore((state) => state.isCompactDesktopLayout)
