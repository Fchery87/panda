'use client'

import { useRef, useEffect } from 'react'
import type { ChatMode } from '@/lib/agent/chat-modes'

export interface ModeContext {
  mode: ChatMode
  approvedPlanId: string | null
  activeSpecId: string | null
  depth: 'quick' | 'standard' | 'deep'
}

export function useModeContextRef(context: ModeContext) {
  const ref = useRef<ModeContext>(context)
  useEffect(() => {
    ref.current = context
  })
  return ref
}
