import type { FormalSpecification } from '@/lib/agent/spec/types'

import type { ProjectPlanningSessionRecord } from './useProjectPlanningSession'

export type UnifiedPlanStatus =
  | 'idle'
  | 'drafting'
  | 'awaiting_review'
  | 'approved'
  | 'executing'
  | 'completed'
  | 'failed'

export interface PlanApprovalState {
  status: UnifiedPlanStatus
  canApprove: boolean
  canBuild: boolean
}

export function derivePlanApprovalState(args: {
  planningSession: ProjectPlanningSessionRecord
  pendingSpec: Pick<FormalSpecification, 'status'> | null
}): PlanApprovalState {
  const planStatus = args.planningSession?.generatedPlan?.status

  if (planStatus === 'ready_for_review') {
    return { status: 'awaiting_review', canApprove: true, canBuild: false }
  }

  if (planStatus === 'accepted') {
    return { status: 'approved', canApprove: false, canBuild: true }
  }

  if (planStatus === 'executing') {
    return { status: 'executing', canApprove: false, canBuild: false }
  }

  if (planStatus === 'completed') {
    return { status: 'completed', canApprove: false, canBuild: false }
  }

  if (planStatus === 'failed') {
    return { status: 'failed', canApprove: false, canBuild: true }
  }

  if (args.pendingSpec) {
    return { status: 'awaiting_review', canApprove: true, canBuild: false }
  }

  return { status: 'idle', canApprove: false, canBuild: false }
}
