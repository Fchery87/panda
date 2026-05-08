'use client'

import type { ReactNode } from 'react'
import { TabBar, type TabBarTab } from '@/components/ui/tab-bar'

export type RightPanelTabId = 'work' | 'run' | 'changes' | 'context'

export type InspectorTabDef = TabBarTab<string>

interface RightPanelProps {
  workContent: ReactNode
  inspectorContent?: ReactNode
  inspectorTabs?: InspectorTabDef[]
  activeInspectorTab?: string
  onInspectorTabChange?: (tab: string) => void
  isInspectorOpen?: boolean
  onInspectorToggle?: () => void
  inspectorTitle?: string
  inspectorSummary?: string
  inspectorEyebrow?: string
}

export function RightPanel({
  workContent,
  inspectorContent,
  inspectorTabs = [],
  activeInspectorTab,
  onInspectorTabChange,
  isInspectorOpen = false,
  onInspectorToggle,
  inspectorTitle = 'Evidence Surface',
  inspectorSummary: _inspectorSummary = 'Run proof, receipts, snapshots, subagents, specs, and validation.',
  inspectorEyebrow = 'Evidence Surface',
}: RightPanelProps) {
  const activeTab = isInspectorOpen && activeInspectorTab ? activeInspectorTab : 'work'
  const tabs: TabBarTab<string>[] = [
    { id: 'work', label: 'Work' },
    ...inspectorTabs.map((tab) => ({
      ...tab,
      label:
        tab.id === 'run'
          ? 'Run Proof'
          : tab.id === 'changes'
            ? 'Changes'
            : tab.id === 'context'
              ? 'Context'
              : tab.id === 'preview'
                ? 'Preview'
                : tab.label,
    })),
  ]

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-background">
      <div className="border-b border-foreground bg-secondary px-3 py-2">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          {activeTab === 'work' ? 'Work Tray' : inspectorEyebrow}
        </div>
        <h2 className="text-sm font-medium text-foreground">
          {activeTab === 'work' ? 'Inspect and edit work' : inspectorTitle}
        </h2>
      </div>

      <TabBar
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab === 'work') {
            onInspectorToggle?.()
            return
          }
          onInspectorTabChange?.(tab)
        }}
        className="h-10 shrink-0 overflow-x-auto border-b-foreground bg-card"
        tabsClassName="scrollbar-hide min-w-max"
        tabClassName="whitespace-nowrap px-3 text-[11px]"
      />

      <div className="min-h-0 min-w-0 flex-1 overflow-hidden bg-card">
        {activeTab === 'work' ? workContent : inspectorContent}
      </div>
    </div>
  )
}
