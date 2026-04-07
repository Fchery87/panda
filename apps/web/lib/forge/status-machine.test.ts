import { describe, expect, test } from 'bun:test'
import {
  assertTaskReadyForTransition,
  canTransitionForgePhase,
  canTransitionForgeTask,
  FORGE_PHASE_TRANSITIONS,
  FORGE_TASK_TRANSITIONS,
} from './status-machine'
import type { ForgeTaskRecord } from './types'

function buildTask(overrides: Partial<ForgeTaskRecord> = {}): ForgeTaskRecord {
  return {
    id: 'task_1',
    taskKey: 'task-1',
    title: 'Implement forge task',
    description: 'Build a task transition test fixture.',
    rationale: 'Validates the status machine.',
    ownerRole: 'manager',
    dependencies: [],
    filesInScope: ['convex/forge.ts'],
    routesInScope: ['/projects/[projectId]'],
    constraints: ['Keep migrations additive'],
    acceptanceCriteria: [
      {
        id: 'ac-1',
        text: 'Fixture acceptance criterion.',
        status: 'pending',
        verificationMethod: 'review',
      },
    ],
    testRequirements: ['Run targeted tests'],
    reviewRequirements: ['Executive review'],
    qaRequirements: ['Project route QA'],
    blockers: [],
    status: 'planned',
    evidence: [],
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  }
}

describe('forge status machine', () => {
  test('allows documented task transitions', () => {
    expect(canTransitionForgeTask('draft', 'planned')).toBe(true)
    expect(canTransitionForgeTask('planned', 'ready')).toBe(true)
    expect(canTransitionForgeTask('ready', 'in_progress')).toBe(true)
    expect(canTransitionForgeTask('in_progress', 'blocked')).toBe(true)
    expect(canTransitionForgeTask('in_progress', 'in_review')).toBe(true)
    expect(canTransitionForgeTask('in_review', 'qa_pending')).toBe(true)
    expect(canTransitionForgeTask('qa_pending', 'done')).toBe(true)
    expect(canTransitionForgeTask('rejected', 'ready')).toBe(true)
  })

  test('rejects undocumented task transitions', () => {
    expect(canTransitionForgeTask('draft', 'done')).toBe(false)
    expect(canTransitionForgeTask('ready', 'qa_pending')).toBe(false)
    expect(canTransitionForgeTask('done', 'in_progress')).toBe(false)
    expect(canTransitionForgeTask('blocked', 'done')).toBe(false)
  })

  test('allows documented phase transitions', () => {
    expect(canTransitionForgePhase('intake', 'plan')).toBe(true)
    expect(canTransitionForgePhase('plan', 'execute')).toBe(true)
    expect(canTransitionForgePhase('execute', 'review')).toBe(true)
    expect(canTransitionForgePhase('review', 'qa')).toBe(true)
    expect(canTransitionForgePhase('qa', 'ship')).toBe(true)
    expect(canTransitionForgePhase('ship', 'execute')).toBe(true)
  })

  test('rejects undocumented phase transitions', () => {
    expect(canTransitionForgePhase('intake', 'review')).toBe(false)
    expect(canTransitionForgePhase('plan', 'ship')).toBe(false)
    expect(canTransitionForgePhase('ship', 'plan')).toBe(false)
  })

  test('requires required fields before entering ready', () => {
    const task = buildTask({
      acceptanceCriteria: [],
      testRequirements: [],
      reviewRequirements: [],
      qaRequirements: [],
    })

    expect(() => assertTaskReadyForTransition(task, 'ready')).toThrow(/acceptance criteria/i)
  })

  test('requires evidence before entering review', () => {
    const task = buildTask({
      status: 'in_progress',
    })

    expect(() => assertTaskReadyForTransition(task, 'in_review')).toThrow(/evidence/i)
  })

  test('requires implementation review before entering qa pending', () => {
    const task = buildTask({
      status: 'in_review',
      evidence: [{ kind: 'worker_result', label: 'Builder result', ref: 'worker:1' }],
      latestReview: null,
    })

    expect(() => assertTaskReadyForTransition(task, 'qa_pending')).toThrow(/implementation review/i)
  })

  test('requires qa pass or waiver before entering done', () => {
    const task = buildTask({
      status: 'qa_pending',
      evidence: [{ kind: 'qa_report', label: 'QA report', ref: 'qa:1' }],
      latestReview: {
        reviewType: 'implementation',
        decision: 'pass',
        summary: 'Implementation approved.',
        checklistResults: [],
        findings: [],
        followUpTaskSeeds: [],
        createdAt: 10,
      },
      latestQa: {
        decision: 'concerns',
        summary: 'Issues found.',
        assertions: [],
        routesTested: [],
        flowsTested: [],
        evidence: [],
        defects: [],
        createdAt: 11,
      },
    })

    expect(() => assertTaskReadyForTransition(task, 'done')).toThrow(/qa pass or waiver/i)
  })

  test('exports explicit transition maps for server-side enforcement', () => {
    expect(FORGE_TASK_TRANSITIONS.in_review).toContain('qa_pending')
    expect(FORGE_PHASE_TRANSITIONS.ship).toContain('execute')
  })
})
