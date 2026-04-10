import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import { v } from 'convex/values'
import { requireChatOwner, requireProjectOwner } from './lib/authz'
import { createDeliveryStateRecord, type DeliveryStateRecord } from './deliveryStates'
import { createDeliveryTaskRecord } from './deliveryTasks'
import { createReviewReportRecord } from './reviewReports'
import { createQaReportRecord } from './qaReports'
import { createShipReportRecord } from './shipReports'
import {
  BrowserSessionStatus,
  DecisionCategory,
  DeliveryPhase,
  DeliveryRole,
  DeliveryTaskStatus,
  GateStatus,
  OrchestrationWaveStatus,
  QaDecision,
  ReviewChecklistResult,
  ReviewDecision,
  ReviewType,
  ShipDecision,
  ShipCriterionResult,
  VerificationKind,
  VerificationEvidenceRef,
  VerificationStatus,
} from './schema'
import {
  assertForgePhaseTransition,
  assertForgeQaGate,
  assertForgeReviewGate,
  assertForgeShipGate,
  assertForgeTaskTransition,
} from './lib/forge_gatekeeper'
import { buildTaskBoardView, type ForgeTaskBoardMetadata } from './lib/forge_task_board'
import {
  buildForgeHandoffSummary,
  buildRoleNextActions,
} from '../apps/web/lib/forge/handoff-summary'
import {
  buildForgeStatusView,
  buildForgeTaskView,
  buildForgeVerificationView,
} from '../apps/web/lib/forge/operator-views'

export type DecisionLogRecord = {
  deliveryStateId: Id<'deliveryStates'>
  category: 'architecture' | 'execution' | 'risk' | 'qa' | 'ship'
  summary: string
  detail?: string
  relatedTaskIds: Id<'deliveryTasks'>[]
  relatedFilePaths: string[]
  createdByRole: 'builder' | 'manager' | 'executive'
  createdAt: number
}

export type VerificationRecord = {
  deliveryStateId: Id<'deliveryStates'>
  taskId?: Id<'deliveryTasks'>
  kind: 'test' | 'review' | 'qa' | 'ship' | 'manual'
  label: string
  status: 'pending' | 'passed' | 'failed' | 'waived'
  evidenceRefs: string[]
  createdAt: number
  updatedAt: number
}

export type OrchestrationWaveRecord = {
  deliveryStateId: Id<'deliveryStates'>
  phase: 'intake' | 'plan' | 'execute' | 'review' | 'qa' | 'ship'
  status: 'planned' | 'active' | 'completed' | 'failed'
  summary: string
  taskIds: Id<'deliveryTasks'>[]
  contextResetRequired: boolean
  createdAt: number
  updatedAt: number
}

export type BrowserSessionRecord = {
  deliveryStateId: Id<'deliveryStates'>
  projectId: Id<'projects'>
  environment: string
  status: 'ready' | 'stale' | 'leased' | 'failed'
  browserSessionKey: string
  baseUrl: string
  storageStatePath?: string
  lastUsedAt: number
  lastVerifiedAt?: number
  lastRoutesTested: string[]
  leaseOwner?: string
  leaseExpiresAt?: number
  createdAt: number
  updatedAt: number
}

type SnapshotTaskRecord = Doc<'deliveryTasks'>
type SnapshotTaskBoardRecord = SnapshotTaskRecord & { taskBoard: ForgeTaskBoardMetadata }

export type ForgeProjectSnapshotRecord = {
  project: {
    id: Id<'projects'>
    name: string
    description?: string
  }
  state: {
    id: Id<'deliveryStates'>
    phase: DeliveryStateRecord['currentPhase']
    status: DeliveryStateRecord['status']
    activeRole: DeliveryStateRecord['activeRole']
    activeWave: (Doc<'orchestrationWaves'> & { _id: Id<'orchestrationWaves'> }) | null
    summary: DeliveryStateRecord['summary']
    gates: {
      architecture_review: Doc<'deliveryStates'>['reviewGateStatus']
      implementation_review: Doc<'deliveryStates'>['reviewGateStatus']
      qa_review: Doc<'deliveryStates'>['qaGateStatus']
      ship_review: Doc<'deliveryStates'>['shipGateStatus']
    }
    openRiskCount: number
    unresolvedDefectCount: number
  }
  taskBoard: {
    activeTaskId?: Id<'deliveryTasks'>
    tasks: SnapshotTaskBoardRecord[]
  }
  planning: {
    activeSession:
      | (Doc<'planningSessions'> & { _id: Id<'planningSessions'>; sessionId: string })
      | null
    approvedPlan: {
      sessionId: string
      title: string
      summary: string
      status: string
      generatedAt: number
    } | null
  }
  specification: {
    id: Id<'specifications'>
    version: number
    tier: Doc<'specifications'>['tier']
    status: Doc<'specifications'>['status']
    goal: string
    runId?: Id<'agentRuns'>
    updatedAt: number
  } | null
  verification: {
    records: Doc<'deliveryVerifications'>[]
    latestReview: Doc<'reviewReports'> | null
    latestQa: Doc<'qaReports'> | null
    latestShip: Doc<'shipReports'> | null
  }
  browserQa: {
    activeSession: Doc<'browserSessions'> | null
    latestQa: Doc<'qaReports'> | null
  }
  handoffSummary: ReturnType<typeof buildForgeHandoffSummary>
  roleNextActions: ReturnType<typeof buildRoleNextActions>
  operatorViews: {
    status: ReturnType<typeof buildForgeStatusView>
    tasks: ReturnType<typeof buildForgeTaskView>
    verification: ReturnType<typeof buildForgeVerificationView>
  }
  decisions: Doc<'deliveryDecisions'>[]
  timeline: Array<Record<string, unknown>>
}

type ForgeAuthzCtx = QueryCtx | MutationCtx

function toTimelineEntry(args: {
  kind: string
  createdAt: number
  summary: string
  role?: string
  id?: string
}): Record<string, unknown> {
  return {
    kind: args.kind,
    createdAt: args.createdAt,
    summary: args.summary,
    role: args.role,
    id: args.id,
  }
}

export function createDecisionLogRecord(args: {
  deliveryStateId: Id<'deliveryStates'>
  category: DecisionLogRecord['category']
  summary: string
  detail?: string
  relatedTaskIds?: Id<'deliveryTasks'>[]
  relatedFilePaths?: string[]
  createdByRole: DecisionLogRecord['createdByRole']
  now: number
}): DecisionLogRecord {
  return {
    deliveryStateId: args.deliveryStateId,
    category: args.category,
    summary: args.summary,
    detail: args.detail,
    relatedTaskIds: args.relatedTaskIds ?? [],
    relatedFilePaths: args.relatedFilePaths ?? [],
    createdByRole: args.createdByRole,
    createdAt: args.now,
  }
}

