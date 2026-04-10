export type ForgePhase = 'intake' | 'plan' | 'execute' | 'review' | 'qa' | 'ship'

export type ForgeRole = 'builder' | 'manager' | 'executive'

export type ForgeTaskStatus =
  | 'draft'
  | 'planned'
  | 'ready'
  | 'in_progress'
  | 'blocked'
  | 'in_review'
  | 'qa_pending'
  | 'done'
  | 'rejected'

export type ForgeGateType =
  | 'architecture_review'
  | 'implementation_review'
  | 'qa_review'
  | 'ship_review'

export type ForgeGateStatus = 'not_required' | 'pending' | 'passed' | 'failed' | 'waived'

export type VerificationMethod = 'unit' | 'integration' | 'e2e' | 'manual' | 'review'

export type AcceptanceCriterionStatus = 'pending' | 'passed' | 'failed' | 'waived'

export interface ForgeAcceptanceCriterion {
  id: string
  text: string
  status: AcceptanceCriterionStatus
  verificationMethod: VerificationMethod
}

export type EvidenceKind =
  | 'agent_run'
  | 'run_event'
  | 'job'
  | 'worker_result'
  | 'review_report'
  | 'qa_report'
  | 'ship_report'
  | 'specification'
  | 'eval_run'
  | 'artifact'
  | 'external'

export interface EvidenceRef {
  kind: EvidenceKind
  label: string
  ref?: string
  href?: string
}

export interface FollowUpTaskSeed {
  title: string
  description: string
  ownerRole: ForgeRole
}

export interface ReviewChecklistResult {
  item: string
  status: 'passed' | 'failed' | 'waived'
  detail?: string
}

export interface ShipCriterionResult {
  criterion: string
  status: 'passed' | 'failed' | 'waived'
  evidenceRefs: string[]
  detail?: string
}

export interface ReviewFinding {
  severity: 'high' | 'medium' | 'low'
  title: string
  detail: string
  filePath?: string
  lineRef?: string
}

export interface ReviewResult {
  reviewType: 'architecture' | 'implementation'
  decision: 'pass' | 'concerns' | 'reject'
  summary: string
  checklistResults: ReviewChecklistResult[]
  requiredActionItems?: string[]
  verificationEvidence?: EvidenceRef[]
  findings: ReviewFinding[]
  followUpTaskSeeds: FollowUpTaskSeed[]
  createdAt: number
}

export interface QaAssertionResult {
  label: string
  status: 'passed' | 'failed' | 'skipped'
  detail?: string
}

export interface QaEvidenceArtifact {
  kind: 'screenshot' | 'log' | 'trace' | 'report' | 'external'
  label: string
  href?: string
  detail?: string
}

export interface QaDefect {
  severity: 'high' | 'medium' | 'low'
  title: string
  detail: string
  route?: string
}

export interface QaResult {
  decision: 'pass' | 'concerns' | 'fail'
  summary: string
  assertions: QaAssertionResult[]
  routesTested: string[]
  flowsTested: string[]
  evidence: QaEvidenceArtifact[]
  defects: QaDefect[]
  browserSessionKey?: string
  createdAt: number
}

export interface BrowserSessionRecord {
  id: string
  projectId: string
  environment: string
  status: 'ready' | 'stale' | 'leased' | 'failed'
  browserSessionKey: string
  baseUrl: string
  storageStatePath?: string
  lastUsedAt: number
  lastVerifiedAt?: number
  lastRoutesTested: string[]
  leaseOwner?: string
  leaseExpiresAt?: number
  createdAt: number
  updatedAt: number
}

export interface DecisionLogEntry {
  id: string
  category: 'architecture' | 'execution' | 'risk' | 'qa' | 'ship'
  summary: string
  detail?: string
  relatedTaskIds: string[]
  relatedFilePaths: string[]
  createdByRole: ForgeRole
  createdAt: number
}

export interface VerificationRecord {
  id: string
  taskId: string
  kind: 'test' | 'review' | 'qa' | 'ship' | 'manual'
  label: string
  status: 'pending' | 'passed' | 'failed' | 'waived'
  evidenceRefs: string[]
  createdAt: number
  updatedAt: number
}

export interface OrchestrationWave {
  id: string
  phase: ForgePhase
  status: 'planned' | 'active' | 'completed' | 'failed'
  summary: string
  taskIds: string[]
  contextResetRequired: boolean
  createdAt: number
  updatedAt: number
}

