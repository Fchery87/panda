import { describe, expect, it, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'
import {
  buildProjectSnapshot,
  createDecisionLogRecord,
  createOrchestrationWaveRecord,
  getTaskStatusForReviewDecision,
  shouldCreateShipReportForQaDecision,
  type BrowserSessionRecord,
  type DecisionLogRecord,
  type ForgeProjectSnapshotRecord,
  type OrchestrationWaveRecord,
} from './forge'

function makeDecision(overrides: Partial<DecisionLogRecord> = {}): DecisionLogRecord {
  return createDecisionLogRecord({
    deliveryStateId: 'delivery_state_1' as never,
    category: 'architecture',
    summary: 'Use Convex as the canonical state store.',
    createdByRole: 'executive',
    now: 100,
    ...overrides,
  })
}

function makeWave(overrides: Partial<OrchestrationWaveRecord> = {}): OrchestrationWaveRecord {
  return createOrchestrationWaveRecord({
    deliveryStateId: 'delivery_state_1' as never,
    phase: 'execute',
    status: 'active',
    summary: 'Execute the first Forge batch.',
    taskIds: ['task_1' as never],
    contextResetRequired: false,
    now: 100,
    ...overrides,
  })
}

function makeSnapshotWave() {
  return {
    _id: 'wave_1' as never,
    _creationTime: 100,
    ...makeWave(),
  }
}

describe('forge source surface', () => {
  test('defines forge schema extensions and query surface', () => {
    const schemaSource = fs.readFileSync(path.resolve(import.meta.dir, 'schema.ts'), 'utf8')
    const forgeSource = fs.readFileSync(path.resolve(import.meta.dir, 'forge.ts'), 'utf8')

    expect(schemaSource).toContain('deliveryDecisions: defineTable({')
    expect(schemaSource).toContain('deliveryVerifications: defineTable({')
    expect(schemaSource).toContain('orchestrationWaves: defineTable({')
    expect(schemaSource).toContain('browserSessions: defineTable({')
    expect(forgeSource).toContain('export const getProjectSnapshot = query({')
    expect(forgeSource).toContain('export const getTaskContextPack = query({')
    expect(forgeSource).toContain('export const startIntake = mutation({')
    expect(forgeSource).toContain('export const acceptPlan = mutation({')
    expect(forgeSource).toContain('export const createTasksFromPlan = mutation({')
    expect(forgeSource).toContain('export const startTaskExecution = mutation({')
    expect(forgeSource).toContain('export const submitWorkerResult = mutation({')
    expect(forgeSource).toContain('export const recordReview = mutation({')
    expect(forgeSource).toContain('export const runQaForTask = mutation({')
    expect(forgeSource).toContain('export const recordShipDecision = mutation({')
    expect(forgeSource).toContain('export const listActivityTimeline = query({')
    expect(forgeSource).toContain(".query('planningSessions')")
    expect(forgeSource).toContain(".query('specifications')")
  })

  test('accepts rich QA evidence through the forge control plane', () => {
    const routeSource = fs.readFileSync(
      path.resolve(import.meta.dir, '../apps/web/app/api/qa/run/route.ts'),
      'utf8'
    )
    const schemaSource = fs.readFileSync(path.resolve(import.meta.dir, 'schema.ts'), 'utf8')
    const forgeSource = fs.readFileSync(path.resolve(import.meta.dir, 'forge.ts'), 'utf8')

    expect(schemaSource).toContain('artifacts: v.array(')
    expect(schemaSource).toContain('scenarioNames: v.array(v.string())')
    expect(forgeSource).toContain('scenarioNames: v.optional(v.array(v.string()))')
    expect(forgeSource).toContain('evidenceArtifacts: v.optional(')
    expect(forgeSource).toContain('defects: v.array(')
    expect(routeSource).toContain('scenarioNames: normalized.evidence.scenarioNames')
    expect(routeSource).toContain('evidenceArtifacts: normalized.evidence.artifacts')
  })

  test('accepts richer review artifacts and ship criteria through the forge control plane', () => {
    const typesSource = fs.readFileSync(
      path.resolve(import.meta.dir, '../apps/web/lib/forge/types.ts'),
      'utf8'
    )
    const schemaSource = fs.readFileSync(path.resolve(import.meta.dir, 'schema.ts'), 'utf8')
    const forgeSource = fs.readFileSync(path.resolve(import.meta.dir, 'forge.ts'), 'utf8')

    expect(typesSource).toContain('requiredActionItems')
    expect(typesSource).toContain('verificationEvidence')
    expect(typesSource).toContain('criteriaResults')
    expect(typesSource).toContain('ShipCriterionResult')

    expect(schemaSource).toContain('checklistResults: v.array(')
    expect(schemaSource).toContain('requiredActionItems: v.array(v.string())')
    expect(schemaSource).toContain('verificationEvidence: v.array(')
    expect(schemaSource).toContain('criteriaResults: v.array(')

    expect(forgeSource).toContain('requiredActionItems: v.optional(v.array(v.string()))')
    expect(forgeSource).toContain('verificationEvidence: v.optional(')
    expect(forgeSource).toContain('criteriaResults: v.array(')
  })

  test('exposes a task-scoped context pack helper surface', () => {
    const forgeSource = fs.readFileSync(path.resolve(import.meta.dir, 'forge.ts'), 'utf8')

    expect(forgeSource).toContain('export function buildTaskContextPack(')
    expect(forgeSource).toContain('recentChangesDigest')
    expect(forgeSource).toContain('excludedContext')
  })

  test('exposes handoff summaries and operator views through the snapshot', () => {
    const forgeSource = fs.readFileSync(path.resolve(import.meta.dir, 'forge.ts'), 'utf8')

    expect(forgeSource).toContain('buildForgeHandoffSummary')
    expect(forgeSource).toContain('buildRoleNextActions')
    expect(forgeSource).toContain('buildForgeStatusView')
    expect(forgeSource).toContain('buildForgeTaskView')
    expect(forgeSource).toContain('buildForgeVerificationView')
    expect(forgeSource).toContain('handoffSummary:')
    expect(forgeSource).toContain('roleNextActions:')
    expect(forgeSource).toContain('operatorViews:')
  })
})

describe('forge helpers', () => {
  it('creates decision and orchestration wave records', () => {
    const decision = makeDecision({
      relatedTaskIds: ['task_1' as never],
      relatedFilePaths: ['convex/forge.ts'],
    })
    const wave = makeWave()

    expect(decision.createdByRole).toBe('executive')
    expect(decision.relatedFilePaths).toContain('convex/forge.ts')
    expect(wave.phase).toBe('execute')
    expect(wave.taskIds).toEqual(['task_1'])
  })

  it('builds a canonical snapshot from delivery control-plane records', () => {
    const browserSession: BrowserSessionRecord = {
      deliveryStateId: 'delivery_state_1' as never,
      projectId: 'project_1' as never,
      environment: 'local',
      status: 'ready',
      browserSessionKey: 'browser-session::project_1::local',
      baseUrl: 'http://localhost:3000',
      storageStatePath: '/tmp/auth.json',
      lastUsedAt: 200,
      lastVerifiedAt: 190,
      lastRoutesTested: ['/projects/[projectId]'],
      leaseOwner: 'qa-worker',
      leaseExpiresAt: 240,
      createdAt: 150,
      updatedAt: 200,
    }

    const snapshot = buildProjectSnapshot({
      project: {
        _id: 'project_1' as never,
        name: 'Panda',
        description: 'AI coding workbench',
      },
      deliveryState: {
        _id: 'delivery_state_1' as never,
        currentPhase: 'execute',
        status: 'active',
        activeRole: 'manager',
        summary: {
          goal: 'Retrofit Panda into Forge',
          currentPhaseSummary: 'Execution in progress',
          nextStepBrief: 'Implement the canonical snapshot',
        },
        reviewGateStatus: 'pending',
        qaGateStatus: 'not_required',
        shipGateStatus: 'not_required',
        openRiskCount: 1,
        unresolvedDefectCount: 0,
      },
      activeWave: makeSnapshotWave(),
      tasks: [
        {
          _id: 'task_1' as never,
          _creationTime: 100,
          deliveryStateId: 'delivery_state_1' as never,
          taskKey: 'task-1',
          title: 'Implement snapshot query',
          description: 'Build a workbench-ready snapshot.',
          rationale: 'One source of truth is required.',
          ownerRole: 'manager',
          dependencies: [],
          filesInScope: ['convex/forge.ts'],
          routesInScope: ['/projects/[projectId]'],
          constraints: ['Keep migrations additive'],
          acceptanceCriteria: [
            {
              id: 'ac-1',
              text: 'Snapshot includes gate state.',
              status: 'pending',
              verificationMethod: 'integration',
            },
          ],
          testRequirements: ['Add a snapshot query test'],
          reviewRequirements: ['Executive review'],
          qaRequirements: ['QA the project route'],
          blockers: [],
          status: 'in_progress',
          evidence: [],
          createdAt: 100,
          updatedAt: 120,
        },
      ],
      latestReview: null,
      latestQa: null,
      latestShipReport: null,
      activePlanningSession: {
        _id: 'planning_1' as never,
        _creationTime: 90,
        chatId: 'chat_1' as never,
        sessionId: 'planning_session_1',
        status: 'ready_for_review',
        questions: [],
        answers: [],
        generatedPlan: undefined,
        startedAt: 90,
        updatedAt: 100,
      },
      approvedPlan: {
        sessionId: 'planning_session_accepted',
        title: 'Forge retrofit plan',
        summary: 'Implement the Forge control plane.',
        status: 'accepted',
        generatedAt: 95,
      },
      latestSpecification: {
        _id: 'spec_1' as never,
        _creationTime: 100,
        projectId: 'project_1' as never,
        chatId: 'chat_1' as never,
        runId: 'run_1' as never,
        version: 2,
        tier: 'ambient',
        status: 'verified',
        intent: {
          goal: 'Retrofit Panda into Forge',
          rawMessage: 'Implement Forge snapshot support',
          constraints: [],
          acceptanceCriteria: [],
        },
        plan: {
          steps: [],
          dependencies: [],
          risks: [],
          estimatedTools: [],
        },
        validation: {
          preConditions: [],
          postConditions: [],
          invariants: [],
        },
        provenance: {
          model: 'gpt-5',
          promptHash: 'hash_1',
          timestamp: 100,
          parentSpecId: undefined,
        },
        verificationResults: [],
        createdAt: 100,
        updatedAt: 120,
      },
      decisions: [
        {
          _id: 'decision_1' as never,
          _creationTime: 100,
          ...makeDecision(),
        },
      ],
      verifications: [],
      browserSession: {
        _id: 'browser_1' as never,
        _creationTime: 150,
        ...browserSession,
      },
      timeline: [],
    })

    expect(snapshot.project.name).toBe('Panda')
    expect(snapshot.state.phase).toBe('execute')
    expect(snapshot.state.activeWave?.status).toBe('active')
    expect(snapshot.browserQa.activeSession?.browserSessionKey).toContain('browser-session::')
    expect(snapshot.planning.approvedPlan?.title).toBe('Forge retrofit plan')
    expect(snapshot.specification?.status).toBe('verified')
    expect(snapshot.decisions).toHaveLength(1)
    expect(snapshot.taskBoard.tasks[0]?.title).toBe('Implement snapshot query')
    expect(snapshot.taskBoard.activeTaskId).toBe('task_1')
    expect(snapshot.taskBoard.tasks[0]?.taskBoard.readiness).toBe('ready')
    expect(snapshot.taskBoard.tasks[0]?.taskBoard.isReady).toBe(true)
    expect(snapshot.handoffSummary.activeTask?.id).toBe('task_1')
    expect(snapshot.roleNextActions.manager.items[0]).toContain('Implement snapshot query')
    expect(snapshot.operatorViews.status.summaryLines[0]).toContain('Phase execute is active')
  })

  it('advances task status based on the review decision', () => {
    expect(getTaskStatusForReviewDecision('pass')).toBe('qa_pending')
    expect(getTaskStatusForReviewDecision('concerns')).toBe('blocked')
    expect(getTaskStatusForReviewDecision('reject')).toBe('rejected')
  })

  it('only creates ship approvals after a passing QA decision', () => {
    expect(shouldCreateShipReportForQaDecision('pass')).toBe(true)
    expect(shouldCreateShipReportForQaDecision('concerns')).toBe(false)
    expect(shouldCreateShipReportForQaDecision('fail')).toBe(false)
  })
})
