import type { DecisionLogEntry, ForgeRole, ForgeTaskRecord, WorkerContextPack } from './types'
export { parseWorkerResult } from './result-parser'

export function buildForgeContextPack(args: {
  projectId: string
  deliveryStateId: string
  role: ForgeRole
  task: ForgeTaskRecord
  decisions?: DecisionLogEntry[]
  recentChangesDigest: string
  nextStepBrief?: string
  excludedContext?: string[]
}): WorkerContextPack {
  return {
    projectId: args.projectId,
    deliveryStateId: args.deliveryStateId,
    taskId: args.task.id,
    role: args.role,
    objective: args.task.title,
    summary: args.task.description,
    filesInScope: args.task.filesInScope,
    routesInScope: args.task.routesInScope,
    constraints: args.task.constraints,
    acceptanceCriteria: args.task.acceptanceCriteria,
    testRequirements: args.task.testRequirements,
    reviewRequirements: args.task.reviewRequirements,
    qaRequirements: args.task.qaRequirements,
    decisions: args.decisions ?? [],
    recentChangesDigest: args.recentChangesDigest,
    nextStepBrief: args.nextStepBrief,
    excludedContext: args.excludedContext ?? [],
  }
}
