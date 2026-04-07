import type { Id } from '@convex/_generated/dataModel'
import { buildSuccessfulRunClosurePlan } from './orchestrator'
import { deriveQaReportFingerprint, shouldCreateFreshQaArtifacts } from '@/lib/qa/browser-session'

export function buildDeliveryClosureServicePlan(args: {
  taskId: Id<'deliveryTasks'>
  deliveryStateId: Id<'deliveryStates'>
  taskTitle: string
  runId: Id<'agentRuns'>
  projectId: string
  chatId: string
  projectPath: string
  latestQaFingerprint: string | null
}) {
  const closurePlan = buildSuccessfulRunClosurePlan({
    taskId: args.taskId,
    deliveryStateId: args.deliveryStateId,
    taskTitle: args.taskTitle,
    runId: args.runId,
    projectPath: args.projectPath,
  })

  const nextQaFingerprint = deriveQaReportFingerprint({
    taskId: args.taskId,
    runId: args.runId,
    flowNames: closurePlan.createQaReport.evidence.flowNames,
    urlsTested: closurePlan.createQaReport.evidence.urlsTested,
  })

  return {
    ...closurePlan,
    nextQaFingerprint,
    shouldRunBrowserQa: shouldCreateFreshQaArtifacts({
      latestFingerprint: args.latestQaFingerprint,
      nextFingerprint: nextQaFingerprint,
    }),
  }
}
