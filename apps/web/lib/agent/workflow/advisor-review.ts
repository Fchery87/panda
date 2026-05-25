import type { AdvisorGate, AdvisorReview } from './advisor'

export type AdvisorEnforcementStatus = 'approved' | 'needs_changes' | 'blocked' | 'not_required'

export interface AdvisorEnforcementInput {
  required: boolean
  gates: AdvisorGate[]
  review?: AdvisorReview | null
}

export interface AdvisorEnforcementResult {
  status: AdvisorEnforcementStatus
  canContinue: boolean
  message: string
}

export function enforceAdvisorReview(input: AdvisorEnforcementInput): AdvisorEnforcementResult {
  if (!input.required) {
    return { status: 'not_required', canContinue: true, message: 'Advisor review is not required.' }
  }

  if (!input.review) {
    return {
      status: 'blocked',
      canContinue: false,
      message: `Advisor review is required before continuing: ${input.gates.join(', ')}`,
    }
  }

  if (input.review.status === 'approved') {
    return { status: 'approved', canContinue: true, message: input.review.summary }
  }

  return {
    status: input.review.status,
    canContinue: false,
    message: input.review.summary || `Advisor review ${input.review.status}.`,
  }
}

export function advisorReviewRunEvent(result: AdvisorEnforcementResult) {
  return {
    type: 'advisor_review',
    content: result.message,
    status: result.status,
    progressCategory: 'analysis',
  } as const
}
