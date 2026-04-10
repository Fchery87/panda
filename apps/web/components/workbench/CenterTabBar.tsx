'use client'

import { cn } from '@/lib/utils'

export type CenterTabBarTabId = 'home' | 'editor' | 'diff' | 'preview' | 'logs' | 'tests'

export interface CenterTabBarTab {
  id: CenterTabBarTabId
  label: string
  badge?: number
}

interface CenterTabBarProps {
  tabs: CenterTabBarTab[]
  activeTab: CenterTabBarTabId
  onTabChange?: (tab: CenterTabBarTabId) => void
  trailingContent?: React.ReactNode
}

export function CenterTabBar({ tabs, activeTab, onTabChange, trailingContent }: CenterTabBarProps) {
  return (
    <div className="surface-1 flex h-9 shrink-0 items-center border-b border-border">
      <div className="flex h-full items-center">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange?.(tab.id)}
            className={cn(
              'relative flex h-full items-center gap-1.5 border-r border-border px-4 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors duration-100',
              activeTab === tab.id
                ? 'surface-0 text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
            aria-pressed={activeTab === tab.id}
          >
            {activeTab === tab.id && (
              <div className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />
            )}
            {tab.label}
            {tab.badge != null && tab.badge > 0 && (
              <span
                className="dock-tab-badge"
                data-severity={tab.id === 'diff' ? 'warning' : 'info'}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
      {trailingContent && (
        <div className="ml-auto flex items-center gap-2 px-3">{trailingContent}</div>
      )}
    </div>
  )
}