export interface ForgeTaskRecord {
  id: string
  taskKey: string
  title: string
  description: string
  rationale: string
  ownerRole: ForgeRole
  dependencies: string[]
  filesInScope: string[]
  routesInScope: string[]
  constraints: string[]
  acceptanceCriteria: ForgeAcceptanceCriterion[]
  testRequirements: string[]
  reviewRequirements: string[]
  qaRequirements: string[]
  blockers: string[]
  status: ForgeTaskStatus
  evidence: EvidenceRef[]
  latestReview?: ReviewResult | null
  latestQa?: QaResult | null
  taskBoard?: {
    readiness: 'ready' | 'blocked' | 'done' | 'rejected'
    isReady: boolean
    blockedByTaskIds: string[]
    priority: number
  }
  createdAt: number
  updatedAt: number
}

export interface WorkerContextPack {
  projectId: string
  deliveryStateId: string
  taskId: string
  role: Extract<ForgeRole, 'builder' | 'manager' | 'executive'>
  objective: string
  summary: string
  filesInScope: string[]
  routesInScope: string[]
  constraints: string[]
  acceptanceCriteria: ForgeAcceptanceCriterion[]
  testRequirements: string[]
  reviewRequirements: string[]
  qaRequirements: string[]
  decisions: DecisionLogEntry[]
  recentChangesDigest: string
  nextStepBrief?: string
  excludedContext: string[]
}

export interface WorkerTestResult {
  command: string
  status: 'passed' | 'failed' | 'skipped'
  detail?: string
}

export interface WorkerResult {
  outcome: 'completed' | 'blocked' | 'failed'
  summary: string
  filesTouched: string[]
  testsWritten: string[]
  testsRun: WorkerTestResult[]
  evidenceRefs: string[]
  unresolvedRisks: string[]
  followUpActions: string[]
  suggestedTaskStatus: Extract<ForgeTaskStatus, 'in_review' | 'blocked' | 'rejected'>
}

export interface ForgeHandoffSummary {
  activeTask: {
    id: string
    title: string
    status: ForgeTaskStatus
    ownerRole: ForgeRole
  } | null
  openTaskCount: number
  summaryLines: string[]
}

export interface ForgeRoleActionView {
  role: ForgeRole
  items: string[]
}

export interface ForgeRoleNextActions {
  builder: ForgeRoleActionView
  manager: ForgeRoleActionView
  executive: ForgeRoleActionView
}

export interface ForgeStatusView {
  primarySummary: string
  summaryLines: string[]
}

export interface ForgeTaskListItem {
  id: string
  title: string
  status: ForgeTaskStatus
  ownerRole: ForgeRole
}

export interface ForgeTaskView {
  openTasks: ForgeTaskListItem[]
  pendingReviews: ForgeTaskListItem[]
  qaBlockers: string[]
  shipBlockers: string[]
}

export interface ForgeVerificationView {
  reviewDecision?: ReviewResult['decision'] | null
  qaDecision?: QaResult['decision'] | null
  shipDecision?: 'ready' | 'ready_with_risk' | 'not_ready' | null
  summaryLines: string[]
}

export interface ForgeProjectSnapshot {
  project: {
    id: string
    name: string
    description?: string
  }
  state: {
    id: string
    phase: ForgePhase
    status: 'draft' | 'active' | 'blocked' | 'completed' | 'cancelled' | 'failed'
    activeRole: ForgeRole
    activeWave?: OrchestrationWave
    summary: {
      goal: string
      currentPhaseSummary?: string
      nextStepBrief?: string
    }
    gates: Record<ForgeGateType, ForgeGateStatus>
    openRiskCount: number
    unresolvedDefectCount: number
  }
  taskBoard: {
    activeTaskId?: string
    tasks: ForgeTaskRecord[]
  }
  verification: {
    records: VerificationRecord[]
    latestReview?: ReviewResult | null
    latestQa?: QaResult | null
    latestShip?: {
      decision: 'ready' | 'ready_with_risk' | 'not_ready'
      summary: string
      evidenceSummary: string
      criteriaResults: ShipCriterionResult[]
      createdAt: number
    } | null
  }
  browserQa: {
    activeSession?: BrowserSessionRecord
    latestQa?: QaResult | null
  }
  handoffSummary?: ForgeHandoffSummary
  roleNextActions?: ForgeRoleNextActions
  operatorViews?: {
    status: ForgeStatusView
    tasks: ForgeTaskView
    verification: ForgeVerificationView
  }
  decisions: DecisionLogEntry[]
  timeline: Array<Record<string, unknown>>
}
