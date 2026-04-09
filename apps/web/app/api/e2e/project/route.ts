import { NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import type { PlanStatus } from '@/lib/chat/planDraft'
import { buildDefaultPlanningQuestions } from '@/lib/planning/question-engine'
import {
  serializeGeneratedPlanArtifact,
  type GeneratedPlanArtifact,
  type GeneratedPlanSection,
} from '@/lib/planning/types'

const DEFAULT_FIXTURE_NAME = 'Workbench E2E Fixture'
const DEFAULT_FIXTURE_DESCRIPTION = 'Deterministic browser E2E fixture project'
const DEFAULT_CHAT_TITLE = 'Workbench E2E Chat'
const E2E_FIXTURE_NAME_PREFIXES = [
  'Workbench E2E Fixture',
  'Workbench Smoke',
  'Spec Review Fixture',
  'Agent Run Plan',
  'Agent Run Resume',
  'Agent Run History',
  'Permission Reject',
  'Permission Allow',
  'Sharing Fixture',
  'Workbench Test',
  'Test Project',
  'Open Test',
  'Searchable',
]
const PLAN_STATUSES: PlanStatus[] = [
  'idle',
  'drafting',
  'awaiting_review',
  'approved',
  'stale',
  'executing',
]

interface RuntimeCheckpointEnvelope {
  version: 1
  sessionID: string
  agentName: 'build'
  reason: 'step'
  savedAt: number
  state: {
    sessionID: string
    messages: Array<{
      id: string
      sessionID: string
      role: 'user'
      time: { created: number }
      parts: Array<{
        id: string
        messageID: string
        sessionID: string
        type: 'text'
        text: string
      }>
      agent: 'build'
    }>
    step: number
    isComplete: false
    isLastStep: false
    pendingSubtasks: []
    cost: number
    tokens: { input: number; output: number; reasoning: number }
    lastToolLoopSignature: null
    toolLoopStreak: number
  }
}

interface E2EFixtureProject {
  _id: Id<'projects'>
  name: string
  description?: string
  createdAt: number
  lastOpenedAt?: number
}

interface StructuredPlanningSessionPlanSeed {
  title?: string
  summary?: string
  markdown?: string
  sections?: GeneratedPlanSection[]
  acceptanceChecks?: string[]
}

function buildSeededExecutionEvents() {
  return [
    {
      sequence: 1,
      type: 'progress_step' as const,
      content: 'Tool completed: write_files',
      status: 'completed' as const,
      progressCategory: 'tool' as const,
      progressToolName: 'write_files',
      targetFilePaths: ['apps/web/components/chat/MessageList.tsx'],
    },
    {
      sequence: 2,
      type: 'progress_step' as const,
      content: 'Tool completed: run_command',
      status: 'completed' as const,
      progressCategory: 'tool' as const,
      progressToolName: 'run_command',
    },
    {
      sequence: 3,
      type: 'progress_step' as const,
      content: 'Run complete',
      status: 'completed' as const,
      progressCategory: 'complete' as const,
    },
  ]
}

function isE2EFixtureModeEnabled(request: Request): boolean {
  if (process.env.NODE_ENV === 'production') {
    return false
  }

  if (
    process.env.E2E_AUTH_BYPASS === 'true' ||
    process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS === 'true'
  ) {
    return true
  }

  const url = new URL(request.url)
  return (
    request.headers.get('x-panda-e2e-bypass') === 'true' ||
    url.searchParams.get('e2eBypass') === '1'
  )
}

function buildSeededRuntimeCheckpoint(sessionID: string): RuntimeCheckpointEnvelope {
  const now = Date.now()
  const messageId = `msg_resume_${Math.random().toString(36).slice(2, 8)}`
  return {
    version: 1,
    sessionID,
    agentName: 'build',
    reason: 'step',
    savedAt: now,
    state: {
      sessionID,
      messages: [
        {
          id: messageId,
          sessionID,
          role: 'user',
          time: { created: now },
          parts: [
            {
              id: `part_resume_${Math.random().toString(36).slice(2, 8)}`,
              messageID: messageId,
              sessionID,
              type: 'text',
              text: 'Resume previous run',
            },
          ],
          agent: 'build',
        },
      ],
      step: 0,
      isComplete: false,
      isLastStep: false,
      pendingSubtasks: [],
      cost: 0,
      tokens: { input: 0, output: 0, reasoning: 0 },
      lastToolLoopSignature: null,
      toolLoopStreak: 0,
    },
  }
}

function parseStructuredPlanningSessionPlan(
  rawValue: string | null
): StructuredPlanningSessionPlanSeed | null {
  if (!rawValue) return null

  const parsed = JSON.parse(rawValue) as Partial<StructuredPlanningSessionPlanSeed> & {
    sections?: unknown
    acceptanceChecks?: unknown
  }

  if (parsed.sections !== undefined && !Array.isArray(parsed.sections)) {
    throw new Error('Structured planning fixture sections must be an array')
  }
  if (parsed.acceptanceChecks !== undefined && !Array.isArray(parsed.acceptanceChecks)) {
    throw new Error('Structured planning fixture acceptance checks must be an array')
  }

  return {
    title: typeof parsed.title === 'string' ? parsed.title : undefined,
    summary: typeof parsed.summary === 'string' ? parsed.summary : undefined,
    markdown: typeof parsed.markdown === 'string' ? parsed.markdown : undefined,
    sections: Array.isArray(parsed.sections)
      ? (parsed.sections as GeneratedPlanSection[])
      : undefined,
    acceptanceChecks: Array.isArray(parsed.acceptanceChecks)
      ? (parsed.acceptanceChecks as string[])
      : undefined,
  }
}

function buildStructuredGeneratedPlan(args: {
  chatId: Id<'chats'>
  sessionId: string
  fixtureName: string
  planSeed: StructuredPlanningSessionPlanSeed | null
}): GeneratedPlanArtifact {
  const generatedAt = Date.now()
  const sections: GeneratedPlanSection[] =
    args.planSeed?.sections?.length && args.planSeed.sections.length > 0
      ? args.planSeed.sections
      : [
          {
            id: 'goal',
            title: 'Goal',
            content: `Seed a real structured planning session for ${args.fixtureName}.`,
            order: 10,
          },
          {
            id: 'implementation',
            title: 'Implementation Plan',
            content:
              '1. Create the planning session through the E2E fixture API.\n2. Generate a workspace plan artifact from the planning session.\n3. Verify the workspace plan tab and approval controls.',
            order: 20,
          },
          {
            id: 'validation',
            title: 'Validation',
            content:
              '- Open the plan tab in the workspace.\n- Approve the plan.\n- Start build from plan.',
            order: 30,
          },
        ]

  const acceptanceChecks =
    args.planSeed?.acceptanceChecks?.length && args.planSeed.acceptanceChecks.length > 0
      ? args.planSeed.acceptanceChecks
      : [
          'Planning session exists in Convex.',
          'Workspace opens a real plan tab from the generated artifact.',
          'Approve and build controls remain available in the review flow.',
        ]

  const generatedPlan: GeneratedPlanArtifact = {
    chatId: args.chatId,
    sessionId: args.sessionId,
    title: args.planSeed?.title?.trim() || `${args.fixtureName} Structured Plan`,
    summary:
      args.planSeed?.summary?.trim() ||
      `Seeded structured planning session for ${args.fixtureName}.`,
    markdown: args.planSeed?.markdown?.trim() || '',
    sections,
    acceptanceChecks,
    status: 'ready_for_review',
    generatedAt,
  }

  return {
    ...generatedPlan,
    markdown: generatedPlan.markdown.trim() || serializeGeneratedPlanArtifact(generatedPlan),
  }
}

async function seedStructuredPlanningSession(args: {
  convex: ConvexHttpClient
  chatId: Id<'chats'>
  fixtureName: string
  planSeed: StructuredPlanningSessionPlanSeed | null
  acceptPlan: boolean
}) {
  const planningQuestions = buildDefaultPlanningQuestions({ projectName: args.fixtureName })
  const sessionId = (await args.convex.mutation(api.planningSessions.startIntake, {
    chatId: args.chatId,
    questions: planningQuestions,
  })) as string

  for (const question of planningQuestions) {
    const selectedOptionId = question.suggestions[0]?.id
    if (!selectedOptionId) continue

    await args.convex.mutation(api.planningSessions.answerQuestion, {
      sessionId,
      questionId: question.id,
      selectedOptionId,
      source: 'suggestion',
    })
  }

  const generatedPlan = buildStructuredGeneratedPlan({
    chatId: args.chatId,
    sessionId,
    fixtureName: args.fixtureName,
    planSeed: args.planSeed,
  })

  await args.convex.mutation(api.planningSessions.completeIntake, {
    sessionId,
    generatedPlan,
  })

  let effectivePlanStatus: GeneratedPlanArtifact['status'] = generatedPlan.status
  if (args.acceptPlan) {
    await args.convex.mutation(api.planningSessions.acceptPlan, {
      sessionId,
    })
    effectivePlanStatus = 'accepted'
  }

  return {
    sessionId,
    generatedPlan: {
      ...generatedPlan,
      status: effectivePlanStatus,
    },
  }
}

function isProjectLimitError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('Project limit reached')
}

