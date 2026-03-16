'use client'

import type { ReactNode } from 'react'

import { ModeToggle } from '@/components/chat/ModeToggle'

interface RightPanelProps {
  chatContent: ReactNode
  chatInput: ReactNode
  automationMode: 'manual' | 'auto'
  onAutomationModeChange: (mode: 'manual' | 'auto') => void
  isStreaming?: boolean
}

export function RightPanel({
  chatContent,
  chatInput,
  automationMode,
  onAutomationModeChange,
  isStreaming,
}: RightPanelProps) {
  return (
    <div className="surface-1 flex h-full min-h-0 min-w-0 flex-col overflow-hidden border-l border-border">
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/30 px-3 py-2">
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.24em] text-foreground">
          Chat
        </span>
        <ModeToggle
          mode={automationMode}
          onModeChange={onAutomationModeChange}
          disabled={isStreaming}
        />
      </div>
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{chatContent}</div>
      {chatInput}
    </div>
  )
}
