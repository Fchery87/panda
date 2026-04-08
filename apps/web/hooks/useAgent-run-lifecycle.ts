import type { Id } from '@convex/_generated/dataModel'
import type { MutableRefObject } from 'react'
import type { PersistedRunEventInfo, TokenUsageInfo } from '@/components/chat/types'

type RunEventInput = PersistedRunEventInfo

export function createRunLifecycle(args: {
  runIdRef: MutableRefObject<Id<'agentRuns'> | null>
  clearRun: () => void
  flushRunEventBuffer: (args: { force: boolean; reason: string }) => Promise<void>
  completeRun: (args: {
    runId: Id<'agentRuns'>
    summary?: string
    usage?: RunEventInput['usage']
  }) => Promise<unknown>
  failRun: (args: { runId: Id<'agentRuns'>; error: string }) => Promise<unknown>
  stopRun: (args: { runId: Id<'agentRuns'> }) => Promise<unknown>
  onRunCompleted?: (args: {
    runId: Id<'agentRuns'>
    outcome: 'completed' | 'failed' | 'stopped'
    completedPlanStepIndexes: number[]
    planTotalSteps: number
  }) => void | Promise<void>
  getCompletedPlanStepIndexes: () => number[]
  getPlanTotalSteps: () => number
}) {
  let runFinalized = false

  async function finalizeRunCompleted(summary?: string, usage?: TokenUsageInfo): Promise<void> {
    if (!args.runIdRef.current || runFinalized) return
    const currentRunId = args.runIdRef.current
    runFinalized = true
    await args.flushRunEventBuffer({ force: true, reason: 'complete' })
    await args.completeRun({
      runId: currentRunId,
      summary,
      usage,
    })
    args.clearRun()
    if (args.onRunCompleted) {
      await args.onRunCompleted({
        runId: currentRunId,
        outcome: 'completed',
        completedPlanStepIndexes: args.getCompletedPlanStepIndexes(),
        planTotalSteps: args.getPlanTotalSteps(),
      })
    }
  }

  async function finalizeRunFailed(message: string): Promise<void> {
    if (!args.runIdRef.current || runFinalized) return
    const currentRunId = args.runIdRef.current
    runFinalized = true
    await args.flushRunEventBuffer({ force: true, reason: 'fail' })
    await args.failRun({
      runId: currentRunId,
      error: message,
    })
    args.clearRun()
    if (args.onRunCompleted) {
      await args.onRunCompleted({
        runId: currentRunId,
        outcome: 'failed',
        completedPlanStepIndexes: args.getCompletedPlanStepIndexes(),
        planTotalSteps: args.getPlanTotalSteps(),
      })
    }
  }

  async function finalizeRunStopped(): Promise<void> {
    if (!args.runIdRef.current || runFinalized) return
    const currentRunId = args.runIdRef.current
    runFinalized = true
    await args.flushRunEventBuffer({ force: true, reason: 'stop' })
    await args.stopRun({
      runId: currentRunId,
    })
    args.clearRun()
    if (args.onRunCompleted) {
      await args.onRunCompleted({
        runId: currentRunId,
        outcome: 'stopped',
        completedPlanStepIndexes: args.getCompletedPlanStepIndexes(),
        planTotalSteps: args.getPlanTotalSteps(),
      })
    }
  }

  return {
    isFinalized: () => runFinalized,
    finalizeRunCompleted,
    finalizeRunFailed,
    finalizeRunStopped,
  }
}
