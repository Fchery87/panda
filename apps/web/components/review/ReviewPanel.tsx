'use client'

import type { ReactNode } from 'react'
import {
  Activity,
  DatabaseZap,
  FileText,
  LayoutDashboard,
  Brain,
  BookOpen,
  ListTodo,
  ShieldCheck,
  Radar,
  ScrollText,
  MonitorSmartphone,
} from 'lucide-react'
import { TabContainer, type TabItem } from '@/components/ui/tab-container'
import { PlanningIntakeSurface } from '@/components/plan/PlanningIntakePopup'

export type ReviewTab =
  | 'tasks'
  | 'run'
  | 'plan'
  | 'artifacts'
  | 'memory'
  | 'evals'
  | 'qa'
  | 'state'
  | 'browser'
  | 'activity'
  | 'decisions'

interface ReviewPanelProps {
  activeTab?: ReviewTab
  onTabChange?: (tab: ReviewTab) => void
  taskContent: ReactNode
  runContent: ReactNode
  planContent: ReactNode
  artifactsContent: ReactNode
  memoryContent: ReactNode
  evalsContent: ReactNode
  qaContent: ReactNode
  stateContent: ReactNode
  browserContent: ReactNode
  activityContent: ReactNode
  decisionsContent: ReactNode
}

export function ReviewPanel({
  taskContent,
  activeTab = 'run',
  onTabChange,
  runContent,
  planContent,
  artifactsContent,
  memoryContent,
  evalsContent,
  qaContent,
  stateContent,
  browserContent,
  activityContent,
  decisionsContent,
}: ReviewPanelProps) {
  const tabs: TabItem[] = [
    {
      id: 'tasks',
      label: 'Tasks',
      icon: <ListTodo className="h-3.5 w-3.5" />,
      content: taskContent,
    },
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
    {
      id: 'qa',
      label: 'QA',
      icon: <ShieldCheck className="h-3.5 w-3.5" />,
      content: qaContent,
    },
    {
      id: 'state',
      label: 'State',
      icon: <Radar className="h-3.5 w-3.5" />,
      content: stateContent,
    },
    {
      id: 'browser',
      label: 'Browser',
      icon: <MonitorSmartphone className="h-3.5 w-3.5" />,
      content: browserContent,
    },
    {
      id: 'activity',
      label: 'Activity',
      icon: <ScrollText className="h-3.5 w-3.5" />,
      content: activityContent,
    },
    {
      id: 'decisions',
      label: 'Decisions',
      icon: <DatabaseZap className="h-3.5 w-3.5" />,
      content: decisionsContent,
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
