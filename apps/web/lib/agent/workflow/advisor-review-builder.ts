import type { AdvisorGate, AdvisorReview, AdvisorReviewFinding } from './advisor'

export interface BuildAdvisorReviewInput {
  gates: AdvisorGate[]
  summary?: string
  risks?: AdvisorReviewFinding[]
  status?: AdvisorReview['status']
}

export function inferAdvisorReviewStatus(risks: AdvisorReviewFinding[] = []): AdvisorReview['status'] {
  if (risks.some((risk) => risk.severity === 'high')) return 'blocked'
  if (risks.some((risk) => risk.severity === 'medium')) return 'needs_changes'
  return 'approved'
}

export function buildAdvisorReview(input: BuildAdvisorReviewInput): AdvisorReview {
  const risks = input.risks ?? []
  const status = input.status ?? inferAdvisorReviewStatus(risks)
  const gateText = input.gates.length ? input.gates.join(', ') : 'none'
  const summary =
    input.summary ??
    (status === 'approved'
      ? `Advisor approved gated workflow action. Gates reviewed: ${gateText}.`
      : `Advisor review requires attention before continuing. Gates reviewed: ${gateText}.`)

  return { status, summary, risks }
}

export function isValidAdvisorReview(value: unknown): value is AdvisorReview {
  if (!value || typeof value !== 'object') return false
  const candidate = value as AdvisorReview
  if (!['approved', 'needs_changes', 'blocked'].includes(candidate.status)) return false
  if (typeof candidate.summary !== 'string' || candidate.summary.trim().length === 0) return false
  if (!Array.isArray(candidate.risks)) return false
  return candidate.risks.every(
    (risk) =>
      risk &&
      typeof risk === 'object' &&
      ['low', 'medium', 'high'].includes(risk.severity) &&
      typeof risk.finding === 'string' &&
      typeof risk.recommendation === 'string'
  )
}