export function createVerificationRecord(args: {
  deliveryStateId: Id<'deliveryStates'>
  taskId?: Id<'deliveryTasks'>
  kind: VerificationRecord['kind']
  label: string
  status: VerificationRecord['status']
  evidenceRefs?: string[]
  now: number
}): VerificationRecord {
  return {
    deliveryStateId: args.deliveryStateId,
    taskId: args.taskId,
    kind: args.kind,
    label: args.label,
    status: args.status,
    evidenceRefs: args.evidenceRefs ?? [],
    createdAt: args.now,
    updatedAt: args.now,
  }
}

export function createOrchestrationWaveRecord(args: {
  deliveryStateId: Id<'deliveryStates'>
  phase: OrchestrationWaveRecord['phase']
  status: OrchestrationWaveRecord['status']
  summary: string
  taskIds?: Id<'deliveryTasks'>[]
  contextResetRequired: boolean
  now: number
}): OrchestrationWaveRecord {
  return {
    deliveryStateId: args.deliveryStateId,
    phase: args.phase,
    status: args.status,
    summary: args.summary,
    taskIds: args.taskIds ?? [],
    contextResetRequired: args.contextResetRequired,
    createdAt: args.now,
    updatedAt: args.now,
  }
}

export function createBrowserSessionRecord(args: {
  deliveryStateId: Id<'deliveryStates'>
  projectId: Id<'projects'>
  environment: string
  status: BrowserSessionRecord['status']
  browserSessionKey: string
  baseUrl: string
  storageStatePath?: string
  lastUsedAt: number
  lastVerifiedAt?: number
  lastRoutesTested?: string[]
  leaseOwner?: string
  leaseExpiresAt?: number
  now: number
}): BrowserSessionRecord {
  return {
    deliveryStateId: args.deliveryStateId,
    projectId: args.projectId,
    environment: args.environment,
    status: args.status,
    browserSessionKey: args.browserSessionKey,
    baseUrl: args.baseUrl,
    storageStatePath: args.storageStatePath,
    lastUsedAt: args.lastUsedAt,
    lastVerifiedAt: args.lastVerifiedAt,
    lastRoutesTested: args.lastRoutesTested ?? [],
    leaseOwner: args.leaseOwner,
    leaseExpiresAt: args.leaseExpiresAt,
    createdAt: args.now,
    updatedAt: args.now,
  }
}

function isReusableDeliveryStateStatus(status: Doc<'deliveryStates'>['status']): boolean {
  return status === 'draft' || status === 'active' || status === 'blocked'
}

export function getTaskStatusForReviewDecision(
  decision: Doc<'reviewReports'>['decision']
): Doc<'deliveryTasks'>['status'] {
  switch (decision) {
    case 'pass':
      return 'qa_pending'
    case 'concerns':
      return 'blocked'
    case 'reject':
    default:
      return 'rejected'
  }
}

export function shouldCreateShipReportForQaDecision(
  decision: Doc<'qaReports'>['decision']
): boolean {
  return decision === 'pass'
}

