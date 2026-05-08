'use client'

import type { ForwardRefExoticComponent } from 'react'
import Link from 'next/link'
import type { LucideProps } from 'lucide-react'
import {
  House as IconHome,
  Folder as IconProjects,
  Bot as IconAgents,
  Search as IconSearch,
  GitBranch as IconGit,
  Globe as IconDeploy,
  Settings as IconSettings,
  History as IconHistory,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export type SidebarSection = 'files' | 'agents' | 'search' | 'git' | 'deploy' | 'tasks'

interface SidebarRailProps {
  activeSection: SidebarSection
  isFlyoutOpen: boolean
  onSectionChange: (section: SidebarSection) => void
  onToggleFlyout: () => void
  projectId?: string
  onHomeClick?: () => void
  sessionSignal?: SidebarSessionSignal
}

export interface SidebarSessionSignal {
  state: 'idle' | 'running' | 'blocked' | 'review' | 'complete'
  label: string
  count?: number
}

interface NavItem {
  id: SidebarSection
  icon: ForwardRefExoticComponent<LucideProps>
  label: string
  shortcut: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'tasks', icon: IconHistory, label: 'Sessions', shortcut: 'Ctrl+Shift+H' },
  { id: 'files', icon: IconProjects, label: 'Project Files', shortcut: 'Ctrl+Shift+E' },
  { id: 'agents', icon: IconAgents, label: 'Agent Runs', shortcut: 'Ctrl+Shift+A' },
  { id: 'search', icon: IconSearch, label: 'Find Context', shortcut: 'Ctrl+Shift+F' },
  { id: 'git', icon: IconGit, label: 'Source Review', shortcut: 'Ctrl+Shift+G' },
  { id: 'deploy', icon: IconDeploy, label: 'App Preview', shortcut: '' },
]

export function SidebarRail({
  activeSection,
  isFlyoutOpen,
  onSectionChange,
  onToggleFlyout,
  projectId: _projectId,
  onHomeClick,
  sessionSignal,
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
      <div className="flex h-full w-[52px] flex-shrink-0 flex-col bg-foreground text-background">
        {/* Projects link at top */}
        <div className="border-background/20 flex flex-col border-b">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onHomeClick}
                className="text-background/70 flex h-12 items-center justify-center transition-colors duration-150 hover:bg-primary hover:text-foreground"
                aria-label="Home"
              >
                <IconHome className="h-4.5 w-4.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-mono text-xs">
              Home
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/projects"
                className="border-background/20 text-background/70 flex h-12 items-center justify-center border-t transition-colors duration-150 hover:bg-primary hover:text-foreground"
                aria-label="Projects"
              >
                <IconProjects className="h-4.5 w-4.5" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-mono text-xs">
              Projects
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Top section - Navigation items */}
        <div className="flex flex-col py-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = item.id === activeSection
            const showSessionSignal =
              item.id === 'tasks' && sessionSignal && sessionSignal.state !== 'idle'

            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => handleItemClick(item.id)}
                    className={cn(
                      'border-background/15 relative grid h-12 place-items-center border-b transition-colors duration-100',
                      isActive
                        ? 'bg-primary text-foreground'
                        : 'text-background/70 hover:bg-background/10 hover:text-background'
                    )}
                    aria-label={item.label}
                    aria-pressed={isActive}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                    {showSessionSignal ? (
                      <span
                        className={cn(
                          'absolute right-1.5 top-1.5 h-1.5 w-1.5 border border-background',
                          sessionSignal.state === 'running' && 'animate-pulse bg-primary',
                          sessionSignal.state === 'blocked' && 'bg-destructive',
                          sessionSignal.state === 'review' && 'bg-[oklch(var(--status-warning))]',
                          sessionSignal.state === 'complete' && 'bg-[oklch(var(--status-success))]'
                        )}
                      />
                    ) : null}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-mono text-xs">
                  {item.label}
                  {showSessionSignal ? (
                    <span className="ml-2 text-muted-foreground">
                      ({sessionSignal.label}
                      {sessionSignal.count ? ` · ${sessionSignal.count}` : ''})
                    </span>
                  ) : null}
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

        {/* Bottom section - Settings */}
        <div className="border-background/20 flex flex-col border-t py-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/settings"
                className="text-background/70 border-background/15 hover:bg-background/10 flex h-12 items-center justify-center border-b transition-colors duration-100 hover:text-background"
                aria-label="Settings"
              >
                <IconSettings className="h-[18px] w-[18px]" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-mono text-xs">
              Settings
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  )
}
