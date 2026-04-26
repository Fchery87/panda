'use client'

import { TabBar } from '@/components/ui/tab-bar'

export type CenterTabBarTabId = 'editor' | 'diff' | 'logs' | 'tests'

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
    <TabBar
      tabs={tabs.map((tab) => ({
        ...tab,
        badgeSeverity: tab.id === 'diff' ? 'warning' : 'info',
      }))}
      activeTab={activeTab}
      onTabChange={onTabChange}
      trailingContent={trailingContent}
      className="h-9"
      tabClassName="px-4"
    />
  )
}
