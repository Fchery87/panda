'use client'

import { useCallback, useEffect, useState } from 'react'

type MobilePrimaryPanel = 'workspace' | 'chat' | 'review'

export function useMobileLayout() {
  const [isMobileLayout, setIsMobileLayout] = useState(false)
  const [isCompactDesktopLayout, setIsCompactDesktopLayout] = useState(false)
  const [mobilePrimaryPanel, setMobilePrimaryPanel] = useState<MobilePrimaryPanel>('chat')
  const [mobileUnreadCount, setMobileUnreadCount] = useState(0)
  const [isMobileKeyboardOpen, setIsMobileKeyboardOpen] = useState(false)

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

  const resetUnreadCount = useCallback(() => {
    setMobileUnreadCount(0)
  }, [])

  return {
    isMobileLayout,
    isCompactDesktopLayout,
    mobilePrimaryPanel,
    setMobilePrimaryPanel,
    mobileUnreadCount,
    setMobileUnreadCount,
    resetUnreadCount,
    isMobileKeyboardOpen,
    setIsMobileKeyboardOpen,
  }
}
