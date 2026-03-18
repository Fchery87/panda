'use client'

import type { ReactNode } from 'react'

interface RightPanelProps {
  chatContent: ReactNode
  chatInput: ReactNode
}

export function RightPanel({
  chatContent,
  chatInput,
}: RightPanelProps) {
  return (
    <div className="surface-1 flex h-full min-h-0 min-w-0 flex-col overflow-hidden border-l border-border">
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{chatContent}</div>
      {chatInput}
    </div>
  )
}
