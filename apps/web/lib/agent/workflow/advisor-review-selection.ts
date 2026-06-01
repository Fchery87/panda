import type { AdvisorGate, AdvisorReview } from './advisor'

export type AdvisorReviewRecord = AdvisorReview & {
  _id?: string
  artifactId?: string
  workflowArtifactId?: string
  runId?: string
  gates?: string[]
  createdAt?: number
}

export interface AdvisorReviewSelectionTarget {
  artifactId?: string
  workflowArtifactId?: string
  runId?: string
  gates?: AdvisorGate[]
}

function hasGateOverlap(review: AdvisorReviewRecord, gates: AdvisorGate[] = []) {
  if (gates.length === 0) return false
  const reviewGates = new Set(review.gates ?? [])
  return gates.some((gate) => reviewGates.has(gate))
}

export function selectAdvisorReviewForTarget(
  reviews: AdvisorReviewRecord[] | undefined,
  target: AdvisorReviewSelectionTarget
): AdvisorReviewRecord | null {
  const candidates = [...(reviews ?? [])].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
  if (candidates.length === 0) return null

  if (target.artifactId) {
    const match = candidates.find((review) => review.artifactId === target.artifactId)
    if (match) return match
  }

  if (target.workflowArtifactId) {
    const match = candidates.find(
      (review) => review.workflowArtifactId === target.workflowArtifactId
    )
    if (match) return match
  }

  if (target.runId) {
    const match = candidates.find((review) => review.runId === target.runId)
    if (match) return match
  }

  const gateMatch = candidates.find((review) => hasGateOverlap(review, target.gates))
  if (gateMatch) return gateMatch

  return candidates[0]
}
