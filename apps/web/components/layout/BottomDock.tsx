'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type BottomDockTab =
  | 'terminal'
  | 'problems'
  | 'logs'
  | 'tests'
  | 'agent-events'
  | 'network'
  | 'build'

interface DockTabDef {
  id: BottomDockTab
  label: string
  badge?: number
  badgeSeverity?: 'error' | 'warning' | 'info'
}

interface BottomDockProps {
  isOpen: boolean
  activeTab: BottomDockTab
  onTabChange: (tab: BottomDockTab) => void
  onToggle: () => void
  tabs: DockTabDef[]
  children: ReactNode
}

export function BottomDock({
  isOpen,
  activeTab,
  onTabChange,
  onToggle,
  tabs,
  children,
}: BottomDockProps) {
  if (!isOpen) {
    return (
      <div
        className="dock-collapsed-bar px-3"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggle()
          }
        }}
      >
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">▲</span>
          {tabs.map((tab) => (
            <span key={tab.id} className="flex items-center gap-1">
              <span
                className={cn(tab.id === activeTab ? 'text-foreground' : 'text-muted-foreground')}
              >
                {tab.label}
              </span>
              {tab.badge != null && tab.badge > 0 && (
                <span className="dock-tab-badge" data-severity={tab.badgeSeverity ?? 'info'}>
                  {tab.badge}
                </span>
              )}
            </span>
          ))}
        </div>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground/50">
          <kbd className="bg-muted px-1">Ctrl</kbd>+<kbd className="bg-muted px-1">J</kbd>
        </span>
      </div>
    )
  }

  return (
    <div className="surface-1 flex min-h-0 flex-col border-t border-border">
      {/* Tab bar */}
      <div className="surface-1 flex h-8 shrink-0 items-center border-b border-border">
        <div className="flex flex-1 items-center">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className="dock-tab"
              data-active={tab.id === activeTab ? 'true' : undefined}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
              {tab.badge != null && tab.badge > 0 && (
                <span className="dock-tab-badge" data-severity={tab.badgeSeverity ?? 'info'}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="flex h-full items-center px-3 font-mono text-[10px] text-muted-foreground hover:text-foreground"
          title="Collapse dock"
          aria-label="Collapse dock"
        >
          ▼
        </button>
      </div>
      {/* Content */}
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  )
}
