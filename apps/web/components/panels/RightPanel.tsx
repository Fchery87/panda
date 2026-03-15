'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import { Eye, MessageSquare } from 'lucide-react'

import { cn } from '@/lib/utils'
import { ModeToggle } from '@/components/chat/ModeToggle'

export type RightPanelTab = 'chat' | 'preview'

interface RightPanelProps {
  chatContent: ReactNode
  previewContent: ReactNode
  chatInput: ReactNode
  automationMode: 'manual' | 'auto'
  onAutomationModeChange: (mode: 'manual' | 'auto') => void
  isStreaming?: boolean
  activeTab?: RightPanelTab
  onTabChange?: (tab: RightPanelTab) => void
}

export function RightPanel({
  chatContent,
  previewContent,
  chatInput,
  automationMode,
  onAutomationModeChange,
  isStreaming,
  activeTab: controlledTab,
  onTabChange,
}: RightPanelProps) {
  const [internalTab, setInternalTab] = useState<RightPanelTab>('chat')

  const isControlled = controlledTab !== undefined
  const activeTab = isControlled ? controlledTab : internalTab

  function handleTabChange(tab: RightPanelTab) {
    if (!isControlled) {
      setInternalTab(tab)
    }
    onTabChange?.(tab)
  }

  return (
    <div className="surface-1 flex h-full flex-col border-l border-border">
      {/* Tab header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleTabChange('chat')}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 font-mono text-xs uppercase tracking-widest transition-colors duration-150',
              activeTab === 'chat'
                ? 'border-b-2 border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Chat
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('preview')}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 font-mono text-xs uppercase tracking-widest transition-colors duration-150',
              activeTab === 'preview'
                ? 'border-b-2 border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Eye className="h-3.5 w-3.5" />
            Preview
          </button>
        </div>
        <ModeToggle
          mode={automationMode}
          onModeChange={onAutomationModeChange}
          disabled={isStreaming}
        />
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className={cn('flex-1 overflow-hidden', activeTab !== 'chat' && 'hidden')}>
          {chatContent}
        </div>
        <div className={cn('flex-1 overflow-hidden', activeTab !== 'preview' && 'hidden')}>
          {previewContent}
        </div>
      </div>

      {/* Chat input always visible */}
      {chatInput}
    </div>
  )
}
