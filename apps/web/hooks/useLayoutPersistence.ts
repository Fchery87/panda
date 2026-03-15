'use client'

import { useState, useEffect, useCallback } from 'react'

interface LayoutState {
  isChatPanelOpen: boolean
}

const STORAGE_KEY = 'panda:layout-state'

const defaultState: LayoutState = {
  isChatPanelOpen: true,
}

export function useLayoutPersistence() {
  const [state, setState] = useState<LayoutState>(() => {
    if (typeof window === 'undefined') return defaultState
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        return {
          isChatPanelOpen: parsed.isChatPanelOpen ?? defaultState.isChatPanelOpen,
        }
      }
    } catch {
      // Ignore parse errors.
    }
    return defaultState
  })

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

  return {
    isChatPanelOpen: state.isChatPanelOpen,
    setIsChatPanelOpen,
  }
}
