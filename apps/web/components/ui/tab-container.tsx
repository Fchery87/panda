'use client'

import { useState, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

export interface TabItem {
  id: string
  label: string
  icon?: ReactNode
  content: ReactNode
}

interface TabContainerProps {
  tabs: TabItem[]
  defaultTab?: string
  activeTab?: string
  onTabChange?: (tabId: string) => void
  className?: string
  tabBarClassName?: string
  contentClassName?: string
  variant?: 'default' | 'compact'
}

export function TabContainer({
  tabs,
  defaultTab,
  activeTab: controlledTab,
  onTabChange,
  className,
  tabBarClassName,
  contentClassName,
  variant = 'default',
}: TabContainerProps) {
  const [internalTab, setInternalTab] = useState(defaultTab ?? tabs[0]?.id ?? '')
  const activeTab = controlledTab ?? internalTab
  const isCompact = variant === 'compact'
  const activeTabContent = tabs.find((tab) => tab.id === activeTab)?.content ?? null

  function handleTabChange(tabId: string) {
    if (controlledTab === undefined) {
      setInternalTab(tabId)
    }

    onTabChange?.(tabId)
  }

  return (
    <div className={cn('flex h-full flex-col', className)}>
      <div
        className={cn('flex border-b border-border', isCompact ? 'px-2' : 'px-3', tabBarClassName)}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                'flex items-center gap-1.5 font-mono uppercase tracking-widest transition-colors duration-150',
                isCompact ? 'px-3 py-1.5 text-[10px]' : 'px-2 py-1 text-xs',
                isActive
                  ? 'border-b-2 border-primary text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          )
        })}
      </div>
      <div className={cn('flex-1 overflow-hidden', contentClassName)}>{activeTabContent}</div>
    </div>
  )
}
