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

const PLAN_APPROVAL_STATES: Record<string, PlanApprovalState> = {
  ready_for_review: { status: 'awaiting_review', canApprove: true, canBuild: false },
  accepted: { status: 'approved', canApprove: false, canBuild: true },
  executing: { status: 'executing', canApprove: false, canBuild: false },
  completed: { status: 'completed', canApprove: false, canBuild: false },
  failed: { status: 'failed', canApprove: false, canBuild: true },
}

const DEFAULT_PLAN_APPROVAL_STATE: PlanApprovalState = {
  status: 'idle',
  canApprove: false,
  canBuild: false,
}

export function derivePlanApprovalState(args: {
  planningSession: ProjectPlanningSessionRecord
}): PlanApprovalState {
  const planStatus = args.planningSession?.generatedPlan?.status

  return (planStatus && PLAN_APPROVAL_STATES[planStatus]) || DEFAULT_PLAN_APPROVAL_STATE
}
