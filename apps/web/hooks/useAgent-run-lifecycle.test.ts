import { describe, expect, test } from 'bun:test'
import type { Id } from '@convex/_generated/dataModel'

import { createRunLifecycle } from './useAgent-run-lifecycle'

function createHarness() {
  const calls = {
    flush: [] as Array<{ force: boolean; reason: string }>,
    complete: [] as Array<{ runId: Id<'agentRuns'>; summary?: string; usage?: unknown }>,
    fail: [] as Array<{ runId: Id<'agentRuns'>; error: string }>,
    stop: [] as Array<{ runId: Id<'agentRuns'> }>,
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

    await lifecycle.finalizeRunCompleted('done', {
      promptTokens: 1,
      completionTokens: 2,
      totalTokens: 3,
    })
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
    await failed.lifecycle.finalizeRunFailed('boom')

    expect(failed.calls.flush).toEqual([{ force: true, reason: 'fail' }])
    expect(failed.calls.fail).toEqual([{ runId: failed.runId, error: 'boom' }])
    expect(failed.calls.completed).toEqual([
      {
        runId: failed.runId,
        outcome: 'failed',
        completedPlanStepIndexes: [0, 2],
        planTotalSteps: 3,
      },
    ])

    const stopped = createHarness()
    await stopped.lifecycle.finalizeRunStopped()

    expect(stopped.calls.flush).toEqual([{ force: true, reason: 'stop' }])
    expect(stopped.calls.stop).toEqual([{ runId: stopped.runId }])
    expect(stopped.calls.completed).toEqual([
      {
        runId: stopped.runId,
        outcome: 'stopped',
        completedPlanStepIndexes: [0, 2],
        planTotalSteps: 3,
      },
    ])
  })
})
