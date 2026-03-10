'use client'

import { useState, useEffect, useCallback } from 'react'

type SidebarTab = 'explorer' | 'search' | 'specs'

interface LayoutState {
  isChatPanelOpen: boolean
  activeSidebarTab: SidebarTab
  isTerminalExpanded: boolean
}

const STORAGE_KEY = 'panda:layout-state'

const defaultState: LayoutState = {
  isChatPanelOpen: true,
  activeSidebarTab: 'explorer',
  isTerminalExpanded: false,
}

export function useLayoutPersistence() {
  // Initialize state from localStorage
  const [state, setState] = useState<LayoutState>(() => {
    if (typeof window === 'undefined') return defaultState
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        return { ...defaultState, ...JSON.parse(stored) }
      }
    } catch {
      // Ignore parse errors
    }
    return defaultState
  })

  // Persist state to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const setIsChatPanelOpen = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    setState((prev) => ({
      ...prev,
      isChatPanelOpen: typeof value === 'function' ? value(prev.isChatPanelOpen) : value,
    }))
  }, [])

  const setActiveSidebarTab = useCallback((tab: SidebarTab) => {
    setState((prev) => ({
      ...prev,
      activeSidebarTab: tab,
    }))
  }, [])

  const setIsTerminalExpanded = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    setState((prev) => ({
      ...prev,
      isTerminalExpanded: typeof value === 'function' ? value(prev.isTerminalExpanded) : value,
    }))
  }, [])

  return {
    isChatPanelOpen: state.isChatPanelOpen,
    setIsChatPanelOpen,
    activeSidebarTab: state.activeSidebarTab,
    setActiveSidebarTab,
    isTerminalExpanded: state.isTerminalExpanded,
    setIsTerminalExpanded,
  }
}
