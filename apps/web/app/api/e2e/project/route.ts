import { NextResponse } from 'next/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import type { PlanStatus } from '@/lib/chat/planDraft'

const DEFAULT_FIXTURE_NAME = 'Workbench E2E Fixture'
const DEFAULT_FIXTURE_DESCRIPTION = 'Deterministic browser E2E fixture project'
const DEFAULT_CHAT_TITLE = 'Workbench E2E Chat'
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

function isE2EFixtureModeEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.E2E_AUTH_BYPASS === 'true'
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

export async function GET(request: Request) {
  if (!isE2EFixtureModeEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!convexUrl) {
    return NextResponse.json({ error: 'Convex URL not configured' }, { status: 500 })
  }

  const url = new URL(request.url)
  const fixtureName = url.searchParams.get('name')?.trim() || DEFAULT_FIXTURE_NAME
  const filePath = url.searchParams.get('filePath')?.trim() || null
  const fileContent = url.searchParams.get('fileContent') ?? ''
  const seedRuntimeCheckpoint = url.searchParams.get('seedRuntimeCheckpoint') === '1'
  const planDraft = url.searchParams.get('planDraft')?.trim() || null
  const requestedPlanStatus = url.searchParams.get('planStatus')?.trim() || null
  const planStatus =
    requestedPlanStatus && PLAN_STATUSES.includes(requestedPlanStatus as PlanStatus)
      ? (requestedPlanStatus as PlanStatus)
      : null

  const convex = new ConvexHttpClient(convexUrl)
  const projects = await convex.query(api.projects.list, {})
  const existing = projects.find((project) => project.name === fixtureName)

  const projectId = existing
    ? existing._id
    : await convex.mutation(api.projects.create, {
        name: fixtureName,
        description: DEFAULT_FIXTURE_DESCRIPTION,
      })

  let chatId: Id<'chats'> | undefined
  if (filePath || seedRuntimeCheckpoint || planDraft || planStatus) {
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

  let sessionID: string | undefined
  if (seedRuntimeCheckpoint && chatId) {
    sessionID = `harness_run_resume_fixture_${Date.now()}`
    await convex.mutation(api.agentRuns.saveRuntimeCheckpoint, {
      chatId,
      checkpoint: buildSeededRuntimeCheckpoint(sessionID),
    })
  }

  return NextResponse.json({
    projectId,
    created: !existing,
    ...(chatId ? { chatId } : {}),
    ...(filePath ? { filePath } : {}),
    ...(planStatus ? { planStatus } : {}),
    ...(sessionID ? { sessionID } : {}),
  })
}
