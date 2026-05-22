'use client'

import { TabBar, type TabBarTab } from '@/components/ui/tab-bar'

export type RightPanelTabId = 'proof' | 'changes' | 'context'

export type InspectorTabDef = TabBarTab<RightPanelTabId>

interface RightPanelProps {
  inspectorContent?: React.ReactNode
  inspectorTabs?: InspectorTabDef[]
  activeInspectorTab?: RightPanelTabId
  onInspectorTabChange?: (tab: RightPanelTabId) => void
  inspectorTitle?: string
  inspectorSummary?: string
  inspectorEyebrow?: string
}

export function RightPanel({
  inspectorContent,
  inspectorTabs = [],
  activeInspectorTab = 'proof',
  onInspectorTabChange,
  inspectorTitle = 'Evidence Surface',
  inspectorSummary:
    _inspectorSummary = 'Run proof, receipts, snapshots, subagents, specs, and validation.',
  inspectorEyebrow = 'Evidence Surface',
}: RightPanelProps) {
  const activeTab = activeInspectorTab
  const tabs: TabBarTab<RightPanelTabId>[] = inspectorTabs.map((tab) => ({
    ...tab,
    label:
      tab.id === 'proof'
        ? 'Proof'
        : tab.id === 'changes'
          ? 'Changes'
          : tab.id === 'context'
            ? 'Context'
            : tab.label,
  }))

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-background">
      <div className="border-b border-border bg-background px-3 py-1.5">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          {inspectorEyebrow}
        </div>
        <h2 className="truncate text-[13px] font-medium text-foreground">
          {inspectorTitle}
        </h2>
      </div>

      <TabBar
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tab) => onInspectorTabChange?.(tab)}
        className="h-8 shrink-0 overflow-x-auto border-b-border bg-card"
        tabsClassName="scrollbar-hide min-w-max"
        tabClassName="whitespace-nowrap px-2.5 text-[10px]"
      />

      <div className="min-h-0 min-w-0 flex-1 overflow-hidden bg-card">
        {inspectorContent}
      </div>
    </div>
  )
}