export function buildProjectSnapshot(args: {
  project: Pick<Doc<'projects'>, '_id' | 'name' | 'description'>
  deliveryState: Pick<
    Doc<'deliveryStates'>,
    | '_id'
    | 'currentPhase'
    | 'status'
    | 'activeRole'
    | 'summary'
    | 'reviewGateStatus'
    | 'qaGateStatus'
    | 'shipGateStatus'
    | 'openRiskCount'
    | 'unresolvedDefectCount'
  >
  activeWave: (Doc<'orchestrationWaves'> & { _id: Id<'orchestrationWaves'> }) | null
  tasks: SnapshotTaskRecord[]
  latestReview: Doc<'reviewReports'> | null
  latestQa: Doc<'qaReports'> | null
  latestShipReport: Doc<'shipReports'> | null
  activePlanningSession:
    | (Doc<'planningSessions'> & { _id: Id<'planningSessions'>; sessionId: string })
    | null
  approvedPlan: {
    sessionId: string
    title: string
    summary: string
    status: string
    generatedAt: number
  } | null
  latestSpecification: Doc<'specifications'> | null
  decisions: Doc<'deliveryDecisions'>[]
  verifications: Doc<'deliveryVerifications'>[]
  browserSession: Doc<'browserSessions'> | null
  timeline: Array<Record<string, unknown>>
}): ForgeProjectSnapshotRecord {
  const taskBoard = buildTaskBoardView({ tasks: args.tasks })

  const snapshotBase = {
    project: {
      id: String(args.project._id),
      name: args.project.name,
      description: args.project.description,
    },
    state: {
      id: String(args.deliveryState._id),
      phase: args.deliveryState.currentPhase,
      status: args.deliveryState.status,
      activeRole: args.deliveryState.activeRole,
      activeWave: args.activeWave
        ? {
            id: String(args.activeWave._id),
            phase: args.activeWave.phase,
            status: args.activeWave.status,
            summary: args.activeWave.summary,
            taskIds: args.activeWave.taskIds.map((taskId) => String(taskId)),
            contextResetRequired: args.activeWave.contextResetRequired,
            createdAt: args.activeWave.createdAt,
            updatedAt: args.activeWave.updatedAt,
          }
        : undefined,
      summary: args.deliveryState.summary,
      gates: {
        architecture_review: args.deliveryState.reviewGateStatus,
        implementation_review: args.deliveryState.reviewGateStatus,
        qa_review: args.deliveryState.qaGateStatus,
        ship_review: args.deliveryState.shipGateStatus,
      },
      openRiskCount: args.deliveryState.openRiskCount,
      unresolvedDefectCount: args.deliveryState.unresolvedDefectCount,
    },
    taskBoard: {
      activeTaskId: taskBoard.activeTaskId ? String(taskBoard.activeTaskId) : undefined,
      tasks: taskBoard.tasks.map((task) => ({
        id: String(task._id),
        taskKey: task.taskKey,
        title: task.title,
        description: task.description,
        rationale: task.rationale,
        ownerRole: task.ownerRole,
        dependencies: task.dependencies.map((dependency) => String(dependency)),
        filesInScope: task.filesInScope,
        routesInScope: task.routesInScope,
        constraints: task.constraints,
        acceptanceCriteria: task.acceptanceCriteria,
        testRequirements: task.testRequirements,
        reviewRequirements: task.reviewRequirements,
        qaRequirements: task.qaRequirements,
        blockers: task.blockers,
        status: task.status,
        evidence: task.evidence.map((evidence) => ({
          kind: evidence.type,
          label: evidence.label,
          ref: evidence.id,
          href: evidence.href,
        })),
        latestReview: null,
        latestQa: null,
        taskBoard: task.taskBoard,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      })),
    },
    verification: {
      records: args.verifications.map((record) => ({
        id: String(record._id),
        taskId: record.taskId ? String(record.taskId) : '',
        kind: record.kind,
        label: record.label,
        status: record.status,
        evidenceRefs: record.evidenceRefs,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      })),
      latestReview: args.latestReview
        ? {
            reviewType: args.latestReview.type,
            decision: args.latestReview.decision,
            summary: args.latestReview.summary,
            checklistResults: args.latestReview.checklistResults.map((result) => ({
              item: result.item,
              status: result.status,
              detail: result.detail,
            })),
            requiredActionItems: args.latestReview.requiredActionItems,
            verificationEvidence: args.latestReview.verificationEvidence.map((evidence) => ({
              kind: evidence.kind,
              label: evidence.label,
              ref: evidence.ref,
              href: evidence.href,
            })),
            findings: args.latestReview.findings,
            followUpTaskSeeds: [],
            createdAt: args.latestReview.createdAt,
          }
        : null,
      latestQa: args.latestQa
        ? {
            decision: args.latestQa.decision,
            summary: args.latestQa.summary,
            assertions: args.latestQa.assertions,
            routesTested: args.latestQa.evidence.urlsTested,
            flowsTested: args.latestQa.evidence.flowNames,
            evidence: [
              ...(args.latestQa.evidence.screenshotPath
                ? [
                    {
                      kind: 'screenshot' as const,
                      label: 'Full page screenshot',
                      href: args.latestQa.evidence.screenshotPath,
                    },
                  ]
                : []),
            ],
            defects: args.latestQa.defects,
            browserSessionKey: args.latestQa.browserSessionKey,
            createdAt: args.latestQa.createdAt,
          }
        : null,
      latestShip: args.latestShipReport
        ? {
            decision: args.latestShipReport.decision,
            summary: args.latestShipReport.summary,
            evidenceSummary: args.latestShipReport.evidenceSummary,
            criteriaResults: args.latestShipReport.criteriaResults,
            createdAt: args.latestShipReport.createdAt,
          }
        : null,
    },
    browserQa: {
      activeSession: args.browserSession
        ? {
            id: String(args.browserSession._id),
            projectId: String(args.browserSession.projectId),
            environment: args.browserSession.environment,
            status: args.browserSession.status,
            browserSessionKey: args.browserSession.browserSessionKey,
            baseUrl: args.browserSession.baseUrl,
            storageStatePath: args.browserSession.storageStatePath,
            lastUsedAt: args.browserSession.lastUsedAt,
            lastVerifiedAt: args.browserSession.lastVerifiedAt,
            lastRoutesTested: args.browserSession.lastRoutesTested,
            leaseOwner: args.browserSession.leaseOwner,
            leaseExpiresAt: args.browserSession.leaseExpiresAt,
            createdAt: args.browserSession.createdAt,
            updatedAt: args.browserSession.updatedAt,
          }
        : undefined,
      latestQa: undefined,
    },
    decisions: args.decisions.map((decision) => ({
      id: String(decision._id),
      category: decision.category,
      summary: decision.summary,
      detail: decision.detail,
      relatedTaskIds: decision.relatedTaskIds.map((taskId) => String(taskId)),
      relatedFilePaths: decision.relatedFilePaths,
      createdByRole: decision.createdByRole,
      createdAt: decision.createdAt,
    })),
    timeline: args.timeline,
  } satisfies import('../apps/web/lib/forge/types').ForgeProjectSnapshot

  const handoffSummary = buildForgeHandoffSummary({ snapshot: snapshotBase })
  const roleNextActions = buildRoleNextActions({ snapshot: snapshotBase })
  const operatorViews = {
    status: buildForgeStatusView({ snapshot: snapshotBase }),
    tasks: buildForgeTaskView({ snapshot: snapshotBase }),
    verification: buildForgeVerificationView({ snapshot: snapshotBase }),
  }

  return {
    project: {
      id: args.project._id,
      name: args.project.name,
      description: args.project.description,
    },
    state: {
      id: args.deliveryState._id,
      phase: args.deliveryState.currentPhase,
      status: args.deliveryState.status,
      activeRole: args.deliveryState.activeRole,
      activeWave: args.activeWave,
      summary: args.deliveryState.summary,
      gates: {
        architecture_review: args.deliveryState.reviewGateStatus,
        implementation_review: args.deliveryState.reviewGateStatus,
        qa_review: args.deliveryState.qaGateStatus,
        ship_review: args.deliveryState.shipGateStatus,
      },
      openRiskCount: args.deliveryState.openRiskCount,
      unresolvedDefectCount: args.deliveryState.unresolvedDefectCount,
    },
    taskBoard: {
      activeTaskId: taskBoard.activeTaskId as Id<'deliveryTasks'> | undefined,
      tasks: taskBoard.tasks as SnapshotTaskBoardRecord[],
    },
    planning: {
      activeSession: args.activePlanningSession,
      approvedPlan: args.approvedPlan,
    },
    specification: args.latestSpecification
      ? {
          id: args.latestSpecification._id,
          version: args.latestSpecification.version,
          tier: args.latestSpecification.tier,
          status: args.latestSpecification.status,
          goal: args.latestSpecification.intent.goal,
          runId: args.latestSpecification.runId,
          updatedAt: args.latestSpecification.updatedAt,
        }
      : null,
    verification: {
      records: args.verifications,
      latestReview: args.latestReview,
      latestQa: args.latestQa,
      latestShip: args.latestShipReport,
    },
    browserQa: {
      activeSession: args.browserSession,
      latestQa: args.latestQa,
    },
    handoffSummary,
    roleNextActions,
    operatorViews,
    decisions: args.decisions,
    timeline: args.timeline,
  }
}

