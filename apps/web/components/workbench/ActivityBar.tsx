'use client'

import { useState, useEffect } from 'react'
import { FolderTree, Search, ScrollText, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import Link from 'next/link'

export type SidebarTab = 'explorer' | 'search' | 'specs'

interface ActivityBarProps {
  activeTab: SidebarTab
  isExpanded: boolean
  onTabChange: (tab: SidebarTab) => void
  onToggleExpand: () => void
  projectId?: string
}

const STORAGE_KEY = 'panda:sidebar-collapsed'

export function ActivityBar({
  activeTab,
  isExpanded,
  onTabChange,
  onToggleExpand,
  projectId,
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

  const tabs: { id: SidebarTab; icon: typeof FolderTree; label: string; shortcut?: string }[] = [
    { id: 'explorer', icon: FolderTree, label: 'Explorer', shortcut: 'Ctrl+Shift+E' },
    { id: 'search', icon: Search, label: 'Search', shortcut: 'Ctrl+Shift+F' },
    { id: 'specs', icon: ScrollText, label: 'Specs', shortcut: 'Ctrl+Shift+S' },
  ]

  return (
    <TooltipProvider delayDuration={300}>
      <div className="surface-1 flex h-full w-12 flex-col border-r border-border">
        {/* Top section - Tab buttons */}
        <div className="flex flex-col">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = tab.id === activeTab

            return (
              <Tooltip key={tab.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => handleTabClick(tab.id)}
                    className={cn(
                      'relative flex h-12 w-12 items-center justify-center transition-colors',
                      isActive
                        ? 'bg-surface-2 text-foreground'
                        : 'hover:bg-surface-2 text-muted-foreground hover:text-foreground'
                    )}
                    aria-label={tab.label}
                    aria-pressed={isActive}
                  >
                    {isActive && <div className="absolute left-0 top-0 h-full w-0.5 bg-primary" />}
                    <Icon className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-mono text-xs">
                  {tab.label}
                  {tab.shortcut && (
                    <span className="ml-2 text-muted-foreground">({tab.shortcut})</span>
                  )}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom section - Settings */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href={projectId ? `/projects/${projectId}/settings` : '/settings'}
              className="hover:bg-surface-2 flex h-12 w-12 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Settings"
            >
              <Settings className="h-5 w-5" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-mono text-xs">
            Settings
            <span className="ml-2 text-muted-foreground">(Ctrl+,)</span>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
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
