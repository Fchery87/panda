import { describe, expect, test } from 'bun:test'

import { buildForgeHandoffSummary, buildRoleNextActions } from './handoff-summary'
import type { ForgeProjectSnapshot } from './types'

function createSnapshot(): ForgeProjectSnapshot {
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
      summary: {
        goal: 'Ship Forge workflow productization',
        currentPhaseSummary: 'Implementation is underway.',
        nextStepBrief: 'Move the active task into review.',
      },
      gates: {
        architecture_review: 'passed',
        implementation_review: 'pending',
        qa_review: 'pending',
        ship_review: 'pending',
      },
      openRiskCount: 2,
      unresolvedDefectCount: 1,
    },
    taskBoard: {
      activeTaskId: 'task_2',
      tasks: [
        {
          id: 'task_1',
          taskKey: 'forge-1',
          title: 'Finish plan acceptance',
          description: 'Accept the approved plan.',
          rationale: 'Execution cannot proceed without it.',
          ownerRole: 'executive',
          dependencies: [],
          filesInScope: ['convex/forge.ts'],
          routesInScope: ['/projects/[projectId]'],
          constraints: ['Keep changes additive'],
          acceptanceCriteria: [],
          testRequirements: [],
          reviewRequirements: [],
          qaRequirements: [],
          blockers: [],
          status: 'done',
          evidence: [],
          taskBoard: {
            readiness: 'done',
            isReady: true,
            blockedByTaskIds: [],
            priority: 3,
          },
          createdAt: 100,
          updatedAt: 110,
        },
        {
          id: 'task_2',
          taskKey: 'forge-2',
          title: 'Generate handoff views',
          description: 'Build canonical handoff summary data.',
          rationale: 'Operators need explicit summaries.',
          ownerRole: 'manager',
          dependencies: ['task_1'],
          filesInScope: ['apps/web/lib/forge/handoff-summary.ts'],
          routesInScope: ['/projects/[projectId]'],
          constraints: ['Derive from snapshot only'],
          acceptanceCriteria: [],
          testRequirements: ['Add focused helper tests'],
          reviewRequirements: ['Implementation review required'],
          qaRequirements: ['QA the project page summary'],
          blockers: [],
          status: 'in_progress',
          evidence: [],
          taskBoard: {
            readiness: 'ready',
            isReady: true,
            blockedByTaskIds: [],
            priority: 1,
          },
          createdAt: 120,
          updatedAt: 130,
        },
        {
          id: 'task_3',
          taskKey: 'forge-3',
          title: 'Run verification',
          description: 'Run the targeted suite.',
          rationale: 'Need proof before shipping.',
          ownerRole: 'builder',
          dependencies: ['task_2'],
          filesInScope: ['convex/forge.test.ts'],
          routesInScope: ['/projects/[projectId]'],
          constraints: ['Use targeted tests'],
          acceptanceCriteria: [],
          testRequirements: ['Run Forge helper tests'],
          reviewRequirements: [],
          qaRequirements: ['Confirm page view models render'],
          blockers: ['Waiting on manager handoff'],
          status: 'blocked',
          evidence: [],
          taskBoard: {
            readiness: 'blocked',
            isReady: false,
            blockedByTaskIds: ['task_2'],
            priority: 2,
          },
          createdAt: 140,
          updatedAt: 150,
        },
      ],
    },
    verification: {
      records: [],
      latestReview: {
        reviewType: 'implementation',
        decision: 'concerns',
        summary: 'Address summary formatting before approval.',
        checklistResults: [],
        requiredActionItems: ['Fix the summary formatting'],
        verificationEvidence: [],
        findings: [],
        followUpTaskSeeds: [],
        createdAt: 160,
      },
      latestQa: {
        decision: 'concerns',
        summary: 'QA found one unresolved display issue.',
        assertions: [],
        routesTested: ['/projects/[projectId]'],
        flowsTested: ['forge-handoff'],
        evidence: [],
        defects: [
          {
            severity: 'medium',
            title: 'State panel fallback text still visible',
            detail: 'The page should use backend summaries.',
          },
        ],
        createdAt: 170,
      },
      latestShip: {
        decision: 'not_ready',
        summary: 'Hold ship until review and QA concerns are cleared.',
        evidenceSummary: 'Review and QA still pending',
        criteriaResults: [],
        createdAt: 180,
      },
    },
    browserQa: {},
    decisions: [
      {
        id: 'decision_1',
        category: 'execution',
        summary: 'Use generated view models instead of page-level fallbacks.',
        relatedTaskIds: ['task_2'],
        relatedFilePaths: ['apps/web/app/(dashboard)/projects/[projectId]/page.tsx'],
        createdByRole: 'manager',
        createdAt: 155,
      },
    ],
    timeline: [],
  }
}

describe('buildForgeHandoffSummary', () => {
  test('generates a stable handoff summary from snapshot state', () => {
    const snapshot = createSnapshot()
    const summary = buildForgeHandoffSummary({ snapshot })

    expect(summary.activeTask?.id).toBe('task_2')
    expect(summary.openTaskCount).toBe(2)
    expect(summary.summaryLines).toEqual([
      'Goal: Ship Forge workflow productization',
      'Phase: execute',
      'Active role: manager',
      'Active task: Generate handoff views',
      'Next step: Move the active task into review.',
    ])
  })
})

describe('buildRoleNextActions', () => {
  test('derives explicit next actions for builder, manager, and executive roles', () => {
    const snapshot = createSnapshot()
    const actions = buildRoleNextActions({ snapshot })

    expect(actions.builder.items).toEqual(['Unblock "Run verification" after the manager handoff.'])
    expect(actions.manager.items).toEqual([
      'Advance "Generate handoff views" toward implementation review.',
      'Fix the summary formatting',
    ])
    expect(actions.executive.items).toEqual([
      'Do not approve ship while review and QA concerns remain unresolved.',
    ])
  })
})