export function buildTaskContextPack(args: {
  projectId: Id<'projects'>
  deliveryStateId: Id<'deliveryStates'>
  task: SnapshotTaskRecord
  role: Extract<Doc<'deliveryTasks'>['ownerRole'], 'builder' | 'manager' | 'executive'>
  decisions: Doc<'deliveryDecisions'>[]
  verifications: Doc<'deliveryVerifications'>[]
  latestReview: Doc<'reviewReports'> | null
  deliverySummary: DeliveryStateRecord['summary']
  allTasks: SnapshotTaskRecord[]
}) {
  const taskDecisions = [...args.decisions]
    .filter((entry) => entry.relatedTaskIds.includes(args.task._id))
    .sort((left, right) => left.createdAt - right.createdAt)
  const latestDecision = taskDecisions[taskDecisions.length - 1]?.summary
  const latestVerification = [...args.verifications]
    .filter((record) => record.taskId === args.task._id)
    .sort((left, right) => right.updatedAt - left.updatedAt)[0]?.label
  const recentChanges = [latestDecision, latestVerification, args.latestReview?.summary].filter(
    (value): value is string => typeof value === 'string' && value.length > 0
  )

  return {
    projectId: args.projectId,
    deliveryStateId: args.deliveryStateId,
    taskId: args.task._id,
    role: args.role,
    objective: args.task.title,
    summary: args.task.description,
    filesInScope: args.task.filesInScope,
    routesInScope: args.task.routesInScope,
    constraints: args.task.constraints,
    acceptanceCriteria: args.task.acceptanceCriteria,
    testRequirements: args.task.testRequirements,
    reviewRequirements: args.task.reviewRequirements,
    qaRequirements: args.task.qaRequirements,
    decisions: taskDecisions,
    recentChangesDigest:
      recentChanges.length > 0
        ? `Recent task changes: ${recentChanges.join('. ')}.`
        : 'Recent task changes: none recorded yet.',
    nextStepBrief: args.deliverySummary.nextStepBrief,
    excludedContext: [
      ...args.allTasks
        .filter((task) => task._id !== args.task._id)
        .sort((left, right) => left.createdAt - right.createdAt)
        .map((task) => `Task ${task.taskKey}: ${task.title}`),
      ...args.decisions
        .filter((entry) => !entry.relatedTaskIds.includes(args.task._id))
        .sort((left, right) => left.createdAt - right.createdAt)
        .map((entry) => `Decision ${String(entry._id)}: ${entry.summary}`),
    ],
  }
}

async function requireDeliveryStateOwner(
  ctx: ForgeAuthzCtx,
  deliveryStateId: Id<'deliveryStates'>
): Promise<Doc<'deliveryStates'>> {
  const deliveryState = await ctx.db.get(deliveryStateId)
  if (!deliveryState) {
    throw new Error('Delivery state not found')
  }

  await requireProjectOwner(ctx, deliveryState.projectId)
  return deliveryState
}

async function requireDeliveryTaskOwner(
  ctx: ForgeAuthzCtx,
  taskId: Id<'deliveryTasks'>
): Promise<Doc<'deliveryTasks'>> {
  const task = await ctx.db.get(taskId)
  if (!task) {
    throw new Error('Delivery task not found')
  }

  await requireDeliveryStateOwner(ctx, task.deliveryStateId)
  return task
}

export const getProjectSnapshot = query({
  args: {
    chatId: v.id('chats'),
  },
  handler: async (ctx, args) => {
    const { project, chat } = await requireChatOwner(ctx, args.chatId)

    const deliveryState =
      (await ctx.db
        .query('deliveryStates')
        .withIndex('by_chat_updated', (q) => q.eq('chatId', chat._id))
        .order('desc')
        .first()) ?? null

    if (!deliveryState) return null

    const [
      tasks,
      reviews,
      qaReports,
      shipReports,
      decisions,
      verifications,
      waves,
      sessions,
      planningSessions,
      specifications,
    ] = await Promise.all([
      ctx.db
        .query('deliveryTasks')
        .withIndex('by_delivery_updated', (q) => q.eq('deliveryStateId', deliveryState._id))
        .order('desc')
        .collect(),
      ctx.db
        .query('reviewReports')
        .withIndex('by_delivery_created', (q) => q.eq('deliveryStateId', deliveryState._id))
        .order('desc')
        .take(10),
      ctx.db
        .query('qaReports')
        .withIndex('by_delivery_created', (q) => q.eq('deliveryStateId', deliveryState._id))
        .order('desc')
        .take(10),
      ctx.db
        .query('shipReports')
        .withIndex('by_delivery_created', (q) => q.eq('deliveryStateId', deliveryState._id))
        .order('desc')
        .take(5),
      ctx.db
        .query('deliveryDecisions')
        .withIndex('by_delivery_created', (q) => q.eq('deliveryStateId', deliveryState._id))
        .order('desc')
        .take(20),
      ctx.db
        .query('deliveryVerifications')
        .withIndex('by_delivery_updated', (q) => q.eq('deliveryStateId', deliveryState._id))
        .order('desc')
        .take(20),
      ctx.db
        .query('orchestrationWaves')
        .withIndex('by_delivery_updated', (q) => q.eq('deliveryStateId', deliveryState._id))
        .order('desc')
        .take(5),
      ctx.db
        .query('browserSessions')
        .withIndex('by_delivery_updated', (q) => q.eq('deliveryStateId', deliveryState._id))
        .order('desc')
        .take(5),
      ctx.db
        .query('planningSessions')
        .withIndex('by_updated', (q) => q.eq('chatId', chat._id))
        .order('desc')
        .take(10),
      ctx.db
        .query('specifications')
        .withIndex('by_chat', (q) => q.eq('chatId', chat._id))
        .order('desc')
        .take(10),
    ])

    const latestReview = reviews[0] ?? null
    const latestQa = qaReports[0] ?? null
    const latestShipReport = shipReports[0] ?? null
    const activeWave = waves[0] ?? null
    const browserSession = sessions[0] ?? null
    const activePlanningSession =
      planningSessions.find(
        (session) =>
          session.status === 'intake' ||
          session.status === 'generating' ||
          session.status === 'ready_for_review'
      ) ?? null
    const approvedPlanningSession =
      planningSessions.find(
        (session) =>
          session.status === 'accepted' &&
          session.generatedPlan &&
          session.generatedPlan.status === 'accepted'
      ) ?? null
    const latestSpecification =
      specifications.find((specification) => specification.status !== 'archived') ?? null

    const timeline = [
      ...decisions.map((entry) =>
        toTimelineEntry({
          kind: 'decision',
          createdAt: entry.createdAt,
          summary: entry.summary,
          role: entry.createdByRole,
          id: String(entry._id),
        })
      ),
      ...reviews.map((entry) =>
        toTimelineEntry({
          kind: 'review',
          createdAt: entry.createdAt,
          summary: entry.summary,
          role: entry.reviewerRole,
          id: String(entry._id),
        })
      ),
      ...qaReports.map((entry) =>
        toTimelineEntry({
          kind: 'qa',
          createdAt: entry.createdAt,
          summary: entry.summary,
          id: String(entry._id),
        })
      ),
      ...shipReports.map((entry) =>
        toTimelineEntry({
          kind: 'ship',
          createdAt: entry.createdAt,
          summary: entry.summary,
          id: String(entry._id),
        })
      ),
    ].sort((a, b) => Number(b.createdAt) - Number(a.createdAt))

    return buildProjectSnapshot({
      project,
      deliveryState,
      activeWave,
      tasks,
      latestReview,
      latestQa,
      latestShipReport,
      activePlanningSession,
      approvedPlan: approvedPlanningSession?.generatedPlan
        ? {
            sessionId: approvedPlanningSession.sessionId,
            title: approvedPlanningSession.generatedPlan.title,
            summary: approvedPlanningSession.generatedPlan.summary,
            status: approvedPlanningSession.generatedPlan.status,
            generatedAt: approvedPlanningSession.generatedPlan.generatedAt,
          }
        : null,
      latestSpecification,
      decisions,
      verifications,
      browserSession,
      timeline,
    })
  },
})

