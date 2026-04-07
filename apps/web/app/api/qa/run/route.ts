import { NextResponse } from 'next/server'
import { buildBrowserQaRunInput, normalizeBrowserQaResult, runBrowserQa } from '@/lib/qa/executor'

export const runtime = 'nodejs'

export async function POST(request: Request) {
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

  const input = buildBrowserQaRunInput({
    projectId: body.projectId,
    chatId: body.chatId,
    taskId: body.taskId,
    urlsTested: body.urlsTested,
    filesInScope: body.filesInScope,
    flowNames: body.flowNames,
    environment: body.environment,
    existingSession: body.existingSession,
    baseUrl: body.baseUrl,
  })
  const result = await runBrowserQa(input)
  const normalized = normalizeBrowserQaResult(result)

  return NextResponse.json(normalized)
}
