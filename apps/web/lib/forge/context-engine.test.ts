import { describe, expect, test } from 'bun:test'
import {
  buildExcludedContext,
  buildNextStepBrief,
  buildRecentChangesDigest,
  buildWorkerContextPack,
} from './context-engine'
import type { DecisionLogEntry, ForgeAcceptanceCriterion, ForgeProjectSnapshot } from './types'

function makeSnapshot(): ForgeProjectSnapshot {
  return {
    project: {
      id: 'project_1',
      name: 'Panda',
      description: 'AI coding workbench',
    },
    state: {
      id: 'delivery_state_1',
      phase: 'execute',
      status: 'active',
      activeRole: 'manager',
      activeWave: {
        id: 'wave_1',
        phase: 'execute',
        status: 'active',
        summary: 'Ship the Forge context engine.',
        taskIds: ['task_1'],
        contextResetRequired: false,
        createdAt: 100,
        updatedAt: 100,
      },
      summary: {
        goal: 'Productize Panda Forge workflow execution.',
        currentPhaseSummary: 'Task 1 is in flight.',
        nextStepBrief: 'Thread the approved context pack into execution.',
      },
      gates: {
        architecture_review: 'passed',
        implementation_review: 'pending',
        qa_review: 'not_required',
        ship_review: 'not_required',
      },
      openRiskCount: 1,
      unresolvedDefectCount: 0,
    },
    taskBoard: {
      activeTaskId: 'task_1',
      tasks: [
        {
          id: 'task_1',
          taskKey: 'task-1',
          title: 'Build ContextEngine',
          description: 'Create a deterministic task-scoped context pack builder.',
          rationale: 'Worker runs need stable scoped context.',
          ownerRole: 'builder',
          dependencies: [],
          filesInScope: ['apps/web/lib/forge/context-engine.ts', 'convex/forge.ts'],
          routesInScope: ['/projects/[projectId]'],
          constraints: ['Keep Convex as source of truth', 'No filesystem state'],
          acceptanceCriteria: [
            {
              id: 'ac-1',
              text: 'Context pack is deterministic and task-scoped.',
              status: 'pending',
              verificationMethod: 'unit',
            },
          ],
          testRequirements: ['Add context-engine unit tests'],
          reviewRequirements: ['Manager validates scope exclusion'],
          qaRequirements: ['Verify active route context stays intact'],
          blockers: [],
          status: 'in_progress',
          evidence: [
            {
              kind: 'worker_result',
              label: 'Builder started implementation',
              ref: 'artifact:worker:start',
            },
          ],
          createdAt: 100,
          updatedAt: 220,
        },
        {
          id: 'task_2',
          taskKey: 'task-2',
          title: 'Centralize gates',
          description: 'Move workflow gate checks into Convex.',
          rationale: 'Server remains authoritative.',
          ownerRole: 'manager',
          dependencies: ['task_1'],
          filesInScope: ['convex/forge.ts', 'convex/lib/forge-gatekeeper.ts'],
          routesInScope: ['/projects/[projectId]'],
          constraints: ['No duplicated gate logic'],
          acceptanceCriteria: [],
          testRequirements: ['Add gatekeeper tests'],
          reviewRequirements: ['Executive signs off'],
          qaRequirements: ['Regression pass on delivery board'],
          blockers: [],
          status: 'planned',
          evidence: [],
          createdAt: 90,
          updatedAt: 90,
        },
      ],
    },
    verification: {
      records: [
        {
          id: 'verification_1',
          taskId: 'task_1',
          kind: 'test',
          label: 'context-engine test red',
          status: 'failed',
          evidenceRefs: ['artifact:test:red'],
          createdAt: 210,
          updatedAt: 210,
        },
        {
          id: 'verification_2',
          taskId: 'task_2',
          kind: 'test',
          label: 'gatekeeper tests pending',
          status: 'pending',
          evidenceRefs: [],
          createdAt: 80,
          updatedAt: 80,
        },
      ],
      latestReview: {
        reviewType: 'implementation',
        decision: 'concerns',
        summary: 'Need a deterministic context digest.',
        checklistResults: [],
        findings: [
          {
            severity: 'medium',
            title: 'Digest missing',
            detail: 'Recent changes are not summarized yet.',
            filePath: 'apps/web/lib/forge/context-engine.ts',
          },
        ],
        followUpTaskSeeds: [],
        createdAt: 205,
      },
      latestQa: null,
    },
    browserQa: {
      activeSession: {
        id: 'browser_session_1',
        projectId: 'project_1',
        environment: 'local',
        status: 'ready',
        browserSessionKey: 'browser-session::project_1::local',
        baseUrl: 'http://localhost:3000',
        lastUsedAt: 180,
        lastVerifiedAt: 170,
        lastRoutesTested: ['/projects/[projectId]'],
        createdAt: 160,
        updatedAt: 180,
      },
      latestQa: null,
    },
    decisions: [
      {
        id: 'decision_1',
        category: 'architecture',
        summary: 'Keep Convex as the canonical source of truth.',
        detail: 'Do not persist Forge workflow context in files.',
        relatedTaskIds: ['task_1'],
        relatedFilePaths: ['convex/forge.ts', 'apps/web/lib/forge/context-engine.ts'],
        createdByRole: 'executive',
        createdAt: 200,
      },
      {
        id: 'decision_2',
        category: 'execution',
        summary: 'Task 1 must stay additive and avoid prompt redesign.',
        detail: 'Runtime only needs to accept structured context.',
        relatedTaskIds: ['task_1'],
        relatedFilePaths: ['apps/web/lib/agent/harness/runtime.ts'],
        createdByRole: 'manager',
        createdAt: 215,
      },
      {
        id: 'decision_3',
        category: 'risk',
        summary: 'Task 2 gatekeeper work is out of scope for this run.',
        relatedTaskIds: ['task_2'],
        relatedFilePaths: ['convex/lib/forge-gatekeeper.ts'],
        createdByRole: 'manager',
        createdAt: 190,
      },
    ],
    timeline: [
      {
        kind: 'decision',
        createdAt: 200,
        summary: 'Keep Convex as the canonical source of truth.',
      },
      {
        kind: 'review',
        createdAt: 205,
        summary: 'Need a deterministic context digest.',
      },
      {
        kind: 'verification',
        createdAt: 210,
        summary: 'context-engine test red',
      },
      {
        kind: 'decision',
        createdAt: 215,
        summary: 'Task 1 must stay additive and avoid prompt redesign.',
      },
    ],
  }
}

