'use client'

import type { ReactNode } from 'react'
import { TabBar } from '@/components/ui/tab-bar'
import { cn } from '@/lib/utils'

export type BottomDockTab = 'terminal'

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
        className="dock-collapsed-bar border-foreground bg-[oklch(16%_0.018_240)] px-3 text-[oklch(86%_0.018_145)]"
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
                className={cn(
                  tab.id === activeTab ? 'text-primary' : 'text-[oklch(86%_0.018_145/0.65)]'
                )}
              >
                {tab.label}
              </span>
              {tab.badge != null && tab.badge > 0 && (
                <span className="badge-sm" data-severity={tab.badgeSeverity ?? 'info'}>
                  {tab.badge}
                </span>
              )}
            </span>
          ))}
        </div>
        <span className="ml-auto font-mono text-[10px] text-[oklch(86%_0.018_145/0.55)]">
          <kbd className="bg-muted px-1">Ctrl</kbd>+<kbd className="bg-muted px-1">J</kbd>
        </span>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-col border-t border-foreground bg-[oklch(16%_0.018_240)] text-[oklch(86%_0.018_145)]">
      {/* Tab bar */}
      <TabBar
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={onTabChange}
        className="border-b-background/20 h-9 bg-[oklch(16%_0.018_240)]"
        trailingContent={
          <button
            type="button"
            onClick={onToggle}
            className="flex h-full items-center font-mono text-[10px] text-muted-foreground hover:text-foreground"
            title="Collapse dock"
            aria-label="Collapse dock"
          >
            ▼
          </button>
        }
      />
      {/* Content */}
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  )
}
