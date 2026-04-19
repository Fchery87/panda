import type { AcceptanceCriterion, FormalSpecification, SpecStatus } from './types'

export interface BridgeDecision {
  accepted: boolean
  reason?: string
  conflicts?: string[]
}

export interface AcceptanceSyncResult {
  synced: boolean
  conflicts: string[]
}

export interface SpecBridge {
  proposeSpecTransition(args: {
    spec: FormalSpecification
    nextStatus: SpecStatus
  }): Promise<BridgeDecision>
  syncAcceptanceCriteria(args: {
    source: 'spec'
    criteria: AcceptanceCriterion[]
  }): Promise<AcceptanceSyncResult>
}
