'use client'

import { useEffect } from 'react'

import { useWorkspaceUiStore } from './workspaceUiStore'

export function useResponsiveLayoutSync() {
  useEffect(() => {
    const mobileMedia = window.matchMedia('(max-width: 1023px)')
    const compactMedia = window.matchMedia('(min-width: 1024px) and (max-width: 1279px)')

    const update = () => {
      useWorkspaceUiStore.getState().setLayoutBreakpoints({
        isMobileLayout: mobileMedia.matches,
        isCompactDesktopLayout: compactMedia.matches,
      })
    }

    update()
    mobileMedia.addEventListener('change', update)
    compactMedia.addEventListener('change', update)

    return () => {
      mobileMedia.removeEventListener('change', update)
      compactMedia.removeEventListener('change', update)
    }
  }, [])
}
