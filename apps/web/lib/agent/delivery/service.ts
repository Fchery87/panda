import type { Id } from '@convex/_generated/dataModel'
import { deriveFinalLifecycleUpdatesFromQa } from './manager'
import { buildSuccessfulRunClosurePlan } from './orchestrator'
import {
  createBrowserSessionKey,
  deriveQaReportFingerprint,
  shouldCreateFreshQaArtifacts,
} from '@/lib/qa/browser-session'

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

  const browserSessionKey = createBrowserSessionKey({
    projectId: args.projectId,
    chatId: args.chatId,
    taskId: args.taskId,
  })
  const nextQaFingerprint = deriveQaReportFingerprint({
    taskId: args.taskId,
    runId: args.runId,
    flowNames: closurePlan.createQaReport.evidence.flowNames,
    urlsTested: closurePlan.createQaReport.evidence.urlsTested,
  })

  return {
    ...closurePlan,
    createQaReport: {
      ...closurePlan.createQaReport,
      browserSessionKey,
    },
    browserSessionKey,
    nextQaFingerprint,
    shouldRunBrowserQa: shouldCreateFreshQaArtifacts({
      latestFingerprint: args.latestQaFingerprint,
      nextFingerprint: nextQaFingerprint,
    }),
    finalLifecycle: deriveFinalLifecycleUpdatesFromQa({
      qaDecision: closurePlan.createQaReport.decision,
      activeTaskTitle: args.taskTitle,
    }),
  }
}
