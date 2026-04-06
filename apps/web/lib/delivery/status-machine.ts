export type DeliveryPhase = 'intake' | 'plan' | 'execute' | 'review' | 'qa' | 'ship'

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

export const DELIVERY_TASK_TRANSITIONS: Record<DeliveryTaskStatus, DeliveryTaskStatus[]> = {
  draft: ['planned'],
  planned: ['ready'],
  ready: ['in_progress'],
  in_progress: ['blocked', 'in_review'],
  blocked: ['ready'],
  in_review: ['qa_pending', 'rejected'],
  qa_pending: ['done', 'rejected'],
  done: [],
  rejected: ['ready'],
}

export const DELIVERY_PHASE_TRANSITIONS: Record<DeliveryPhase, DeliveryPhase[]> = {
  intake: ['plan'],
  plan: ['execute'],
  execute: ['review'],
  review: ['qa'],
  qa: ['ship'],
  ship: ['execute'],
}

export function canTransitionTask(from: DeliveryTaskStatus, to: DeliveryTaskStatus): boolean {
  return DELIVERY_TASK_TRANSITIONS[from]?.includes(to) ?? false
}

export function canTransitionDeliveryPhase(from: DeliveryPhase, to: DeliveryPhase): boolean {
  return DELIVERY_PHASE_TRANSITIONS[from]?.includes(to) ?? false
}
