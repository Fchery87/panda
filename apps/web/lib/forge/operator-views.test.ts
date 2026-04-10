import { describe, expect, test } from 'bun:test'

import {
  buildForgeStatusView,
  buildForgeTaskView,
  buildForgeVerificationView,
} from './operator-views'
import type { ForgeProjectSnapshot } from './types'

function createSnapshot(): ForgeProjectSnapshot {
  return {
    project: {
      id: 'project_1',
      name: 'Panda',
    },
    state: {
      id: 'delivery_state_1',
      phase: 'review',
      status: 'active',
      activeRole: 'manager',
      summary: {
        goal: 'Ship explicit Forge operator views',
        currentPhaseSummary: 'Review is pending on the active task.',
        nextStepBrief: 'Resolve implementation review concerns.',
      },
      gates: {
        architecture_review: 'passed',
        implementation_review: 'pending',
        qa_review: 'pending',
        ship_review: 'pending',
      },
      openRiskCount: 1,
      unresolvedDefectCount: 2,
    },
    taskBoard: {
      activeTaskId: 'task_review',
      tasks: [
        {
          id: 'task_review',
          taskKey: 'forge-6',
          title: 'Publish operator views',
          description: 'Expose operator view models in the snapshot.',
          rationale: 'The page should consume canonical summary data.',
          ownerRole: 'manager',
          dependencies: [],
          filesInScope: ['convex/forge.ts'],
          routesInScope: ['/projects/[projectId]'],
          constraints: ['No ad hoc UI fallback text'],
          acceptanceCriteria: [],
          testRequirements: [],
          reviewRequirements: ['Implementation review'],
          qaRequirements: ['QA state panel data flow'],
          blockers: [],
          status: 'in_review',
          evidence: [],
          taskBoard: {
            readiness: 'ready',
            isReady: true,
            blockedByTaskIds: [],
            priority: 1,
          },
          createdAt: 100,
          updatedAt: 130,
        },
        {
          id: 'task_qa',
          taskKey: 'forge-7',
          title: 'Verify project page view wiring',
          description: 'Confirm the page reads backend summaries.',
          rationale: 'Need QA proof for ship readiness.',
          ownerRole: 'builder',
          dependencies: ['task_review'],
          filesInScope: ['apps/web/app/(dashboard)/projects/[projectId]/page.tsx'],
          routesInScope: ['/projects/[projectId]'],
          constraints: ['Use derived data only'],
          acceptanceCriteria: [],
          testRequirements: [],
          reviewRequirements: [],
          qaRequirements: ['Run page control-plane test'],
          blockers: ['Waiting on implementation review'],
          status: 'qa_pending',
          evidence: [],
          taskBoard: {
            readiness: 'blocked',
            isReady: false,
            blockedByTaskIds: ['task_review'],
            priority: 2,
          },
          createdAt: 110,
          updatedAt: 140,
        },
      ],
    },
    verification: {
      records: [],
      latestReview: {
        reviewType: 'implementation',
        decision: 'concerns',
        summary: 'Need one more pass on the operator summary formatting.',
        checklistResults: [],
        requiredActionItems: ['Resolve formatting concern'],
        verificationEvidence: [],
        findings: [],
        followUpTaskSeeds: [],
        createdAt: 150,
      },
      latestQa: {
        decision: 'fail',
        summary: 'QA failed because the old fallback text is still rendered.',
        assertions: [],
        routesTested: ['/projects/[projectId]'],
        flowsTested: ['forge-operator-views'],
        evidence: [],
        defects: [
          {
            severity: 'high',
            title: 'Fallback ship summary still visible',
            detail: 'The state panel still derives fallback text locally.',
          },
        ],
        createdAt: 160,
      },
      latestShip: {
        decision: 'not_ready',
        summary: 'Ship is blocked by implementation review and QA.',
        evidenceSummary: 'Review and QA both blocked',
        criteriaResults: [],
        createdAt: 170,
      },
    },
    browserQa: {},
    decisions: [],
    timeline: [],
  }
}

describe('operator views', () => {
  test('builds a stable status view summary', () => {
    const view = buildForgeStatusView({ snapshot: createSnapshot() })

    expect(view.primarySummary).toBe('Ship is blocked by implementation review and QA.')
    expect(view.summaryLines).toEqual([
      'Phase review is active for manager.',
      'Open risks: 1.',
      'Unresolved defects: 2.',
      'Next step: Ship is blocked by implementation review and QA.',
    ])
  })

  test('builds open-task and pending-review summaries', () => {
    const view = buildForgeTaskView({ snapshot: createSnapshot() })

    expect(view.openTasks.map((task) => task.id)).toEqual(['task_review', 'task_qa'])
    expect(view.pendingReviews.map((task) => task.id)).toEqual(['task_review'])
    expect(view.qaBlockers).toEqual(['Verify project page view wiring'])
    expect(view.shipBlockers).toEqual([
      'Implementation review gate is pending.',
      'Latest QA decision is fail.',
    ])
  })

  test('builds verification summaries for predictable UI rendering', () => {
    const view = buildForgeVerificationView({ snapshot: createSnapshot() })

    expect(view.reviewDecision).toBe('concerns')
    expect(view.qaDecision).toBe('fail')
    expect(view.shipDecision).toBe('not_ready')
    expect(view.summaryLines).toEqual([
      'Latest review decision: concerns.',
      'Latest QA decision: fail.',
      'Latest ship decision: not_ready.',
    ])
  })
})
