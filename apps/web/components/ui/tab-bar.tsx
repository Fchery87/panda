'use client'

import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export interface TabBarTab<T extends string> {
  id: T
  label: string
  badge?: number
  badgeSeverity?: 'error' | 'warning' | 'info'
}

interface TabBarProps<T extends string> {
  tabs: TabBarTab<T>[]
  activeTab: T
  onTabChange?: (tab: T) => void
  trailingContent?: ReactNode
  className?: string
  tabsClassName?: string
  tabClassName?: string
}

export function TabBar<T extends string>({
  tabs,
  activeTab,
  onTabChange,
  trailingContent,
  className,
  tabsClassName,
  tabClassName,
}: TabBarProps<T>) {
  return (
    <div className={cn('surface-1 flex shrink-0 items-center border-b border-border', className)}>
      <div className={cn('flex h-full items-center', tabsClassName)}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange?.(tab.id)}
            className={cn('dock-tab', tabClassName)}
            data-active={activeTab === tab.id ? 'true' : undefined}
            aria-pressed={activeTab === tab.id}
          >
            {tab.label}
            {tab.badge != null && tab.badge > 0 && (
              <span className="badge-sm" data-severity={tab.badgeSeverity ?? 'info'}>
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
