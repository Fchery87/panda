'use client'

import { useState, useEffect } from 'react'
import type { SidebarSection } from '@/components/sidebar/SidebarRail'

const SECTION_KEY = 'panda:sidebar-section'
const FLYOUT_KEY = 'panda:sidebar-flyout-open'

export function useSidebar() {
  const [activeSection, setActiveSection] = useState<SidebarSection>(() => {
    if (typeof window === 'undefined') return 'explorer'
    const stored = localStorage.getItem(SECTION_KEY)
    return (stored as SidebarSection) ?? 'explorer'
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

  // Ctrl+B / Cmd+B keyboard shortcut to toggle flyout
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        setIsFlyoutOpen((prev) => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

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
