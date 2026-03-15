'use client'

import Link from 'next/link'
import {
  MessageSquarePlus,
  FolderTree,
  Search,
  Clock,
  Eye,
  FileCheck,
  TerminalSquare,
  Settings,
  BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export type SidebarSection =
  | 'new-chat'
  | 'explorer'
  | 'search'
  | 'history'
  | 'builder'
  | 'specs'
  | 'terminal'

interface SidebarRailProps {
  activeSection: SidebarSection
  isFlyoutOpen: boolean
  onSectionChange: (section: SidebarSection) => void
  onToggleFlyout: () => void
  projectId?: string
}

interface NavItem {
  id: SidebarSection
  icon: React.ComponentType<{ className?: string }>
  label: string
  shortcut: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'new-chat', icon: MessageSquarePlus, label: 'New Chat', shortcut: 'Ctrl+N' },
  { id: 'explorer', icon: FolderTree, label: 'Explorer', shortcut: 'Ctrl+Shift+E' },
  { id: 'search', icon: Search, label: 'Search', shortcut: 'Ctrl+Shift+F' },
  { id: 'history', icon: Clock, label: 'History', shortcut: 'Ctrl+Shift+H' },
  { id: 'builder', icon: Eye, label: 'Preview', shortcut: 'Ctrl+Shift+P' },
  { id: 'specs', icon: FileCheck, label: 'Specs', shortcut: 'Ctrl+Shift+S' },
  { id: 'terminal', icon: TerminalSquare, label: 'Terminal', shortcut: 'Ctrl+`' },
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
                      'relative flex h-11 w-12 items-center justify-center transition-colors duration-150',
                      isActive
                        ? 'bg-surface-2 text-foreground'
                        : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground'
                    )}
                    aria-label={item.label}
                    aria-pressed={isActive}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-0 h-full w-0.5 bg-primary" />
                    )}
                    <Icon className="h-[18px] w-[18px]" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <span className="font-mono text-xs">{item.label}</span>
                  <span className="ml-2 font-mono text-xs text-muted-foreground">
                    ({item.shortcut})
                  </span>
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
                href={projectId ? `/projects/${projectId}/settings` : '/settings'}
                className="flex h-11 w-12 items-center justify-center text-muted-foreground transition-colors duration-150 hover:bg-surface-2 hover:text-foreground"
                aria-label="Settings"
              >
                <Settings className="h-[18px] w-[18px]" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">
              <span className="font-mono text-xs">Settings</span>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/education"
                className="flex h-11 w-12 items-center justify-center text-muted-foreground transition-colors duration-150 hover:bg-surface-2 hover:text-foreground"
                aria-label="Documentation"
              >
                <BookOpen className="h-[18px] w-[18px]" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">
              <span className="font-mono text-xs">Documentation</span>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  )
}
