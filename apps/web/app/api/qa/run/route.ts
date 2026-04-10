import { ConvexHttpClient } from 'convex/browser'
import { api } from '@convex/_generated/api'
import { NextResponse } from 'next/server'
import { convexAuthNextjsToken, isAuthenticatedNextjs } from '@/lib/auth/nextjs'
import { buildBrowserQaRunInput, normalizeBrowserQaResult, runBrowserQa } from '@/lib/qa/executor'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  if (!(await isAuthenticatedNextjs())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
  const convexToken = await convexAuthNextjsToken()
  if (!convexUrl || !convexToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as {
    projectId: string
    chatId: string
    taskId: string
    urlsTested: string[]
    filesInScope?: string[]
    flowNames: string[]
    environment?: string
    existingSession?: {
      browserSessionKey: string
      status: 'ready' | 'stale' | 'leased' | 'failed'
      leaseExpiresAt?: number
      updatedAt: number
    } | null
    baseUrl?: string
  }

  const convex = new ConvexHttpClient(convexUrl)
  convex.setAuth(convexToken)
  const qaContext = await convex.query(api.forge.getQaRunContext, {
    projectId: body.projectId as never,
    chatId: body.chatId as never,
    taskId: body.taskId as never,
  })

  const input = buildBrowserQaRunInput({
    projectId: body.projectId,
    chatId: body.chatId,
    taskId: body.taskId,
    urlsTested: body.urlsTested,
    filesInScope: body.filesInScope,
    flowNames: body.flowNames,
    environment: body.environment,
    existingSession: qaContext.browserSession ?? body.existingSession,
    baseUrl: body.baseUrl,
  })
  const result = await runBrowserQa(input)
  const normalized = normalizeBrowserQaResult(result)

  await convex.mutation(api.forge.upsertBrowserSession, {
    deliveryStateId: qaContext.deliveryStateId,
    projectId: body.projectId as never,
    environment: normalized.browserSession.environment,
    status: normalized.browserSession.status,
    browserSessionKey: normalized.browserSession.browserSessionKey,
    baseUrl: normalized.browserSession.baseUrl,
    lastUsedAt: normalized.browserSession.lastUsedAt,
    lastVerifiedAt: normalized.browserSession.lastVerifiedAt,
    lastRoutesTested: normalized.browserSession.lastRoutesTested,
    leaseOwner: normalized.browserSession.leaseOwner,
    leaseExpiresAt: normalized.browserSession.leaseExpiresAt,
  })

  return NextResponse.json({
    ...normalized,
    scenarioNames: normalized.evidence.scenarioNames,
    evidenceArtifacts: normalized.evidence.artifacts,
  })
}
