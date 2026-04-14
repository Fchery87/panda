import type { FormalSpecification } from './types'
import type { ForgeGateStatus, ForgeGateType, ForgePhase } from '../../forge/types'

export interface ForgeReconcileInput {
  phase?: ForgePhase
  gates?: Record<ForgeGateType, ForgeGateStatus>
}

export type ReconcileReason =
  | 'no-forge-context'
  | 'spec-not-verified'
  | 'gate-not-passed'
  | 'aligned'

export interface ReconcileResult {
  aligned: boolean
  reason: ReconcileReason
  gate?: ForgeGateType
  detail?: string
}

const SHIP_READY_SPEC_STATUSES = new Set(['verified', 'archived'])

const GATE_REQUIRED_PHASES: Partial<Record<ForgePhase, ForgeGateType>> = {
  review: 'implementation_review',
  qa: 'qa_review',
  ship: 'ship_review',
}

export function reconcileSpecAndForge(args: {
  spec: FormalSpecification
  forge?: ForgeReconcileInput
}): ReconcileResult {
  const { spec, forge } = args

  if (!forge || !forge.phase || !forge.gates) {
    return { aligned: true, reason: 'no-forge-context' }
  }

  if (!SHIP_READY_SPEC_STATUSES.has(spec.status)) {
    return {
      aligned: false,
      reason: 'spec-not-verified',
      detail: `Spec status is ${spec.status} but phase is ${forge.phase}`,
    }
  }

  const gateKey = GATE_REQUIRED_PHASES[forge.phase]
  if (gateKey) {
    const gateStatus = forge.gates[gateKey]
    if (
      gateStatus !== 'passed' &&
      gateStatus !== 'waived' &&
      gateStatus !== 'not_required'
    ) {
      return {
        aligned: false,
        reason: 'gate-not-passed',
        gate: gateKey,
        detail: `Gate ${gateKey} is ${gateStatus}`,
      }
    }
  }

  return { aligned: true, reason: 'aligned' }
}
