'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type RightPanelTabId = 'chat' | 'plan' | 'review' | 'inspect' | 'run' | 'comments'

interface TabDef {
  id: RightPanelTabId
  label: string
}

const TABS: TabDef[] = [
  { id: 'chat', label: 'Chat' },
  { id: 'plan', label: 'Plan' },
  { id: 'review', label: 'Review' },
  { id: 'inspect', label: 'Inspect' },
  { id: 'run', label: 'Run' },
  { id: 'comments', label: 'Notes' },
]

interface RightPanelProps {
  chatContent: ReactNode
  planContent?: ReactNode
  reviewContent?: ReactNode
  inspectContent?: ReactNode
  runContent?: ReactNode
  commentsContent?: ReactNode
  activeTab?: RightPanelTabId
  onTabChange?: (tab: RightPanelTabId) => void
}

/**
 * Right contextual panel — multi-tab panel sitting on the right side
 * of the workspace. Supports Chat, Plan, Review Notes, Inspect,
 * Run Details, and Comments tabs.
 */
export function RightPanel({
  chatContent,
  planContent,
  reviewContent,
  inspectContent,
  runContent,
  commentsContent,
  activeTab: externalTab,
  onTabChange: externalOnTabChange,
}: RightPanelProps) {
  const [internalTab, setInternalTab] = useState<RightPanelTabId>('chat')

  const activeTab = externalTab ?? internalTab
  const onTabChange = externalOnTabChange ?? setInternalTab

  const renderContent = () => {
    switch (activeTab) {
      case 'chat':
        return chatContent
      case 'plan':
        return (
          planContent ?? (
            <EmptyTabContent
              title="Plan"
              description="Plan drafts and approval flows will appear here during architect mode."
            />
          )
        )
      case 'review':
        return (
          reviewContent ?? (
            <EmptyTabContent
              title="Review Notes"
              description="Inline comments on files and diff chunks. Click 'Comment on Change' in the diff view to add notes."
            />
          )
        )
      case 'inspect':
        return (
          inspectContent ?? (
            <EmptyTabContent
              title="Inspect"
              description="Component path, CSS metadata, and 'Send to agent' controls. Select an element in preview to inspect."
            />
          )
        )
      case 'run':
        return (
          runContent ?? (
            <EmptyTabContent
              title="Run Details"
              description="Current step, tool activity, token/cost, elapsed time. Active during agent runs."
            />
          )
        )
      case 'comments':
        return (
          commentsContent ?? (
            <EmptyTabContent
              title="Notes"
              description="Conversation-style comments on the current task. Add context for future sessions."
            />
          )
        )
      default:
        return chatContent
    }
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-background">
      {/* Tab header */}
      <div className="surface-1 scrollbar-hide flex h-9 shrink-0 items-center overflow-x-auto border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={cn('dock-tab whitespace-nowrap', activeTab === tab.id && 'text-foreground')}
            data-active={activeTab === tab.id ? 'true' : undefined}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {/* Content */}
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{renderContent()}</div>
    </div>
  )
}

function EmptyTabContent({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-8 text-center">
      <h3 className="font-mono text-xs font-medium uppercase tracking-widest text-foreground">
        {title}
      </h3>
      <p className="mt-2 max-w-xs text-[11px] leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  )
}
