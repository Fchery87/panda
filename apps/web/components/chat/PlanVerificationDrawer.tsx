'use client'

import type { FormalSpecification } from '@/lib/agent/spec/types'
import { SpecDrawer } from '@/components/chat/SpecDrawer'

export type PlanVerificationMode = 'closed' | 'inspect'

interface PlanVerificationDrawerProps {
  mode: PlanVerificationMode
  spec: FormalSpecification | null
  onClose: () => void
  children?: React.ReactNode
}

export function PlanVerificationDrawer({
  mode,
  spec,
  onClose,
  children,
}: PlanVerificationDrawerProps) {
  if (mode === 'closed' || !spec) return null
  return children ?? <SpecDrawer spec={spec} isOpen onClose={onClose} />
}
