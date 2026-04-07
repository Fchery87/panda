import { describe, expect, test } from 'bun:test'
import {
  type BrowserSessionRecord,
  type DecisionLogEntry,
  type ForgeGateStatus,
  type ForgeGateType,
  type ForgePhase,
  type ForgeProjectSnapshot,
  type ForgeRole,
  type ForgeTaskRecord,
  type ForgeTaskStatus,
  type OrchestrationWave,
  type QaResult,
  type ReviewResult,
  type VerificationRecord,
  type WorkerContextPack,
  type WorkerResult,
} from './types'

describe('forge contracts', () => {
  test('exports canonical forge unions', () => {
    const phase: ForgePhase = 'ship'
    const role: ForgeRole = 'executive'
    const taskStatus: ForgeTaskStatus = 'qa_pending'
    const gateType: ForgeGateType = 'ship_review'
    const gateStatus: ForgeGateStatus = 'waived'

    expect(phase).toBe('ship')
    expect(role).toBe('executive')
    expect(taskStatus).toBe('qa_pending')
    expect(gateType).toBe('ship_review')
    expect(gateStatus).toBe('waived')
  })

  test('defines canonical forge workflow entities', () => {
    const task: ForgeTaskRecord = {
      id: 'task_1',
      taskKey: 'forge-task-1',
      title: 'Implement snapshot query',
      description: 'Build the canonical project snapshot.',
      rationale: 'The workbench needs a single source of truth.',
      ownerRole: 'manager',
      dependencies: [],
      filesInScope: ['convex/forge.ts'],
      routesInScope: ['/projects/[projectId]'],
      constraints: ['Keep migrations additive'],
      acceptanceCriteria: [
        {
          id: 'ac-1',
          text: 'Snapshot query returns current phase and active role.',
          status: 'pending',
          verificationMethod: 'integration',
        },
      ],
      testRequirements: ['Add a snapshot query test'],
      reviewRequirements: ['Executive reviews data shape'],
      qaRequirements: ['Validate project route data rendering'],
      blockers: [],
      status: 'ready',
      evidence: [],
      createdAt: 1,
      updatedAt: 1,
    }

    const browserSession: BrowserSessionRecord = {
      id: 'browser_session_1',
      projectId: 'project_1',
      environment: 'local',
      status: 'ready',
      browserSessionKey: 'browser-session::project_1::local',
      baseUrl: 'http://localhost:3000',
      storageStatePath: '/tmp/project-1-auth.json',
      lastUsedAt: 10,
      lastVerifiedAt: 9,
      lastRoutesTested: ['/projects/[projectId]'],
      leaseOwner: 'qa-worker',
      leaseExpiresAt: 20,
      createdAt: 1,
      updatedAt: 10,
    }

    const review: ReviewResult = {
      reviewType: 'implementation',
      decision: 'pass',
      summary: 'Implementation follows the approved contract.',
      checklistResults: [
        {
          item: 'Task evidence attached',
          status: 'passed',
        },
      ],
      findings: [],
      followUpTaskSeeds: [],
      createdAt: 10,
    }

    const qa: QaResult = {
      decision: 'pass',
      summary: 'Browser QA passed for the project route.',
      assertions: [
        {
          label: 'Project snapshot rendered',
          status: 'passed',
        },
      ],
      routesTested: ['/projects/[projectId]'],
      flowsTested: ['project-snapshot'],
      evidence: [
        {
          kind: 'screenshot',
          label: 'Project route screenshot',
          href: '/tmp/project-route.png',
        },
      ],
      defects: [],
      browserSessionKey: browserSession.browserSessionKey,
      createdAt: 11,
    }

    const verification: VerificationRecord = {
      id: 'verification_1',
      taskId: task.id,
      kind: 'test',
      label: 'Snapshot query test',
      status: 'passed',
      evidenceRefs: ['artifact:test:snapshot-query'],
      createdAt: 12,
      updatedAt: 12,
    }

    const decision: DecisionLogEntry = {
      id: 'decision_1',
      category: 'architecture',
      summary: 'Use Convex as the canonical Forge state store.',
      detail: 'Avoid dual state with markdown memory files.',
      relatedTaskIds: [task.id],
      relatedFilePaths: ['convex/forge.ts'],
      createdByRole: 'executive',
      createdAt: 13,
    }

    const wave: OrchestrationWave = {
      id: 'wave_1',
      phase: 'execute',
      status: 'active',
      summary: 'Executing the first batch of Forge control-plane work.',
      taskIds: [task.id],
      contextResetRequired: false,
      createdAt: 14,
      updatedAt: 15,
    }

    const workerContext: WorkerContextPack = {
      projectId: 'project_1',
      deliveryStateId: 'delivery_state_1',
      taskId: task.id,
      role: 'builder',
      objective: task.title,
      summary: task.description,
      filesInScope: task.filesInScope,
      routesInScope: task.routesInScope,
      constraints: task.constraints,
      acceptanceCriteria: task.acceptanceCriteria,
      testRequirements: task.testRequirements,
      reviewRequirements: task.reviewRequirements,
      qaRequirements: task.qaRequirements,
      decisions: [decision],
      recentChangesDigest: 'No recent changes yet.',
      nextStepBrief: 'Write the failing tests first.',
      excludedContext: ['Unrelated dashboard features'],
    }

    const workerResult: WorkerResult = {
      outcome: 'completed',
      summary: 'Snapshot query contracts are implemented.',
      filesTouched: ['convex/forge.ts'],
      testsWritten: ['convex/forge.test.ts'],
      testsRun: [
        {
          command: 'bun test convex/forge.test.ts',
          status: 'passed',
        },
      ],
      evidenceRefs: ['artifact:test:snapshot-query'],
      unresolvedRisks: [],
      followUpActions: [],
      suggestedTaskStatus: 'in_review',
    }

    const snapshot: ForgeProjectSnapshot = {
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
        activeWave: wave,
        summary: {
          goal: 'Retrofit Panda into Forge',
          currentPhaseSummary: 'Execution in progress',
          nextStepBrief: 'Route work through the canonical snapshot',
        },
        gates: {
          architecture_review: 'passed',
          implementation_review: 'pending',
          qa_review: 'pending',
          ship_review: 'not_required',
        },
        openRiskCount: 0,
        unresolvedDefectCount: 0,
      },
      taskBoard: {
        activeTaskId: task.id,
        tasks: [task],
      },
      verification: {
        records: [verification],
        latestReview: review,
        latestQa: qa,
      },
      browserQa: {
        activeSession: browserSession,
        latestQa: qa,
      },
      decisions: [decision],
      timeline: [],
    }

    expect(snapshot.state.activeWave).toEqual(wave)
    expect(workerContext.role).toBe('builder')
    expect(workerResult.suggestedTaskStatus).toBe('in_review')
    expect(snapshot.taskBoard.tasks[0]?.status).toBe('ready')
    expect(snapshot.verification.latestQa?.browserSessionKey).toBe(browserSession.browserSessionKey)
  })
})
