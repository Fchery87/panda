import type { DeliveryPhase, DeliveryRole, GateStatus } from './types'

export type DeliveryStatusStripState = {
  currentPhase: DeliveryPhase | null
  activeRole: DeliveryRole | null
  currentTaskTitle: string | null
  reviewGateStatus: GateStatus
  qaGateStatus: GateStatus
  shipGateStatus: GateStatus
  evidenceMissing: boolean
}

export type DeliveryStateSelectorInput = {
  currentPhase: DeliveryPhase
  activeRole: DeliveryRole
  reviewGateStatus: GateStatus
  qaGateStatus: GateStatus
  shipGateStatus: GateStatus
  evidenceMissing: boolean
  summary: {
    goal: string
    activeTaskTitle?: string
  }
}

const EMPTY_STATUS_STRIP_STATE: DeliveryStatusStripState = {
  currentPhase: null,
  activeRole: null,
  currentTaskTitle: null,
  reviewGateStatus: 'not_required',
  qaGateStatus: 'not_required',
  shipGateStatus: 'not_required',
  evidenceMissing: false,
}

export function mapDeliveryStateToStatusStripProps(
  state: DeliveryStateSelectorInput | null
): DeliveryStatusStripState {
  if (!state) {
    return EMPTY_STATUS_STRIP_STATE
  }

  return {
    currentPhase: state.currentPhase,
    activeRole: state.activeRole,
    currentTaskTitle: state.summary.activeTaskTitle ?? null,
    reviewGateStatus: state.reviewGateStatus,
    qaGateStatus: state.qaGateStatus,
    shipGateStatus: state.shipGateStatus,
    evidenceMissing: state.evidenceMissing,
  }
}