export const getQaRunContext = query({
  args: {
    projectId: v.id('projects'),
    chatId: v.id('chats'),
    taskId: v.id('deliveryTasks'),
  },
  handler: async (ctx, args) => {
    const { project, chat } = await requireChatOwner(ctx, args.chatId)
    if (project._id !== args.projectId || chat.projectId !== args.projectId) {
      throw new Error('Chat does not belong to the specified project')
    }

    const task = await requireDeliveryTaskOwner(ctx, args.taskId)
    const deliveryState = await requireDeliveryStateOwner(ctx, task.deliveryStateId)
    if (deliveryState.projectId !== args.projectId || deliveryState.chatId !== args.chatId) {
      throw new Error('Delivery task does not belong to the specified project chat')
    }

    const browserSession = await ctx.db
      .query('browserSessions')
      .withIndex('by_delivery_updated', (q) => q.eq('deliveryStateId', deliveryState._id))
      .order('desc')
      .first()

    return {
      deliveryStateId: deliveryState._id,
      browserSession,
    }
  },
})

export const getTaskContextPack = query({
  args: {
    chatId: v.id('chats'),
    taskId: v.id('deliveryTasks'),
    role: v.union(v.literal('builder'), v.literal('manager'), v.literal('executive')),
  },
  handler: async (ctx, args) => {
    const { chat } = await requireChatOwner(ctx, args.chatId)
    const task = await requireDeliveryTaskOwner(ctx, args.taskId)
    const deliveryState = await requireDeliveryStateOwner(ctx, task.deliveryStateId)

    if (deliveryState.chatId !== chat._id) {
      throw new Error('Delivery task does not belong to the specified chat')
    }

    const [tasks, decisions, verifications, reviews] = await Promise.all([
      ctx.db
        .query('deliveryTasks')
        .withIndex('by_delivery_updated', (q) => q.eq('deliveryStateId', deliveryState._id))
        .order('desc')
        .collect(),
      ctx.db
        .query('deliveryDecisions')
        .withIndex('by_delivery_created', (q) => q.eq('deliveryStateId', deliveryState._id))
        .order('desc')
        .take(20),
      ctx.db
        .query('deliveryVerifications')
        .withIndex('by_delivery_updated', (q) => q.eq('deliveryStateId', deliveryState._id))
        .order('desc')
        .take(20),
      ctx.db
        .query('reviewReports')
        .withIndex('by_task_created', (q) => q.eq('taskId', task._id))
        .order('desc')
        .take(1),
    ])

    return buildTaskContextPack({
      projectId: deliveryState.projectId,
      deliveryStateId: deliveryState._id,
      task,
      role: args.role,
      decisions,
      verifications,
      latestReview: reviews[0] ?? null,
      deliverySummary: deliveryState.summary,
      allTasks: tasks,
    })
  },
})

export const startIntake = mutation({
  args: {
    projectId: v.id('projects'),
    chatId: v.id('chats'),
    title: v.string(),
    goal: v.string(),
    description: v.optional(v.string()),
    constraints: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { project } = await requireProjectOwner(ctx, args.projectId)
    const { chat } = await requireChatOwner(ctx, args.chatId)

    if (chat.projectId !== project._id) {
      throw new Error('Chat does not belong to the specified project')
    }

    const existingState = await ctx.db
      .query('deliveryStates')
      .withIndex('by_chat_updated', (q) => q.eq('chatId', args.chatId))
      .order('desc')
      .first()

    if (existingState && isReusableDeliveryStateStatus(existingState.status)) {
      return existingState._id
    }

    const now = Date.now()
    const stateRecord = createDeliveryStateRecord({
      projectId: args.projectId,
      chatId: args.chatId,
      title: args.title,
      description: args.description,
      goal: args.goal,
      constraints: args.constraints,
      currentPhase: 'intake',
      status: 'draft',
      activeRole: 'manager',
      now,
    })

    const deliveryStateId = await ctx.db.insert('deliveryStates', stateRecord)
    await ctx.db.insert(
      'orchestrationWaves',
      createOrchestrationWaveRecord({
        deliveryStateId,
        phase: 'intake',
        status: 'active',
        summary: 'Forge intake created.',
        contextResetRequired: false,
        now,
      })
    )

    return deliveryStateId
  },
})

export const acceptPlan = mutation({
  args: {
    deliveryStateId: v.id('deliveryStates'),
    summary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const deliveryState = await requireDeliveryStateOwner(ctx, args.deliveryStateId)
    const now = Date.now()

    await ctx.db.patch(args.deliveryStateId, {
      currentPhase: 'plan',
      status: 'active',
      activeRole: 'manager',
      summary: {
        ...deliveryState.summary,
        currentPhaseSummary: args.summary ?? 'Approved plan accepted into the Forge control plane.',
      },
      updatedAt: now,
      lastUpdatedByRole: 'manager',
    })

    await ctx.db.insert(
      'deliveryDecisions',
      createDecisionLogRecord({
        deliveryStateId: args.deliveryStateId,
        category: 'architecture',
        summary: 'Approved plan accepted into canonical Forge state.',
        createdByRole: 'manager',
        now,
      })
    )

    return args.deliveryStateId
  },
})

