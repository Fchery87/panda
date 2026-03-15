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
    <div className="surface-1 flex h-full flex-col border-l border-border">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-sm font-medium text-foreground">Chat</span>
        <ModeToggle
          mode={automationMode}
          onModeChange={onAutomationModeChange}
          disabled={isStreaming}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">{chatContent}</div>
      {chatInput}
    </div>
  )
}
