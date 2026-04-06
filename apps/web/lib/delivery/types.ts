export type DeliveryPhase = 'intake' | 'plan' | 'execute' | 'review' | 'qa' | 'ship'

export type DeliveryRole = 'builder' | 'manager' | 'executive'

export type GateStatus = 'not_required' | 'pending' | 'passed' | 'failed' | 'waived'

export type DeliveryTaskStatus =
  | 'draft'
  | 'planned'
  | 'ready'
  | 'in_progress'
  | 'blocked'
  | 'in_review'
  | 'qa_pending'
  | 'done'
  | 'rejected'

export type AcceptanceCriterionStatus = 'pending' | 'passed' | 'failed' | 'waived'

export type ReviewType = 'architecture' | 'implementation'

export type ReviewDecision = 'pass' | 'concerns' | 'reject'

export type QaDecision = 'pass' | 'concerns' | 'fail'

export type ShipDecision = 'ready' | 'ready_with_risk' | 'not_ready'
