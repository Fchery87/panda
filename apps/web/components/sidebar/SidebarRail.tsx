'use client'

import type { ForwardRefExoticComponent } from 'react'
import Link from 'next/link'
import type { IconProps } from '@phosphor-icons/react'
import {
  IconHome,
  IconProjects,
  IconAgents,
  IconSearch,
  IconGit,
  IconDeploy,
  IconSettings,
  IconHistory,
} from '@/components/ui/icons'
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
  icon: ForwardRefExoticComponent<IconProps>
  label: string
  shortcut: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'tasks', icon: IconHistory, label: 'Sessions', shortcut: 'Ctrl+Shift+H' },
  { id: 'files', icon: IconProjects, label: 'Support: Files', shortcut: 'Ctrl+Shift+E' },
  { id: 'agents', icon: IconAgents, label: 'Support: Branches', shortcut: 'Ctrl+Shift+A' },
  { id: 'search', icon: IconSearch, label: 'Support: Search', shortcut: 'Ctrl+Shift+F' },
  { id: 'git', icon: IconGit, label: 'Support: Source Control', shortcut: 'Ctrl+Shift+G' },
  { id: 'deploy', icon: IconDeploy, label: 'Support: Preview', shortcut: '' },
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
      <div className="surface-1 flex h-full w-12 flex-shrink-0 flex-col border-r border-border">
        {/* Projects link at top */}
        <div className="flex flex-col border-b border-border">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onHomeClick}
                className="hover:bg-surface-2 flex h-11 items-center justify-center text-muted-foreground transition-colors duration-150 hover:text-foreground"
                aria-label="Home"
              >
                <IconHome className="h-4.5 w-4.5" weight="duotone" />
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
                className="hover:bg-surface-2 flex h-11 items-center justify-center border-t border-border text-muted-foreground transition-colors duration-150 hover:text-foreground"
                aria-label="Projects"
              >
                <IconProjects className="h-4.5 w-4.5" weight="duotone" />
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
                      'relative mx-0.5 flex h-10 items-center justify-center border border-transparent transition-colors duration-100',
                      isActive
                        ? 'bg-surface-2 shadow-sharp-sm border-border text-foreground'
                        : 'hover:bg-surface-2 text-muted-foreground hover:border-border hover:text-foreground'
                    )}
                    aria-label={item.label}
                    aria-pressed={isActive}
                  >
                    {isActive && <div className="absolute inset-y-0.5 left-0 w-0.5 bg-primary" />}
                    <Icon className="h-[18px] w-[18px]" weight={isActive ? 'duotone' : 'regular'} />
                    {showSessionSignal ? (
                      <span
                        className={cn(
                          'absolute right-1.5 top-1.5 h-1.5 w-1.5 border border-background',
                          sessionSignal.state === 'running' && 'animate-pulse bg-primary',
                          sessionSignal.state === 'blocked' && 'bg-destructive',
                          sessionSignal.state === 'review' && 'bg-[hsl(var(--status-warning))]',
                          sessionSignal.state === 'complete' && 'bg-[hsl(var(--status-success))]'
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
        <div className="flex flex-col border-t border-border py-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/settings"
                className="hover:bg-surface-2 mx-0.5 flex h-10 items-center justify-center border border-transparent text-muted-foreground transition-colors duration-100 hover:border-border hover:text-foreground"
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
