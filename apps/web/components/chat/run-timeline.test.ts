import { describe, expect, test } from 'bun:test'

import type { ExecutionReceipt } from '@/lib/agent/receipt'

import { getRunTimeline } from './run-timeline'
import type { LiveProgressStep } from './live-run-utils'

function step(overrides: Partial<LiveProgressStep>): LiveProgressStep {
  return {
    id: overrides.id ?? 'step-1',
    content: overrides.content ?? 'Working',
    status: overrides.status ?? 'completed',
    category: overrides.category ?? 'tool',
    createdAt: overrides.createdAt ?? 1,
    details: overrides.details,
    planStepIndex: overrides.planStepIndex,
    planStepTitle: overrides.planStepTitle,
    planTotalSteps: overrides.planTotalSteps,
    completedPlanStepIndexes: overrides.completedPlanStepIndexes,
  }
}

function receipt(overrides: Partial<ExecutionReceipt> = {}): ExecutionReceipt {
  return {
    version: 1,
    mode: 'code',
    requestedMode: 'plan',
    resolvedMode: 'code',
    agent: 'code',
    routingDecision: {
      requestedMode: 'plan',
      resolvedMode: 'code',
      agent: 'code',
      confidence: 'high',
      rationale: 'The request asks for a concrete code change.',
      requiresApproval: false,
      webcontainerRequired: false,
      suggestedSkills: [],
      source: 'deterministic_rules',
    },
    providerModel: 'test:model',
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
      used: true,
      filesWritten: ['apps/web/a.tsx', 'apps/web/b.tsx'],
      commandsRun: [{ command: 'bun test', redacted: false }],
      truncated: false,
    },
    nativeExecution: {
      filesRead: ['apps/web/a.tsx'],
      toolsUsed: ['read_file'],
      approvalsRequested: [],
      truncated: false,
    },
    tokens: { input: 10, output: 20, cached: 0 },
    durationMs: 1200,
    resultStatus: 'complete',
    ...overrides,
  }
}

describe('getRunTimeline', () => {
  test('builds staged timeline from intent, steps, and receipt', () => {
    const timeline = getRunTimeline({
      userIntent: 'Fix the run panel',
      steps: [
        step({ id: 'plan', content: 'Planning changes', category: 'analysis', createdAt: 1 }),
        step({
          id: 'write',
          content: 'Updated files',
          category: 'tool',
          createdAt: 2,
          details: { toolName: 'write_files', targetFilePaths: ['apps/web/a.tsx'] },
        }),
        step({
          id: 'test',
          content: 'Ran bun test',
          category: 'tool',
          createdAt: 3,
          details: { toolName: 'run_command' },
        }),
      ],
      receipt: receipt(),
    })

    expect(timeline.status).toBe('succeeded')
    expect(timeline.stages.map((stage) => stage.kind)).toEqual([
      'intent',
      'planning',
      'execution',
      'validation',
      'receipt',
      'next_action',
    ])
    expect(timeline.receipt?.changedFiles).toBe(2)
    expect(timeline.receipt?.commandsRun).toBe(1)
  })

  test('keeps low-level activity grouped under user-facing stages', () => {
    const timeline = getRunTimeline({
      steps: [
        step({
          id: 'read',
          content: 'Read files',
          category: 'tool',
          details: { toolName: 'read_files', targetFilePaths: ['a.ts', 'b.ts', 'c.ts'] },
        }),
        step({
          id: 'lint',
          content: 'Ran lint',
          category: 'tool',
          details: { toolName: 'run_command' },
          createdAt: 2,
        }),
      ],
    })

    const execution = timeline.stages.find((stage) => stage.kind === 'execution')
    const validation = timeline.stages.find((stage) => stage.kind === 'validation')

    expect(execution?.entries).toHaveLength(1)
    expect(execution?.entries[0]?.summary).toBe('a.ts, b.ts +1 more')
    expect(validation?.entries).toHaveLength(1)
  })

  test('surfaces blocked approval timeout as next action', () => {
    const timeline = getRunTimeline({
      receipt: receipt({ resultStatus: 'approval_timeout' }),
    })

    expect(timeline.status).toBe('blocked')
    expect(timeline.stages.find((stage) => stage.kind === 'next_action')?.status).toBe('blocked')
  })

  test('can include empty stages and diagnostics for advanced surfaces', () => {
    const timeline = getRunTimeline(
      { steps: [] },
      { include: { emptyStages: true, diagnostics: true }, detail: 'diagnostic' }
    )

    expect(timeline.stages.map((stage) => stage.kind)).toEqual([
      'intent',
      'routing',
      'planning',
      'execution',
      'validation',
      'receipt',
      'next_action',
    ])
    expect(timeline.diagnostics?.rawStepCount).toBe(0)
  })
})
