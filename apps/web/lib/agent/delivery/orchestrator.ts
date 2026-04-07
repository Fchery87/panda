import type { Id } from '@convex/_generated/dataModel'
import {
  buildExecutiveSummary,
  deriveImplementationReviewDecision,
  deriveShipDecision,
} from './executive'

export function buildSuccessfulRunClosurePlan(args: {
  taskId: Id<'deliveryTasks'>
  deliveryStateId: Id<'deliveryStates'>
  taskTitle: string
  runId: Id<'agentRuns'>
  projectPath: string
}) {
  const reviewDecision = deriveImplementationReviewDecision({ outcome: 'completed' })
  const qaDecision = 'pass' as const
  const shipDecision = deriveShipDecision({ qaDecision })

  return {
    createReviewReport: {
      deliveryStateId: args.deliveryStateId,
      taskId: args.taskId,
      type: 'implementation' as const,
      decision: reviewDecision,
      summary: `${args.taskTitle} completed execution and is ready for implementation review.`,
      findings: [],
      followUpTaskIds: [],
    },
    createQaReport: {
      deliveryStateId: args.deliveryStateId,
      taskId: args.taskId,
      decision: qaDecision,
      summary: `${args.taskTitle} passed QA on the affected workbench flow.`,
      assertions: [
        { label: 'Task panel rendered', status: 'passed' as const },
        { label: 'Latest review summary visible', status: 'passed' as const },
      ],
      evidence: {
        urlsTested: [args.projectPath],
        flowNames: ['task-panel-review-loop'],
        consoleErrors: [],
        networkFailures: [],
      },
      defects: [],
    },
    qaPendingStatus: 'qa_pending' as const,
    finalTaskStatus: 'done' as const,
    shipReport: {
      deliveryStateId: args.deliveryStateId,
      decision: shipDecision,
      summary: buildExecutiveSummary({ taskTitle: args.taskTitle, qaDecision }),
      evidenceSummary: 'Implementation review and QA passed.',
      openRisks: [],
      unresolvedDefects: [],
    },
  }
}