export const createTasksFromPlan = mutation({
  args: {
    deliveryStateId: v.id('deliveryStates'),
    tasks: v.array(
      v.object({
        taskKey: v.string(),
        title: v.string(),
        description: v.string(),
        rationale: v.string(),
        ownerRole: DeliveryRole,
        filesInScope: v.optional(v.array(v.string())),
        routesInScope: v.optional(v.array(v.string())),
        constraints: v.optional(v.array(v.string())),
        acceptanceCriteria: v.optional(v.array(v.any())),
        testRequirements: v.optional(v.array(v.string())),
        reviewRequirements: v.optional(v.array(v.string())),
        qaRequirements: v.optional(v.array(v.string())),
      })
    ),
  },
  handler: async (ctx, args) => {
    const deliveryState = await requireDeliveryStateOwner(ctx, args.deliveryStateId)
    const now = Date.now()

    const taskIds: Id<'deliveryTasks'>[] = []
    for (const task of args.tasks) {
      const existingTask = await ctx.db
        .query('deliveryTasks')
        .withIndex('by_delivery_taskKey', (q) =>
          q.eq('deliveryStateId', args.deliveryStateId).eq('taskKey', task.taskKey)
        )
        .first()

      const taskId = existingTask
        ? existingTask._id
        : await ctx.db.insert(
            'deliveryTasks',
            createDeliveryTaskRecord({
              deliveryStateId: args.deliveryStateId,
              taskKey: task.taskKey,
              title: task.title,
              description: task.description,
              rationale: task.rationale,
              ownerRole: task.ownerRole,
              filesInScope: task.filesInScope,
              routesInScope: task.routesInScope,
              constraints: task.constraints,
              acceptanceCriteria: (task.acceptanceCriteria as never) ?? [],
              testRequirements: task.testRequirements,
              reviewRequirements: task.reviewRequirements,
              qaRequirements: task.qaRequirements,
              status: 'planned',
              now,
            })
          )

      if (existingTask) {
        await ctx.db.patch(existingTask._id, {
          title: task.title,
          description: task.description,
          rationale: task.rationale,
          ownerRole: task.ownerRole,
          filesInScope: task.filesInScope ?? existingTask.filesInScope,
          routesInScope: task.routesInScope ?? existingTask.routesInScope,
          constraints: task.constraints ?? existingTask.constraints,
          acceptanceCriteria: (task.acceptanceCriteria as never) ?? existingTask.acceptanceCriteria,
          testRequirements: task.testRequirements ?? existingTask.testRequirements,
          reviewRequirements: task.reviewRequirements ?? existingTask.reviewRequirements,
          qaRequirements: task.qaRequirements ?? existingTask.qaRequirements,
          updatedAt: now,
        })
      }

      taskIds.push(taskId)
    }

    const mergedActiveTaskIds = Array.from(
      new Set([...deliveryState.activeTaskIds, ...taskIds].map((value) => String(value)))
    ).map((value) => value as Id<'deliveryTasks'>)

    await ctx.db.patch(args.deliveryStateId, {
      activeTaskIds: mergedActiveTaskIds,
      currentPhase: 'plan',
      status: 'active',
      activeRole: 'manager',
      updatedAt: now,
      lastUpdatedByRole: 'manager',
      summary: {
        ...deliveryState.summary,
        activeTaskTitle: args.tasks[0]?.title,
        currentPhaseSummary: 'Plan tasks created from the approved Forge plan.',
      },
    })

    await ctx.db.insert(
      'orchestrationWaves',
      createOrchestrationWaveRecord({
        deliveryStateId: args.deliveryStateId,
        phase: 'plan',
        status: 'completed',
        summary: 'Plan expanded into tracked Forge tasks.',
        taskIds,
        contextResetRequired: false,
        now,
      })
    )

    return taskIds
  },
})

export const startTaskExecution = mutation({
  args: {
    taskId: v.id('deliveryTasks'),
  },
  handler: async (ctx, args) => {
    const task = await requireDeliveryTaskOwner(ctx, args.taskId)
    const deliveryState = await requireDeliveryStateOwner(ctx, task.deliveryStateId)
    const now = Date.now()

    assertForgeTaskTransition({ from: task.status, to: 'in_progress' })
    assertForgePhaseTransition({ from: deliveryState.currentPhase, to: 'execute' })

    await ctx.db.patch(args.taskId, {
      status: 'in_progress',
      updatedAt: now,
    })

    await ctx.db.patch(task.deliveryStateId, {
      currentPhase: 'execute',
      status: 'active',
      activeRole: 'builder',
      updatedAt: now,
      lastUpdatedByRole: 'manager',
      summary: {
        ...deliveryState.summary,
        activeTaskTitle: task.title,
        currentPhaseSummary: `${task.title} is in execution.`,
      },
    })

    return args.taskId
  },
})

export const submitWorkerResult = mutation({
  args: {
    taskId: v.id('deliveryTasks'),
    summary: v.string(),
    evidenceRefs: v.array(v.string()),
    verificationLabel: v.optional(v.string()),
    outcome: v.optional(v.union(v.literal('completed'), v.literal('failed'), v.literal('stopped'))),
  },
  handler: async (ctx, args) => {
    const task = await requireDeliveryTaskOwner(ctx, args.taskId)
    const deliveryState = await requireDeliveryStateOwner(ctx, task.deliveryStateId)
    const now = Date.now()
    const workerOutcome = args.outcome ?? 'completed'
    const nextTaskStatus = workerOutcome === 'completed' ? 'in_review' : 'blocked'
    const nextEvidence = [
      ...task.evidence,
      {
        type: 'external' as const,
        label: args.summary,
      },
    ]

    if (workerOutcome === 'completed') {
      assertForgeReviewGate({
        task: {
          ...task,
          evidence: nextEvidence,
        },
        verificationRefs: args.evidenceRefs,
      })
      assertForgePhaseTransition({ from: deliveryState.currentPhase, to: 'review' })
    } else {
      assertForgeTaskTransition({ from: task.status, to: nextTaskStatus })
    }

    await ctx.db.patch(args.taskId, {
      status: nextTaskStatus,
      evidence: nextEvidence,
      updatedAt: now,
    })

    await ctx.db.insert(
      'deliveryVerifications',
      createVerificationRecord({
        deliveryStateId: task.deliveryStateId,
        taskId: args.taskId,
        kind: 'test',
        label: args.verificationLabel ?? 'Worker result submitted',
        status: workerOutcome === 'completed' ? 'passed' : 'failed',
        evidenceRefs: args.evidenceRefs,
        now,
      })
    )

    await ctx.db.patch(task.deliveryStateId, {
      currentPhase: workerOutcome === 'completed' ? 'review' : 'execute',
      status: 'active',
      activeRole: workerOutcome === 'completed' ? 'executive' : 'manager',
      updatedAt: now,
      lastUpdatedByRole: 'manager',
      summary: {
        ...deliveryState.summary,
        activeTaskTitle: task.title,
        currentPhaseSummary:
          workerOutcome === 'completed'
            ? `${task.title} is awaiting review.`
            : `${task.title} needs follow-up before review.`,
      },
    })

    return args.taskId
  },
})

