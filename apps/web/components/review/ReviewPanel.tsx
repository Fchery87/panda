'use client'

import type { ReactNode } from 'react'
import { Activity, FileText, LayoutDashboard, Brain, BookOpen } from 'lucide-react'
import { TabContainer, type TabItem } from '@/components/ui/tab-container'
import { PlanningIntakeSurface } from '@/components/plan/PlanningIntakePopup'

export type ReviewTab = 'run' | 'plan' | 'artifacts' | 'memory' | 'evals'

interface ReviewPanelProps {
  activeTab?: ReviewTab
  onTabChange?: (tab: ReviewTab) => void
  runContent: ReactNode
  planContent: ReactNode
  artifactsContent: ReactNode
  memoryContent: ReactNode
  evalsContent: ReactNode
}

export function ReviewPanel({
  activeTab = 'run',
  onTabChange,
  runContent,
  planContent,
  artifactsContent,
  memoryContent,
  evalsContent,
}: ReviewPanelProps) {
  const tabs: TabItem[] = [
    {
      id: 'run',
      label: 'Run',
      icon: <Activity className="h-3.5 w-3.5" />,
      content: runContent,
    },
    {
      id: 'plan',
      label: 'Plan',
      icon: <FileText className="h-3.5 w-3.5" />,
      content: planContent,
    },
    {
      id: 'artifacts',
      label: 'Artifacts',
      icon: <LayoutDashboard className="h-3.5 w-3.5" />,
      content: artifactsContent,
    },
    {
      id: 'memory',
      label: 'Memory',
      icon: <Brain className="h-3.5 w-3.5" />,
      content: memoryContent,
    },
    {
      id: 'evals',
      label: 'Evals',
      icon: <BookOpen className="h-3.5 w-3.5" />,
      content: evalsContent,
    },
  ]

  return (
    <div className="surface-1 relative flex h-full flex-col border-l border-border">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <span className="text-sm font-medium text-foreground">Review</span>
      </div>
      <div className="border-b border-border p-3">
        <PlanningIntakeSurface />
      </div>
      <div className="relative flex-1 overflow-hidden">
        <TabContainer
          tabs={tabs}
          defaultTab="run"
          activeTab={activeTab}
          onTabChange={(id) => onTabChange?.(id as ReviewTab)}
          className="h-full"
          contentClassName="min-h-0"
        />
      </div>
    </div>
  )
}
