type TaskPanelTask = {
  title: string
  description: string
  rationale: string
  status:
    | 'draft'
    | 'planned'
    | 'ready'
    | 'in_progress'
    | 'blocked'
    | 'in_review'
    | 'qa_pending'
    | 'done'
    | 'rejected'
  ownerRole: 'builder' | 'manager' | 'executive'
  acceptanceCriteria: Array<{
    id: string
    text: string
    status: 'pending' | 'passed' | 'failed' | 'waived'
  }>
  filesInScope: string[]
  blockers: string[]
  evidence: Array<{
    label: string
    href?: string
  }>
  latestReview?: {
    type: 'architecture' | 'implementation'
    decision: 'pass' | 'concerns' | 'reject'
    summary: string
  } | null
}

type QAPanelReport = {
  decision: 'pass' | 'concerns' | 'fail'
  summary: string
  assertions: Array<{
    label: string
    status: 'passed' | 'failed' | 'skipped'
  }>
  evidence: {
    urlsTested: string[]
    flowNames: string[]
    consoleErrors: string[]
    networkFailures: string[]
  }
  defects: Array<{
    severity: 'high' | 'medium' | 'low'
    title: string
    detail: string
  }>
}

type StatePanelState = {
  currentPhase: string
  openTaskCount: number
  unresolvedRiskCount: number
  reviewGateStatus: 'not_required' | 'pending' | 'passed' | 'failed' | 'waived'
  qaGateStatus: 'not_required' | 'pending' | 'passed' | 'failed' | 'waived'
  shipSummary: string
}

export function buildTaskPanelViewModel(args: {
  activeDeliveryTask: TaskPanelTask | null
  activeTaskReview: TaskPanelTask['latestReview']
}): TaskPanelTask | null {
  if (!args.activeDeliveryTask) return null

  return {
    ...args.activeDeliveryTask,
    latestReview: args.activeTaskReview,
  }
}

export function buildQAPanelViewModel(args: {
  activeTaskQaReport: QAPanelReport | null
}): QAPanelReport | null {
  return args.activeTaskQaReport
}

export function buildStatePanelViewModel(args: {
  activeDeliveryState:
    | {
        currentPhase: string
        openRiskCount: number
        reviewGateStatus: StatePanelState['reviewGateStatus']
        qaGateStatus: StatePanelState['qaGateStatus']
      }
    | null
    | undefined
  deliveryTasks:
    | Array<{
        status:
          | 'draft'
          | 'planned'
          | 'ready'
          | 'in_progress'
          | 'blocked'
          | 'in_review'
          | 'qa_pending'
          | 'done'
          | 'rejected'
      }>
    | undefined
  latestShipReport: {
    summary: string
  } | null
}): StatePanelState | null {
  if (!args.activeDeliveryState) return null

  return {
    currentPhase: args.activeDeliveryState.currentPhase,
    openTaskCount:
      args.deliveryTasks?.filter((task) => task.status !== 'done' && task.status !== 'rejected')
        .length ?? 0,
    unresolvedRiskCount: args.activeDeliveryState.openRiskCount,
    reviewGateStatus: args.activeDeliveryState.reviewGateStatus,
    qaGateStatus: args.activeDeliveryState.qaGateStatus,
    shipSummary: args.latestShipReport?.summary ?? 'Ship readiness pending.',
  }
}
