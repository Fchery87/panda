import { create } from 'zustand'

import type { WorkspaceOpenTab } from '@/contexts/WorkspaceContext'

export interface EditorSelection {
  filePath: string
  startLine: number
  endLine: number
  text?: string
}

export interface EditorCursor {
  line: number
  column: number
}

export interface EditorFileLocation {
  line: number
  column: number
  nonce: number
}

export interface EditorContextState {
  selectedFilePath: string | null
  selectedFileLocation: EditorFileLocation | null
  openTabs: WorkspaceOpenTab[]
  cursorPosition: EditorCursor | null
  selection: EditorSelection | null

  setSelectedFilePath: (path: string | null) => void
  setSelectedFileLocation: (location: EditorFileLocation | null) => void
  setOpenTabs: (
    tabs: WorkspaceOpenTab[] | ((prev: WorkspaceOpenTab[]) => WorkspaceOpenTab[])
  ) => void
  setCursorPosition: (position: EditorCursor | null) => void
  setSelection: (selection: EditorSelection | null) => void

  openTab: (tab: WorkspaceOpenTab) => void
  closeTab: (path: string) => void

  reset: () => void
}

const DEFAULTS = {
  selectedFilePath: null,
  selectedFileLocation: null,
  openTabs: [] as WorkspaceOpenTab[],
  cursorPosition: null,
  selection: null,
}

export const useEditorContextStore = create<EditorContextState>((set) => ({
  ...DEFAULTS,

  setSelectedFilePath: (path) =>
    set((state) => ({
      selectedFilePath: path,
      selection: path === null ? null : state.selection,
    })),
  setSelectedFileLocation: (location) => set({ selectedFileLocation: location }),
  setOpenTabs: (tabs) =>
    set((state) => {
      const nextOpenTabs = typeof tabs === 'function' ? tabs(state.openTabs) : tabs
      if (nextOpenTabs === state.openTabs) {
        return state
      }

      return { openTabs: nextOpenTabs }
    }),
  setCursorPosition: (position) => set({ cursorPosition: position }),
  setSelection: (selection) => set({ selection }),

  openTab: (tab) =>
    set((state) => {
      const exists = state.openTabs.some((openTab) => openTab.path === tab.path)

      return {
        openTabs: exists ? state.openTabs : [...state.openTabs, tab],
        selectedFilePath: tab.path,
      }
    }),

  closeTab: (path) =>
    set((state) => {
      const index = state.openTabs.findIndex((tab) => tab.path === path)
      if (index === -1) {
        return state
      }

      const openTabs = state.openTabs.filter((tab) => tab.path !== path)
      const wasActive = state.selectedFilePath === path
      const selectedFilePath = wasActive
        ? (openTabs[index - 1]?.path ?? openTabs[0]?.path ?? null)
        : state.selectedFilePath

      return { openTabs, selectedFilePath }
    }),

  reset: () => set(DEFAULTS),
}))
