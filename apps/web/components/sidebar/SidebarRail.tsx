'use client'

import type { ComponentType } from 'react'
import Link from 'next/link'
import {
  IconExplorer,
  IconSearch,
  IconHistory,
  IconSpecs,
  IconGit,
  IconTerminal,
  IconSettings,
  IconDocs,
} from '@/components/ui/icons'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export type SidebarSection = 'explorer' | 'search' | 'history' | 'specs' | 'git' | 'terminal'

interface SidebarRailProps {
  activeSection: SidebarSection
  isFlyoutOpen: boolean
  onSectionChange: (section: SidebarSection) => void
  onToggleFlyout: () => void
  projectId?: string
}

interface NavItem {
  id: SidebarSection
  icon: ComponentType<{ className?: string }>
  label: string
  shortcut: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'explorer', icon: IconExplorer, label: 'Explorer', shortcut: 'Ctrl+Shift+E' },
  { id: 'search', icon: IconSearch, label: 'Search', shortcut: 'Ctrl+Shift+F' },
  { id: 'history', icon: IconHistory, label: 'History', shortcut: 'Ctrl+Shift+H' },
  { id: 'specs', icon: IconSpecs, label: 'Specs', shortcut: 'Ctrl+Shift+S' },
  { id: 'git', icon: IconGit, label: 'Source Control', shortcut: 'Ctrl+Shift+G' },
  { id: 'terminal', icon: IconTerminal, label: 'Terminal', shortcut: 'Ctrl+`' },
]

export function SidebarRail({
  activeSection,
  isFlyoutOpen,
  onSectionChange,
  onToggleFlyout,
  projectId,
}: SidebarRailProps) {
  const handleItemClick = (section: SidebarSection) => {
    if (section === activeSection && isFlyoutOpen) {
      // Clicking the currently-active icon when flyout is open → close flyout
      onToggleFlyout()
    } else {
      // Clicking a different icon → change section
      onSectionChange(section)
      // If flyout is closed, open it
      if (!isFlyoutOpen) {
        onToggleFlyout()
      }
    }
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="surface-1 flex h-full w-12 flex-shrink-0 flex-col border-r border-border">
        {/* Top section - Navigation items */}
        <div className="flex flex-col">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = item.id === activeSection

            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => handleItemClick(item.id)}
                    className={cn(
                      'relative flex h-12 w-12 items-center justify-center transition-colors duration-150',
                      isActive
                        ? 'bg-surface-2 text-foreground'
                        : 'hover:bg-surface-2 text-muted-foreground hover:text-foreground'
                    )}
                    aria-label={item.label}
                    aria-pressed={isActive}
                  >
                    {isActive && <div className="absolute left-0 top-0 h-full w-0.5 bg-primary" />}
                    <Icon className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-mono text-xs">
                  {item.label}
                  {item.shortcut && (
                    <span className="ml-2 text-muted-foreground">({item.shortcut})</span>
                  )}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom section - Settings and Docs */}
        <div className="flex flex-col">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/settings"
                className="hover:bg-surface-2 flex h-12 w-12 items-center justify-center text-muted-foreground transition-colors duration-150 hover:text-foreground"
                aria-label="Settings"
              >
                <IconSettings className="h-5 w-5" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-mono text-xs">
              Settings
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/education"
                className="hover:bg-surface-2 flex h-12 w-12 items-center justify-center text-muted-foreground transition-colors duration-150 hover:text-foreground"
                aria-label="Documentation"
              >
                <IconDocs className="h-5 w-5" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-mono text-xs">
              Documentation
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  )
}
