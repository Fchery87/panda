import type { QaDecision, ReviewDecision, ShipDecision } from '@/lib/delivery/types'

export function deriveImplementationReviewDecision(args: {
  outcome: 'completed' | 'failed' | 'stopped'
}): ReviewDecision {
  return args.outcome === 'completed' ? 'pass' : 'concerns'
}

export function deriveShipDecision(args: { qaDecision: QaDecision }): ShipDecision {
  if (args.qaDecision === 'pass') return 'ready'
  if (args.qaDecision === 'concerns') return 'ready_with_risk'
  return 'not_ready'
}

export function buildExecutiveSummary(args: { taskTitle: string; qaDecision: QaDecision }): string {
  const shipDecision = deriveShipDecision({ qaDecision: args.qaDecision })

  if (shipDecision === 'ready') {
    return `${args.taskTitle} is ready to ship.`
  }
  if (shipDecision === 'ready_with_risk') {
    return `${args.taskTitle} is ready to ship with known risk.`
  }
  return `${args.taskTitle} is not ready to ship.`
}