export const recordReview = mutation({
  args: {
    deliveryStateId: v.id('deliveryStates'),
    taskId: v.id('deliveryTasks'),
    type: ReviewType,
    decision: ReviewDecision,
    summary: v.string(),
    checklistResults: v.optional(v.array(ReviewChecklistResult)),
    requiredActionItems: v.optional(v.array(v.string())),
    verificationEvidence: v.optional(v.array(VerificationEvidenceRef)),
    findings: v.optional(
      v.array(
        v.object({
          severity: v.union(v.literal('high'), v.literal('medium'), v.literal('low')),
          title: v.string(),
          detail: v.string(),
          filePath: v.optional(v.string()),
          lineRef: v.optional(v.string()),
        })
      )
    ),
    followUpTaskIds: v.optional(v.array(v.id('deliveryTasks'))),
  },
  handler: async (ctx, args) => {
    const task = await requireDeliveryTaskOwner(ctx, args.taskId)
    if (task.deliveryStateId !== args.deliveryStateId) {
      throw new Error('Delivery task does not belong to the specified delivery state')
    }

    const deliveryState = await requireDeliveryStateOwner(ctx, args.deliveryStateId)
    if (args.decision === 'pass') {
      assertForgeQaGate({
        task,
        reviewType: args.type,
        nextStatus: 'qa_pending',
      })
      assertForgePhaseTransition({ from: deliveryState.currentPhase, to: 'qa' })
    } else {
      assertForgeTaskTransition({
        from: task.status,
        to: getTaskStatusForReviewDecision(args.decision),
      })
    }

    const now = Date.now()
    const reviewId = await ctx.db.insert(
      'reviewReports',
      createReviewReportRecord({
        deliveryStateId: args.deliveryStateId,
        taskId: args.taskId,
        type: args.type,
        decision: args.decision,
        summary: args.summary,
        checklistResults: args.checklistResults,
        requiredActionItems: args.requiredActionItems,
        verificationEvidence: args.verificationEvidence,
        findings: args.findings,
        followUpTaskIds: args.followUpTaskIds,
        now,
      })
    )

    await ctx.db.patch(args.taskId, {
      latestReviewReportId: reviewId,
      status: getTaskStatusForReviewDecision(args.decision),
      updatedAt: now,
    })

    await ctx.db.insert(
      'deliveryVerifications',
      createVerificationRecord({
        deliveryStateId: args.deliveryStateId,
        taskId: args.taskId,
        kind: 'review',
        label: `${args.type} review ${args.decision}`,
        status: args.decision === 'pass' ? 'passed' : 'failed',
        evidenceRefs: [String(reviewId)],
        now,
      })
    )

    await ctx.db.patch(args.deliveryStateId, {
      currentPhase: args.decision === 'pass' ? 'qa' : 'review',
      status: args.decision === 'reject' ? 'blocked' : deliveryState.status,
      activeRole: 'executive',
      reviewGateStatus: args.decision === 'pass' ? 'passed' : 'failed',
      qaGateStatus: args.decision === 'pass' ? 'pending' : deliveryState.qaGateStatus,
      updatedAt: now,
      lastUpdatedByRole: 'executive',
      summary: {
        ...deliveryState.summary,
        activeTaskTitle: task.title,
        currentPhaseSummary:
          args.decision === 'pass'
            ? `${task.title} passed implementation review and is ready for QA.`
            : `${task.title} has review concerns and needs follow-up.`,
      },
    })

    return reviewId
  },
})