function getFixtureCleanupCandidate(
  projects: E2EFixtureProject[],
  removedProjectIds: Set<string>,
  currentFixtureName: string
): E2EFixtureProject | null {
  const fixtureProjects = projects
    .filter(
      (project) =>
        !removedProjectIds.has(project._id) &&
        project.name !== currentFixtureName &&
        (project.description === DEFAULT_FIXTURE_DESCRIPTION ||
          E2E_FIXTURE_NAME_PREFIXES.some((prefix) => project.name.startsWith(prefix)))
    )
    .sort((a, b) => (a.lastOpenedAt ?? a.createdAt) - (b.lastOpenedAt ?? b.createdAt))

  return fixtureProjects[0] ?? null
}

async function listFixtureProjects(convex: ConvexHttpClient): Promise<E2EFixtureProject[]> {
  return (await convex.query(api.projects.list, {})) as E2EFixtureProject[]
}

async function getMaxProjectsPerUser(convex: ConvexHttpClient): Promise<number> {
  const defaults = (await convex.query(api.settings.getAdminDefaults, {})) as {
    maxProjectsPerUser?: number
  } | null
  return defaults?.maxProjectsPerUser ?? 100
}

export async function GET(request: Request) {
  if (!isE2EFixtureModeEnabled(request)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
    if (!convexUrl) {
      return NextResponse.json({ error: 'Convex URL not configured' }, { status: 500 })
    }

    const url = new URL(request.url)
    const fixtureName = url.searchParams.get('name')?.trim() || DEFAULT_FIXTURE_NAME
    const ensureCapacityOnly = url.searchParams.get('ensureCapacity') === '1'
    const filePath = url.searchParams.get('filePath')?.trim() || null
    const fileContent = url.searchParams.get('fileContent') ?? ''
    const artifactContent = url.searchParams.get('artifactContent') ?? null
    const seedRuntimeCheckpoint = url.searchParams.get('seedRuntimeCheckpoint') === '1'
    const seedExecutionUpdates = url.searchParams.get('seedExecutionUpdates') === '1'
    const autoApplyFiles = url.searchParams.get('autoApplyFiles')
    const autoRunCommands = url.searchParams.get('autoRunCommands')
    const planDraft = url.searchParams.get('planDraft')?.trim() || null
    const requestedPlanStatus = url.searchParams.get('planStatus')?.trim() || null
    const structuredPlanningSession = url.searchParams.get('structuredPlanningSession') === '1'
    const structuredPlanningSessionPlan = parseStructuredPlanningSessionPlan(
      url.searchParams.get('structuredPlanningSessionPlan')
    )
    const acceptStructuredPlan = url.searchParams.get('acceptStructuredPlan') === '1'
    const planStatus =
      requestedPlanStatus && PLAN_STATUSES.includes(requestedPlanStatus as PlanStatus)
        ? (requestedPlanStatus as PlanStatus)
        : null

    const convex = new ConvexHttpClient(convexUrl)
    let projects = await listFixtureProjects(convex)
    const maxProjectsPerUser = await getMaxProjectsPerUser(convex)

    if (ensureCapacityOnly) {
      let cleanedUpProjectId: string | null = null

      if (projects.length >= maxProjectsPerUser) {
        const cleanupCandidate = getFixtureCleanupCandidate(
          projects,
          new Set<string>(),
          fixtureName
        )
        if (!cleanupCandidate) {
          throw new Error(
            `Project limit reached. You have ${projects.length} projects (maximum: ${maxProjectsPerUser}). Please delete an existing project before creating a new one.`
          )
        }

        await convex.mutation(api.projects.remove, { id: cleanupCandidate._id })
        cleanedUpProjectId = cleanupCandidate._id
      }

      return NextResponse.json({
        ensuredCapacity: true,
        cleanedUpProjectId,
      })
    }

    const existing = projects.find((project) => project.name === fixtureName)

    let projectId = existing?._id
    if (!projectId) {
      const removedProjectIds = new Set<string>()
      while (!projectId) {
        if (projects.length >= maxProjectsPerUser) {
          const cleanupCandidate = getFixtureCleanupCandidate(
            projects,
            removedProjectIds,
            fixtureName
          )
          if (cleanupCandidate) {
            await convex.mutation(api.projects.remove, { id: cleanupCandidate._id })
            removedProjectIds.add(cleanupCandidate._id)
            projects = await listFixtureProjects(convex)
            const reclaimedFixture = projects.find((project) => project.name === fixtureName)
            if (reclaimedFixture) {
              projectId = reclaimedFixture._id
              continue
            }
          }
        }

        try {
          projectId = await convex.mutation(api.projects.create, {
            name: fixtureName,
            description: DEFAULT_FIXTURE_DESCRIPTION,
          })
        } catch (error) {
          if (!isProjectLimitError(error)) {
            throw error
          }

          const cleanupCandidate = getFixtureCleanupCandidate(
            projects,
            removedProjectIds,
            fixtureName
          )
          if (!cleanupCandidate) {
            throw error
          }

          await convex.mutation(api.projects.remove, { id: cleanupCandidate._id })
          removedProjectIds.add(cleanupCandidate._id)
          projects = await listFixtureProjects(convex)
          const reclaimedFixture = projects.find((project) => project.name === fixtureName)
          if (reclaimedFixture) {
            projectId = reclaimedFixture._id
          }
        }
      }
    }

    let chatId: Id<'chats'> | undefined
    if (autoApplyFiles !== null || autoRunCommands !== null) {
      await convex.mutation(api.projects.update, {
        id: projectId,
        agentPolicy: {
          autoApplyFiles: autoApplyFiles === null ? false : autoApplyFiles === '1',
          autoRunCommands: autoRunCommands === null ? false : autoRunCommands === '1',
          allowedCommandPrefixes: [],
        },
      })
    }

    if (
      filePath ||
      artifactContent ||
      seedRuntimeCheckpoint ||
      seedExecutionUpdates ||
      planDraft ||
      planStatus ||
      structuredPlanningSession ||
      structuredPlanningSessionPlan
    ) {
      const chats = await convex.query(api.chats.list, { projectId })
      const existingChat = chats[0]
      chatId =
        existingChat?._id ??
        (await convex.mutation(api.chats.create, {
          projectId,
          title: DEFAULT_CHAT_TITLE,
          mode: 'build',
        }))
    }

    if (chatId && (planDraft || planStatus)) {
      await convex.mutation(api.chats.update, {
        id: chatId,
        ...(planDraft ? { planDraft } : {}),
        ...(planStatus ? { planStatus } : {}),
        ...(planDraft ? { planLastGeneratedAt: Date.now() } : {}),
      })
    }

    let planningSessionId: string | undefined
    let structuredGeneratedPlan: GeneratedPlanArtifact | undefined
    if (chatId && (structuredPlanningSession || structuredPlanningSessionPlan)) {
      const seededStructuredSession = await seedStructuredPlanningSession({
        convex,
        chatId,
        fixtureName,
        planSeed: structuredPlanningSessionPlan,
        acceptPlan: acceptStructuredPlan,
      })
      planningSessionId = seededStructuredSession.sessionId
      structuredGeneratedPlan = seededStructuredSession.generatedPlan
    }

    if (filePath) {
      const existingFile = await convex.query(api.files.getByPath, { projectId, path: filePath })
      await convex.mutation(api.files.upsert, {
        ...(existingFile?._id ? { id: existingFile._id } : {}),
        projectId,
        path: filePath,
        content: fileContent,
        isBinary: false,
      })
    }

    if (chatId && filePath && artifactContent !== null) {
      await convex.mutation(api.artifacts.create, {
        chatId,
        actions: [
          {
            type: 'file_write',
            payload: {
              filePath,
              content: artifactContent,
              originalContent: fileContent,
            },
          },
        ],
        status: 'pending',
      })
    }

    let sessionID: string | undefined
    if (seedRuntimeCheckpoint && chatId) {
      sessionID = `harness_run_resume_fixture_${Date.now()}`
      await convex.mutation(api.agentRuns.saveRuntimeCheckpoint, {
        chatId,
        checkpoint: buildSeededRuntimeCheckpoint(sessionID),
      })
    }

    if (seedExecutionUpdates && chatId) {
      const projectRecord = (await convex.query(api.projects.get, {
        id: projectId,
      })) as { createdBy: Id<'users'> } | null
      if (!projectRecord) {
        throw new Error('Fixture project not found while seeding execution updates')
      }

      const runId = await convex.mutation(api.agentRuns.create, {
        projectId,
        chatId,
        userId: projectRecord.createdBy,
        mode: 'build',
        provider: 'openai',
        model: 'fixture-model',
        userMessage: 'Seed execution updates',
      })

      await convex.mutation(api.agentRuns.appendEvents, {
        runId,
        events: buildSeededExecutionEvents(),
      })

      await convex.mutation(api.agentRuns.complete, {
        runId,
        summary: 'Seeded execution update history',
      })
    }

    return NextResponse.json({
      projectId,
      created: !existing,
      ...(chatId ? { chatId } : {}),
      ...(filePath ? { filePath } : {}),
      ...(artifactContent !== null && filePath ? { artifactPath: filePath } : {}),
      ...(planStatus ? { planStatus } : {}),
      ...(planningSessionId ? { planningSessionId } : {}),
      ...(structuredGeneratedPlan
        ? {
            generatedPlanTitle: structuredGeneratedPlan.title,
            generatedPlanStatus: structuredGeneratedPlan.status,
            planTabPath: `plan:${planningSessionId}`,
          }
        : {}),
      ...(sessionID ? { sessionID } : {}),
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to create E2E fixture project',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