describe('forge context engine', () => {
  test('builds a deterministic task-scoped context pack from a project snapshot', () => {
    const snapshot = makeSnapshot()
    const first = buildWorkerContextPack({
      snapshot,
      taskId: 'task_1',
      role: 'builder',
    })
    const second = buildWorkerContextPack({
      snapshot,
      taskId: 'task_1',
      role: 'builder',
    })

    expect(first).toEqual(second)
    expect(first.objective).toBe('Build ContextEngine')
    expect(first.summary).toBe('Create a deterministic task-scoped context pack builder.')
    expect(first.filesInScope).toEqual(['apps/web/lib/forge/context-engine.ts', 'convex/forge.ts'])
    expect(first.routesInScope).toEqual(['/projects/[projectId]'])
    expect(first.constraints).toEqual(['Keep Convex as source of truth', 'No filesystem state'])
    expect(
      first.acceptanceCriteria.map((criterion: ForgeAcceptanceCriterion) => criterion.text)
    ).toEqual(['Context pack is deterministic and task-scoped.'])
    expect(first.testRequirements).toEqual(['Add context-engine unit tests'])
    expect(first.reviewRequirements).toEqual(['Manager validates scope exclusion'])
    expect(first.qaRequirements).toEqual(['Verify active route context stays intact'])
    expect(first.decisions.map((entry: DecisionLogEntry) => entry.id)).toEqual([
      'decision_1',
      'decision_2',
    ])
    expect(first.excludedContext).toEqual([
      'Task task-2: Centralize gates',
      'Decision decision_3: Task 2 gatekeeper work is out of scope for this run.',
    ])
  })

  test('derives recent change digest and next-step brief from task-scoped snapshot data', () => {
    const snapshot = makeSnapshot()

    expect(buildRecentChangesDigest({ snapshot, taskId: 'task_1' })).toBe(
      'Recent task changes: Task 1 must stay additive and avoid prompt redesign. context-engine test red. Need a deterministic context digest.'
    )
    expect(buildNextStepBrief({ snapshot, taskId: 'task_1' })).toBe(
      'Next: Thread the approved context pack into execution.'
    )
  })

  test('describes excluded unrelated task and decision context separately', () => {
    const snapshot = makeSnapshot()

    expect(buildExcludedContext({ snapshot, taskId: 'task_1' })).toEqual([
      'Task task-2: Centralize gates',
      'Decision decision_3: Task 2 gatekeeper work is out of scope for this run.',
    ])
  })
})
