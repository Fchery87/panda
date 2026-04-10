'use client'

import { useEffect, useMemo, useState } from 'react'
import type { SidebarSection } from '@/components/sidebar/SidebarRail'
import { useShortcuts } from '@/hooks/useShortcuts'

const SECTION_KEY = 'panda:sidebar-section'
const FLYOUT_KEY = 'panda:sidebar-flyout-open'

export function useSidebar() {
  const [activeSection, setActiveSection] = useState<SidebarSection>(() => {
    if (typeof window === 'undefined') return 'files'
    const stored = localStorage.getItem(SECTION_KEY)
    // Migrate legacy values
    if (
      stored === 'explorer' ||
      stored === 'history' ||
      stored === 'specs' ||
      stored === 'terminal'
    ) {
      return 'files'
    }
    return (stored as SidebarSection) ?? 'files'
  })

  const [isFlyoutOpen, setIsFlyoutOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    const stored = localStorage.getItem(FLYOUT_KEY)
    return stored === 'true'
  })

  // Persist activeSection to localStorage
  useEffect(() => {
    localStorage.setItem(SECTION_KEY, activeSection)
  }, [activeSection])

  // Persist isFlyoutOpen to localStorage
  useEffect(() => {
    localStorage.setItem(FLYOUT_KEY, String(isFlyoutOpen))
  }, [isFlyoutOpen])

  const shortcuts = useMemo(
    () => [
      {
        id: 'toggle-sidebar',
        keys: 'mod+b',
        label: 'Toggle Sidebar',
        handler: () => setIsFlyoutOpen((prev) => !prev),
        category: 'Navigation',
      },
    ],
    []
  )

  useShortcuts(shortcuts)

  const handleSectionChange = (section: SidebarSection) => {
    if (section === activeSection && isFlyoutOpen) {
      setIsFlyoutOpen(false)
    } else {
      setActiveSection(section)
      setIsFlyoutOpen(true)
    }
  }

  const toggleFlyout = () => {
    setIsFlyoutOpen((prev) => !prev)
  }

  return {
    activeSection,
    isFlyoutOpen,
    handleSectionChange,
    toggleFlyout,
  }
}
