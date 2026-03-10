'use client'

import { useState, useEffect } from 'react'
import { FolderTree, Search, ScrollText } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SidebarTab = 'explorer' | 'search' | 'specs'

interface ActivityBarProps {
  activeTab: SidebarTab
  isExpanded: boolean
  onTabChange: (tab: SidebarTab) => void
  onToggleExpand: () => void
}

const STORAGE_KEY = 'panda:sidebar-collapsed'

export function ActivityBar({
  activeTab,
  isExpanded,
  onTabChange,
  onToggleExpand,
}: ActivityBarProps) {
  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) {
      const isCollapsed = stored === 'true'
      // If stored state differs from current, trigger toggle
      if (isCollapsed === isExpanded) {
        onToggleExpand()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Save collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(!isExpanded))
  }, [isExpanded])

  const handleTabClick = (tab: SidebarTab) => {
    if (tab === activeTab) {
      // Clicking active tab toggles expansion
      onToggleExpand()
    } else {
      // Clicking inactive tab switches and ensures expanded
      onTabChange(tab)
      if (!isExpanded) {
        onToggleExpand()
      }
    }
  }

  const tabs: { id: SidebarTab; icon: typeof FolderTree; label: string }[] = [
    { id: 'explorer', icon: FolderTree, label: 'Explorer' },
    { id: 'search', icon: Search, label: 'Search' },
    { id: 'specs', icon: ScrollText, label: 'Specs' },
  ]

  return (
    <div className="surface-1 flex h-full w-12 flex-col border-r border-border">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = tab.id === activeTab

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabClick(tab.id)}
            className={cn(
              'relative flex h-12 w-12 items-center justify-center transition-colors',
              isActive
                ? 'bg-surface-2 text-foreground'
                : 'hover:bg-surface-2 text-muted-foreground hover:text-foreground'
            )}
            title={tab.label}
            aria-label={tab.label}
            aria-pressed={isActive}
          >
            {isActive && <div className="absolute left-0 top-0 h-full w-0.5 bg-primary" />}
            <Icon className="h-5 w-5" />
          </button>
        )
      })}
    </div>
  )
}

export function useActivityBarState() {
  const [activeTab, setActiveTab] = useState<SidebarTab>('explorer')
  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window === 'undefined') return true
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored !== 'true' // Default to expanded if not set
  })

  const handleTabChange = (tab: SidebarTab) => {
    setActiveTab(tab)
  }

  const handleToggleExpand = () => {
    setIsExpanded((prev) => !prev)
  }

  return {
    activeTab,
    isExpanded,
    handleTabChange,
    handleToggleExpand,
  }
}
