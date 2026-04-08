import { describe, expect, mock, test } from 'bun:test'

type Call = { func: unknown; args: Record<string, unknown> }

let authState = true
let tokenState = 'convex-token'
let queryCalls: Call[] = []
let mutationCalls: Call[] = []
let buildInputCalls: Array<Record<string, unknown>> = []
let runCalls: Array<Record<string, unknown>> = []

mock.module('@/lib/auth/nextjs', () => ({
  isAuthenticatedNextjs: async () => authState,
  convexAuthNextjsToken: async () => tokenState,
}))

mock.module('convex/browser', () => ({
  ConvexHttpClient: class {
    setAuth(_token: string) {}

    async query(func: unknown, args: Record<string, unknown>) {
      queryCalls.push({ func, args })
      return {
        deliveryStateId: 'delivery-state-1',
        browserSession: {
          browserSessionKey: 'browser-session::persisted',
          status: 'ready',
          updatedAt: 100,
        },
      }
    }

    async mutation(func: unknown, args: Record<string, unknown>) {
      mutationCalls.push({ func, args })
      return 'browser-session-row-1'
    }
  },
}))

mock.module('@convex/_generated/api', () => ({
  api: {
    forge: {
      getQaRunContext: 'forge.getQaRunContext',
      upsertBrowserSession: 'forge.upsertBrowserSession',
    },
  },
}))

mock.module('@/lib/qa/executor', () => ({
  buildBrowserQaRunInput: (args: Record<string, unknown>) => {
    buildInputCalls.push(args)
    return {
      browserSessionKey: 'browser-session::persisted',
      sessionStrategy: 'reuse' as const,
      environment: 'local',
      urlsTested: ['/projects/demo'],
      flowNames: ['task-panel-review-loop'],
      baseUrl: 'http://localhost:3000',
    }
  },
  runBrowserQa: async (args: Record<string, unknown>) => {
    runCalls.push(args)
    return {
      browserSessionKey: 'browser-session::persisted',
      sessionStrategy: 'reuse' as const,
      sessionStatus: 'ready' as const,
      environment: 'local',
      baseUrl: 'http://localhost:3000',
      urlsTested: ['/projects/demo'],
      flowNames: ['task-panel-review-loop'],
      assertions: [{ label: 'Task panel rendered', status: 'passed' as const }],
      consoleErrors: [],
      networkFailures: [],
      screenshotPath: '/tmp/shot.png',
      lastUsedAt: 200,
      lastVerifiedAt: 200,
    }
  },
  normalizeBrowserQaResult: () => ({
    browserSessionKey: 'browser-session::persisted',
    browserSession: {
      browserSessionKey: 'browser-session::persisted',
      status: 'ready' as const,
      environment: 'local',
      baseUrl: 'http://localhost:3000',
      lastRoutesTested: ['/projects/demo'],
      lastUsedAt: 200,
      lastVerifiedAt: 200,
    },
    decision: 'pass' as const,
    summary: 'QA passed',
    assertions: [{ label: 'Task panel rendered', status: 'passed' as const }],
    evidence: {
      screenshotPath: '/tmp/shot.png',
      urlsTested: ['/projects/demo'],
      flowNames: ['task-panel-review-loop'],
      consoleErrors: [],
      networkFailures: [],
    },
    defects: [],
  }),
}))

function resetTestState() {
  authState = true
  tokenState = 'convex-token'
  queryCalls = []
  mutationCalls = []
  buildInputCalls = []
  runCalls = []
  process.env.NEXT_PUBLIC_CONVEX_URL = 'https://example.convex.cloud'
}

describe('POST /api/qa/run', () => {
  test('rejects unauthenticated requests', async () => {
    resetTestState()
    authState = false
    const { POST } = await import('./route')

    const response = await POST(
      new Request('http://localhost/api/qa/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    )

    expect(response.status).toBe(401)
    expect(queryCalls).toHaveLength(0)
    expect(runCalls).toHaveLength(0)
  })

  test('validates ownership through Convex and persists browser session metadata', async () => {
    resetTestState()
    const { POST } = await import('./route')

    const response = await POST(
      new Request('http://localhost/api/qa/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: 'project-1',
          chatId: 'chat-1',
          taskId: 'task-1',
          urlsTested: ['/projects/demo'],
          flowNames: ['task-panel-review-loop'],
        }),
      })
    )

    expect(response.status).toBe(200)
    expect(queryCalls).toHaveLength(1)
    expect(buildInputCalls).toHaveLength(1)
    expect(runCalls).toHaveLength(1)
    expect(mutationCalls).toHaveLength(1)
    expect(buildInputCalls[0]?.existingSession).toEqual({
      browserSessionKey: 'browser-session::persisted',
      status: 'ready',
      updatedAt: 100,
    })
    expect(mutationCalls[0]?.args.deliveryStateId).toBe('delivery-state-1')
    expect(mutationCalls[0]?.args.browserSessionKey).toBe('browser-session::persisted')
    expect(mutationCalls[0]?.args.lastRoutesTested).toEqual(['/projects/demo'])
  })
})
