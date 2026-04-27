import type { Doc, Id } from '@convex/_generated/dataModel'
import type { MutableRefObject } from 'react'
import type { PersistedRunEventInfo, TokenUsageInfo } from '@/components/chat/types'

type RunEventInput = PersistedRunEventInfo
type ExecutionReceiptInput = NonNullable<Doc<'agentRuns'>['receipt']>

export function createRunLifecycle(args: {
  runIdRef: MutableRefObject<Id<'agentRuns'> | null>
  clearRun: () => void
  flushRunEventBuffer: (args: { force: boolean; reason: string }) => Promise<void>
  completeRun: (args: {
    runId: Id<'agentRuns'>
    summary?: string
    usage?: RunEventInput['usage']
    receipt?: ExecutionReceiptInput
  }) => Promise<unknown>
  failRun: (args: {
    runId: Id<'agentRuns'>
    error: string
    receipt?: ExecutionReceiptInput
  }) => Promise<unknown>
  stopRun: (args: { runId: Id<'agentRuns'>; receipt?: ExecutionReceiptInput }) => Promise<unknown>
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

  async function finalizeRun(argsForOutcome: {
    outcome: 'completed' | 'failed' | 'stopped'
    flushReason: string
    finalize: (runId: Id<'agentRuns'>) => Promise<unknown>
  }): Promise<void> {
    if (!args.runIdRef.current || runFinalized) return
    const currentRunId = args.runIdRef.current
    runFinalized = true
    await args.flushRunEventBuffer({ force: true, reason: argsForOutcome.flushReason })
    await argsForOutcome.finalize(currentRunId)
    args.clearRun()
    if (args.onRunCompleted) {
      await args.onRunCompleted({
        runId: currentRunId,
        outcome: argsForOutcome.outcome,
        completedPlanStepIndexes: args.getCompletedPlanStepIndexes(),
        planTotalSteps: args.getPlanTotalSteps(),
      })
    }
  }

  async function finalizeRunCompleted(
    summary?: string,
    usage?: TokenUsageInfo,
    receipt?: ExecutionReceiptInput
  ): Promise<void> {
    await finalizeRun({
      outcome: 'completed',
      flushReason: 'complete',
      finalize: (runId) =>
        args.completeRun({
          runId,
          summary,
          usage,
          receipt,
        }),
    })
  }

  async function finalizeRunFailed(
    message: string,
    receipt?: ExecutionReceiptInput
  ): Promise<void> {
    await finalizeRun({
      outcome: 'failed',
      flushReason: 'fail',
      finalize: (runId) =>
        args.failRun({
          runId,
          error: message,
          receipt,
        }),
    })
  }

  async function finalizeRunStopped(receipt?: ExecutionReceiptInput): Promise<void> {
    await finalizeRun({
      outcome: 'stopped',
      flushReason: 'stop',
      finalize: (runId) =>
        args.stopRun({
          runId,
          receipt,
        }),
    })
  }

  return {
    isFinalized: () => runFinalized,
    finalizeRunCompleted,
    finalizeRunFailed,
    finalizeRunStopped,
  }
}
