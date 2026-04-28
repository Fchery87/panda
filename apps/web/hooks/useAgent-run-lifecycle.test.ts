import { describe, expect, test } from 'bun:test'
import type { Doc, Id } from '@convex/_generated/dataModel'

import { createRunLifecycle } from './useAgent-run-lifecycle'
import type { TerminationReason } from '@/lib/agent/harness/errors'

type ExecutionReceipt = NonNullable<Doc<'agentRuns'>['receipt']>

function createReceipt(resultStatus: ExecutionReceipt['resultStatus']): ExecutionReceipt {
  return {
    version: 1,
    mode: 'code',
    requestedMode: 'ask',
    resolvedMode: 'code',
    agent: 'code',
    routingDecision: {
      requestedMode: 'ask',
      resolvedMode: 'code',
      agent: 'code',
      confidence: 'high',
      rationale: 'Test receipt.',
      requiresApproval: false,
      webcontainerRequired: false,
      suggestedSkills: [],
      source: 'deterministic_rules',
    },
    providerModel: 'test-model',
    contextSources: {
      filesConsidered: [],
      filesLoaded: [],
      filesExcluded: [],
      memoryBankIncluded: false,
      specIncluded: false,
      planIncluded: false,
      sessionSummaryIncluded: false,
      compactionOccurred: false,
      truncated: false,
    },
    webcontainer: {
      used: false,
      filesWritten: [],
      commandsRun: [],
      truncated: false,
    },
    nativeExecution: {
      filesRead: [],
      toolsUsed: [],
      approvalsRequested: [],
      truncated: false,
    },
    tokens: {
      input: 1,
      output: 2,
      cached: 0,
    },
    durationMs: 3,
    resultStatus,
  }
}

function createHarness() {
  const calls = {
    flush: [] as Array<{ force: boolean; reason: string }>,
    complete: [] as Array<{
      runId: Id<'agentRuns'>
      summary?: string
      usage?: unknown
      receipt?: ExecutionReceipt
    }>,
    fail: [] as Array<{
      runId: Id<'agentRuns'>
      error: string
      receipt?: ExecutionReceipt
      terminationReason?: TerminationReason
    }>,
    stop: [] as Array<{
      runId: Id<'agentRuns'>
      receipt?: ExecutionReceipt
      terminationReason?: TerminationReason
    }>,
    clear: 0,
    completed: [] as Array<{
      runId: Id<'agentRuns'>
      outcome: 'completed' | 'failed' | 'stopped'
      completedPlanStepIndexes: number[]
      planTotalSteps: number
    }>,
  }

  const runId = 'run-1' as Id<'agentRuns'>
  const runIdRef: { current: Id<'agentRuns'> | null } = { current: runId }

  const lifecycle = createRunLifecycle({
    runIdRef,
    clearRun: () => {
      calls.clear += 1
      runIdRef.current = null
    },
    flushRunEventBuffer: async (args) => {
      calls.flush.push(args)
    },
    completeRun: async (args) => {
      calls.complete.push(args)
    },
    failRun: async (args) => {
      calls.fail.push(args)
    },
    stopRun: async (args) => {
      calls.stop.push(args)
    },
    onRunCompleted: async (args) => {
      calls.completed.push(args)
    },
    getCompletedPlanStepIndexes: () => [0, 2],
    getPlanTotalSteps: () => 3,
  })

  return { calls, lifecycle, runId }
}

describe('createRunLifecycle', () => {
  test('finalizes a completed run once and reports completion metadata', async () => {
    const { calls, lifecycle, runId } = createHarness()

    const receipt = createReceipt('complete')
    await lifecycle.finalizeRunCompleted(
      'done',
      {
        promptTokens: 1,
        completionTokens: 2,
        totalTokens: 3,
      },
      receipt
    )
    await lifecycle.finalizeRunCompleted('ignored')

    expect(calls.flush).toEqual([{ force: true, reason: 'complete' }])
    expect(calls.complete).toEqual([
      {
        runId,
        summary: 'done',
        usage: {
          promptTokens: 1,
          completionTokens: 2,
          totalTokens: 3,
        },
        receipt,
      },
    ])
    expect(calls.clear).toBe(1)
    expect(calls.completed).toEqual([
      {
        runId,
        outcome: 'completed',
        completedPlanStepIndexes: [0, 2],
        planTotalSteps: 3,
      },
    ])
  })

  test('finalizes failed and stopped runs with the expected side effects', async () => {
    const failed = createHarness()
    const errorReceipt = createReceipt('error')
    await failed.lifecycle.finalizeRunFailed('boom', errorReceipt)

    expect(failed.calls.flush).toEqual([{ force: true, reason: 'fail' }])
    expect(failed.calls.fail).toEqual([
      { runId: failed.runId, error: 'boom', receipt: errorReceipt },
    ])
    expect(failed.calls.completed).toEqual([
      {
        runId: failed.runId,
        outcome: 'failed',
        completedPlanStepIndexes: [0, 2],
        planTotalSteps: 3,
      },
    ])

    const stopped = createHarness()
    const abortedReceipt = createReceipt('aborted')
    await stopped.lifecycle.finalizeRunStopped(abortedReceipt)

    expect(stopped.calls.flush).toEqual([{ force: true, reason: 'stop' }])
    expect(stopped.calls.stop).toEqual([{ runId: stopped.runId, receipt: abortedReceipt }])
    expect(stopped.calls.completed).toEqual([
      {
        runId: stopped.runId,
        outcome: 'stopped',
        completedPlanStepIndexes: [0, 2],
        planTotalSteps: 3,
      },
    ])
  })

  test('persists typed termination reasons for failed and stopped runs', async () => {
    const failed = createHarness()
    const failureReason: TerminationReason = {
      kind: 'preflight-failed',
      code: 'UNMANIFESTED_MODEL',
    }
    await failed.lifecycle.finalizeRunFailed('preflight failed', undefined, failureReason)

    expect(failed.calls.fail).toEqual([
      {
        runId: failed.runId,
        error: 'preflight failed',
        receipt: undefined,
        terminationReason: failureReason,
      },
    ])

    const stopped = createHarness()
    const stopReason: TerminationReason = { kind: 'user-abort' }
    await stopped.lifecycle.finalizeRunStopped(undefined, stopReason)

    expect(stopped.calls.stop).toEqual([
      {
        runId: stopped.runId,
        receipt: undefined,
        terminationReason: stopReason,
      },
    ])
  })
})
