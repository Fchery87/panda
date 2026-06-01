import type { WorkflowChainTemplate } from './chains'

export type DeepReviewLane = 'security' | 'correctness' | 'quality'
export type DeepReviewSeverity = 'info' | 'warning' | 'error'

export interface DeepReviewFinding {
  lane: DeepReviewLane
  severity: DeepReviewSeverity
  title: string
  summary: string
  filePaths?: string[]
}

export interface AggregatedDeepReview {
  status: 'approved' | 'needs_changes' | 'blocked'
  counts: Record<DeepReviewSeverity, number>
  summary: string
}

export const DEEP_REVIEW_LANES: readonly DeepReviewLane[] = [
  'security',
  'correctness',
  'quality',
] as const

export function isDeepReviewTemplate(template: WorkflowChainTemplate): boolean {
  return template.id === 'deep-branch-review'
}

export function aggregateDeepReviewFindings(findings: DeepReviewFinding[]): AggregatedDeepReview {
  const counts: Record<DeepReviewSeverity, number> = { info: 0, warning: 0, error: 0 }
  for (const finding of findings) {
    counts[finding.severity] += 1
  }

  const status = counts.error > 0 ? 'blocked' : counts.warning > 0 ? 'needs_changes' : 'approved'
  const laneList = Array.from(new Set(findings.map((finding) => finding.lane))).join(', ') || 'none'

  return {
    status,
    counts,
    summary: `Deep review ${status}: ${counts.error} blocking, ${counts.warning} warning, ${counts.info} info findings across ${laneList}.`,
  }
}
