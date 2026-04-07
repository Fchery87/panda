import type { FormalSpecification } from '../agent/spec/types'
import type { GeneratedPlanArtifact } from '../planning/types'

export function buildPlanTaskSeeds(plan: GeneratedPlanArtifact): Array<{
  taskKey: string
  title: string
  description: string
  rationale: string
  ownerRole: 'manager'
}> {
  const matches = Array.from(plan.markdown.matchAll(/^\d+\.\s+(.+)$/gm)).map((match) =>
    match[1]?.trim()
  )
  return matches
    .filter((value): value is string => Boolean(value))
    .map((title, index) => ({
      taskKey: `${plan.sessionId}-step-${index + 1}`,
      title,
      description: `Derived from approved plan "${plan.title}".`,
      rationale: plan.summary,
      ownerRole: 'manager' as const,
    }))
}

export function buildSpecVerificationRecordInput(args: {
  deliveryStateId: string
  taskId: string
  spec: FormalSpecification
  evidenceRef: string
  now: number
}) {
  return {
    deliveryStateId: args.deliveryStateId,
    taskId: args.taskId,
    kind: 'review' as const,
    label: `Spec ${args.spec.id} verification`,
    status: args.spec.status === 'verified' ? ('passed' as const) : ('pending' as const),
    evidenceRefs: [args.evidenceRef],
    createdAt: args.now,
    updatedAt: args.now,
  }
}

export function buildDriftFollowUpAction(args: {
  specId: string
  changedFiles: string[]
  summary: string
}) {
  return {
    ownerRole: 'manager' as const,
    title: `Reconcile spec drift for ${args.specId}`,
    description: `Spec ${args.specId}: ${args.summary} Changed files: ${args.changedFiles.join(', ')}`,
  }
}