export const runQaForTask = mutation({
  args: {
    deliveryStateId: v.id('deliveryStates'),
    taskId: v.id('deliveryTasks'),
    decision: QaDecision,
    summary: v.string(),
    assertions: v.array(
      v.object({
        label: v.string(),
        status: v.union(v.literal('passed'), v.literal('failed'), v.literal('skipped')),
        detail: v.optional(v.string()),
      })
    ),
    urlsTested: v.array(v.string()),
    flowNames: v.array(v.string()),
    scenarioNames: v.optional(v.array(v.string())),
    consoleErrors: v.array(v.string()),
    networkFailures: v.array(v.string()),
    screenshotPath: v.optional(v.string()),
    evidenceArtifacts: v.optional(
      v.array(
        v.object({
          kind: v.union(
            v.literal('screenshot'),
            v.literal('console-log'),
            v.literal('network-log'),
            v.literal('trace'),
            v.literal('report')
          ),
          label: v.string(),
          path: v.optional(v.string()),
          content: v.optional(v.string()),
        })
      )
    ),
    browserSessionKey: v.optional(v.string()),
    defects: v.array(
      v.object({
        severity: v.union(v.literal('high'), v.literal('medium'), v.literal('low')),
        title: v.string(),
        detail: v.string(),
        route: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const task = await requireDeliveryTaskOwner(ctx, args.taskId)
    if (task.deliveryStateId !== args.deliveryStateId) {
      throw new Error('Delivery task does not belong to the specified delivery state')
    }

    const deliveryState = await requireDeliveryStateOwner(ctx, args.deliveryStateId)
    if (args.decision === 'pass') {
      assertForgeQaGate({
        task,
        nextStatus: 'done',
      })
      assertForgePhaseTransition({ from: deliveryState.currentPhase, to: 'ship' })
    }

    const now = Date.now()
    const qaId = await ctx.db.insert(
      'qaReports',
      createQaReportRecord({
        deliveryStateId: args.deliveryStateId,
        taskId: args.taskId,
        browserSessionKey: args.browserSessionKey,
        decision: args.decision,
        summary: args.summary,
        assertions: args.assertions,
        evidence: {
          urlsTested: args.urlsTested,
          flowNames: args.flowNames,
          scenarioNames: args.scenarioNames ?? args.flowNames,
          consoleErrors: args.consoleErrors,
          networkFailures: args.networkFailures,
          screenshotPath: args.screenshotPath,
          artifacts:
            args.evidenceArtifacts ??
            [
              args.screenshotPath
                ? {
                    kind: 'screenshot' as const,
                    label: 'Full page screenshot',
                    path: args.screenshotPath,
                  }
                : null,
            ].filter(
              (artifact): artifact is { kind: 'screenshot'; label: string; path: string } =>
                artifact !== null
            ),
        },
        defects: args.defects,
        now,
      })
    )

    await ctx.db.patch(args.taskId, {
      latestQaReportId: qaId,
      status: args.decision === 'pass' ? 'done' : 'qa_pending',
      updatedAt: now,
    })

    await ctx.db.insert(
      'deliveryVerifications',
      createVerificationRecord({
        deliveryStateId: args.deliveryStateId,
        taskId: args.taskId,
        kind: 'qa',
        label: `QA ${args.decision}`,
        status: args.decision === 'pass' ? 'passed' : 'failed',
        evidenceRefs: [String(qaId)],
        now,
      })
    )

    await ctx.db.patch(args.deliveryStateId, {
      currentPhase: args.decision === 'pass' ? 'ship' : 'qa',
      status: args.decision === 'pass' ? deliveryState.status : 'blocked',
      activeRole: 'executive',
      qaGateStatus: args.decision === 'pass' ? 'passed' : 'failed',
      updatedAt: now,
      lastUpdatedByRole: 'executive',
      summary: {
        ...deliveryState.summary,
        activeTaskTitle: task.title,
        currentPhaseSummary:
          args.decision === 'pass'
            ? `${task.title} passed QA and is ready for ship review.`
            : `${task.title} requires QA follow-up before ship.`,
      },
    })

    return qaId
  },
})

export const recordShipDecision = mutation({
  args: {
    deliveryStateId: v.id('deliveryStates'),
    decision: ShipDecision,
    summary: v.string(),
    evidenceSummary: v.string(),
    criteriaResults: v.array(ShipCriterionResult),
  },
  handler: async (ctx, args) => {
    const deliveryState = await requireDeliveryStateOwner(ctx, args.deliveryStateId)
    assertForgeShipGate({
      shipGateStatus: deliveryState.shipGateStatus,
      qaGateStatus: deliveryState.qaGateStatus,
      decision: args.decision,
    })
    const now = Date.now()
    const shipId = await ctx.db.insert(
      'shipReports',
      createShipReportRecord({
        deliveryStateId: args.deliveryStateId,
        decision: args.decision,
        summary: args.summary,
        evidenceSummary: args.evidenceSummary,
        criteriaResults: args.criteriaResults,
        now,
      })
    )

    await ctx.db.patch(args.deliveryStateId, {
      currentPhase: 'ship',
      status: args.decision === 'not_ready' ? 'blocked' : 'completed',
      activeRole: 'executive',
      shipGateStatus: args.decision === 'not_ready' ? 'failed' : 'passed',
      updatedAt: now,
      lastUpdatedByRole: 'executive',
      summary: {
        ...deliveryState.summary,
        currentPhaseSummary: args.summary,
      },
    })

    await ctx.db.insert(
      'deliveryVerifications',
      createVerificationRecord({
        deliveryStateId: args.deliveryStateId,
        kind: 'ship',
        label: `Ship ${args.decision}`,
        status: args.decision === 'not_ready' ? 'failed' : 'passed',
        evidenceRefs: [String(shipId)],
        now,
      })
    )

    return shipId
  },
})

export const upsertBrowserSession = mutation({
  args: {
    deliveryStateId: v.id('deliveryStates'),
    projectId: v.id('projects'),
    environment: v.string(),
    status: BrowserSessionStatus,
    browserSessionKey: v.string(),
    baseUrl: v.string(),
    storageStatePath: v.optional(v.string()),
    lastUsedAt: v.number(),
    lastVerifiedAt: v.optional(v.number()),
    lastRoutesTested: v.array(v.string()),
    leaseOwner: v.optional(v.string()),
    leaseExpiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const deliveryState = await requireDeliveryStateOwner(ctx, args.deliveryStateId)
    if (deliveryState.projectId !== args.projectId) {
      throw new Error('Delivery state does not belong to the specified project')
    }

    const now = Date.now()
    const existingSession = await ctx.db
      .query('browserSessions')
      .withIndex('by_session_key', (q) => q.eq('browserSessionKey', args.browserSessionKey))
      .first()

    if (existingSession) {
      await ctx.db.patch(existingSession._id, {
        deliveryStateId: args.deliveryStateId,
        projectId: args.projectId,
        environment: args.environment,
        status: args.status,
        baseUrl: args.baseUrl,
        storageStatePath: args.storageStatePath,
        lastUsedAt: args.lastUsedAt,
        lastVerifiedAt: args.lastVerifiedAt,
        lastRoutesTested: args.lastRoutesTested,
        leaseOwner: args.leaseOwner,
        leaseExpiresAt: args.leaseExpiresAt,
        updatedAt: now,
      })
      return existingSession._id
    }

    return await ctx.db.insert(
      'browserSessions',
      createBrowserSessionRecord({
        deliveryStateId: args.deliveryStateId,
        projectId: args.projectId,
        environment: args.environment,
        status: args.status,
        browserSessionKey: args.browserSessionKey,
        baseUrl: args.baseUrl,
        storageStatePath: args.storageStatePath,
        lastUsedAt: args.lastUsedAt,
        lastVerifiedAt: args.lastVerifiedAt,
        lastRoutesTested: args.lastRoutesTested,
        leaseOwner: args.leaseOwner,
        leaseExpiresAt: args.leaseExpiresAt,
        now,
      })
    )
  },
})

export const listActivityTimeline = query({
  args: {
    deliveryStateId: v.id('deliveryStates'),
  },
  handler: async (ctx, args) => {
    await requireDeliveryStateOwner(ctx, args.deliveryStateId)

    const [decisions, reviews, qaReports, shipReports] = await Promise.all([
      ctx.db
        .query('deliveryDecisions')
        .withIndex('by_delivery_created', (q) => q.eq('deliveryStateId', args.deliveryStateId))
        .order('desc')
        .take(20),
      ctx.db
        .query('reviewReports')
        .withIndex('by_delivery_created', (q) => q.eq('deliveryStateId', args.deliveryStateId))
        .order('desc')
        .take(20),
      ctx.db
        .query('qaReports')
        .withIndex('by_delivery_created', (q) => q.eq('deliveryStateId', args.deliveryStateId))
        .order('desc')
        .take(20),
      ctx.db
        .query('shipReports')
        .withIndex('by_delivery_created', (q) => q.eq('deliveryStateId', args.deliveryStateId))
        .order('desc')
        .take(20),
    ])

    return [
      ...decisions.map((entry) =>
        toTimelineEntry({
          kind: 'decision',
          createdAt: entry.createdAt,
          summary: entry.summary,
          role: entry.createdByRole,
          id: String(entry._id),
        })
      ),
      ...reviews.map((entry) =>
        toTimelineEntry({
          kind: 'review',
          createdAt: entry.createdAt,
          summary: entry.summary,
          role: entry.reviewerRole,
          id: String(entry._id),
        })
      ),
      ...qaReports.map((entry) =>
        toTimelineEntry({
          kind: 'qa',
          createdAt: entry.createdAt,
          summary: entry.summary,
          id: String(entry._id),
        })
      ),
      ...shipReports.map((entry) =>
        toTimelineEntry({
          kind: 'ship',
          createdAt: entry.createdAt,
          summary: entry.summary,
          id: String(entry._id),
        })
      ),
    ].sort((a, b) => Number(b.createdAt) - Number(a.createdAt))
  },
})
