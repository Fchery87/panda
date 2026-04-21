import { describe, expect, mock, test } from 'bun:test'

const queryCalls: Array<{ name: string; args: Record<string, unknown> }> = []
const mutationCalls: Array<{ name: string; args: Record<string, unknown> }> = []

let queryResult: unknown = []
let mutationResult: unknown = 'project-created'
let queryError: Error | null = null
let mutationError: Error | null = null
let queryImpl:
  | ((func: unknown, args: Record<string, unknown>) => Promise<unknown> | unknown)
  | null = null
let mutationImpl:
  | ((func: unknown, args: Record<string, unknown>) => Promise<unknown> | unknown)
  | null = null

class MockConvexHttpClient {
  constructor(_url: string) {}

  query(func: unknown, args: Record<string, unknown>) {
    queryCalls.push({ name: getFunctionLabel(func), args })
    if (queryImpl) {
      return Promise.resolve(queryImpl(func, args))
    }
    if (queryError) {
      return Promise.reject(queryError)
    }
    return Promise.resolve(queryResult)
  }

  mutation(func: unknown, args: Record<string, unknown>) {
    mutationCalls.push({ name: getFunctionLabel(func), args })
    if (mutationImpl) {
      return Promise.resolve(mutationImpl(func, args))
    }
    if (mutationError) {
      return Promise.reject(mutationError)
    }
    return Promise.resolve(mutationResult)
  }
}

function getFunctionLabel(func: unknown): string {
  if (typeof func === 'string') return func
  if (func && typeof func === 'object' && '_name' in func && typeof func._name === 'string') {
    return func._name
  }
  return 'convex-function'
}

async function importFreshRoute() {
  return await import(`./route?test=${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
}

mock.module('convex/browser', () => ({
  ConvexHttpClient: MockConvexHttpClient,
}))

describe('/api/e2e/project route', () => {
  const env = process.env as Record<string, string | undefined>
  const originalEnv = {
    NODE_ENV: env.NODE_ENV,
    E2E_AUTH_BYPASS_SECRET: env.E2E_AUTH_BYPASS_SECRET,
    NEXT_PUBLIC_CONVEX_URL: env.NEXT_PUBLIC_CONVEX_URL,
  }

  function setTestEnv() {
    queryCalls.length = 0
    mutationCalls.length = 0
    queryResult = []
    mutationResult = 'project-created'
    queryError = null
    mutationError = null
    queryImpl = null
    mutationImpl = null
    env.NODE_ENV = 'test'
    env.E2E_AUTH_BYPASS_SECRET = 'test-e2e-secret'
    env.NEXT_PUBLIC_CONVEX_URL = 'https://example.convex.cloud'
  }

  function restoreEnv() {
    env.NODE_ENV = originalEnv.NODE_ENV
    env.E2E_AUTH_BYPASS_SECRET = originalEnv.E2E_AUTH_BYPASS_SECRET
    env.NEXT_PUBLIC_CONVEX_URL = originalEnv.NEXT_PUBLIC_CONVEX_URL
  }

  test('rejects when E2E bypass is disabled', async () => {
    setTestEnv()
    env.E2E_AUTH_BYPASS_SECRET = undefined
    try {
      const { GET } = await importFreshRoute()

      const response = await GET(
        new Request('http://localhost:3000/api/e2e/project?e2eBypassSecret=test-e2e-secret')
      )

      expect(response.status).toBe(404)
    } finally {
      restoreEnv()
    }
  })

  test('returns an existing fixture project id when present', async () => {
    setTestEnv()
    queryResult = [{ _id: 'project-existing', name: 'Workbench E2E Fixture' }]
    try {
      const { GET } = await importFreshRoute()

      const response = await GET(
        new Request(
          'http://localhost:3000/api/e2e/project?name=Workbench%20E2E%20Fixture&e2eBypassSecret=test-e2e-secret'
        )
      )

      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toEqual({
        projectId: 'project-existing',
        created: false,
      })
      expect(queryCalls).toHaveLength(2)
      expect(mutationCalls).toHaveLength(0)
    } finally {
      restoreEnv()
    }
  })

  test('creates a fixture project when none exists', async () => {
    setTestEnv()
    try {
      const { GET } = await importFreshRoute()

      const response = await GET(
        new Request('http://localhost:3000/api/e2e/project?e2eBypassSecret=test-e2e-secret')
      )

      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toEqual({
        projectId: 'project-created',
        created: true,
      })
      expect(queryCalls).toHaveLength(2)
      expect(mutationCalls).toHaveLength(1)
      expect(mutationCalls[0]?.args).toMatchObject({
        name: 'Workbench E2E Fixture',
        description: 'Deterministic browser E2E fixture project',
      })
    } finally {
      restoreEnv()
    }
  })

  test('can reclaim one fixture slot without creating a project when ensureCapacity is requested', async () => {
    setTestEnv()
    const projectsAtLimit = Array.from({ length: 100 }, (_, index) => ({
      _id: `fixture-${index}`,
      name: `Workbench Smoke ${index}`,
      description: 'Deterministic browser E2E fixture project',
      createdAt: index + 1,
      lastOpenedAt: index + 1,
    }))

    queryImpl = () => {
      const queryIndex = queryCalls.length
      if (queryIndex === 1) {
        return projectsAtLimit
      }
      if (queryIndex === 2) {
        return { maxProjectsPerUser: 100 }
      }
      if (queryIndex === 3) {
        return projectsAtLimit.filter((project) => project._id !== 'fixture-0')
      }
      return []
    }

    mutationImpl = (_func, args) => {
      if ('id' in args) {
        expect(args).toEqual({ id: 'fixture-0' })
        return 'fixture-0'
      }
      throw new Error(`Unexpected mutation call: ${JSON.stringify(args)}`)
    }

    try {
      const { GET } = await importFreshRoute()

      const response = await GET(
        new Request(
          'http://localhost:3000/api/e2e/project?ensureCapacity=1&e2eBypassSecret=test-e2e-secret'
        )
      )

      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toEqual({
        ensuredCapacity: true,
        cleanedUpProjectId: 'fixture-0',
      })
      expect(
        mutationCalls.filter((call) => 'name' in call.args && 'description' in call.args)
      ).toHaveLength(0)
    } finally {
      restoreEnv()
    }
  })

  test('seeds a chat, file, and runtime checkpoint when requested', async () => {
    setTestEnv()
    queryResult = [{ _id: 'project-existing', name: 'Workbench E2E Fixture' }]
    mutationResult = 'checkpoint-created'
    try {
      const { GET } = await importFreshRoute()

      const response = await GET(
        new Request(
          'http://localhost:3000/api/e2e/project?name=Workbench%20E2E%20Fixture&filePath=e2e-fixture.ts&fileContent=export%20const%20value%20%3D%201%0A&seedRuntimeCheckpoint=1&e2eBypassSecret=test-e2e-secret'
        )
      )

      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toMatchObject({
        projectId: 'project-existing',
        created: false,
        chatId: expect.any(String),
        filePath: 'e2e-fixture.ts',
        sessionID: expect.stringContaining('harness_run_resume_fixture_'),
      })
      expect(queryCalls).toHaveLength(4)
      expect(mutationCalls).toHaveLength(2)
      expect(mutationCalls[0]?.args).toMatchObject({
        projectId: 'project-existing',
        path: 'e2e-fixture.ts',
        content: 'export const value = 1\n',
        isBinary: false,
      })
      expect(mutationCalls[1]?.args).toMatchObject({
        chatId: expect.any(String),
        checkpoint: expect.objectContaining({
          version: 1,
          sessionID: expect.stringContaining('harness_run_resume_fixture_'),
        }),
      })
    } finally {
      restoreEnv()
    }
  })

  test('seeds a pending file artifact when requested', async () => {
    setTestEnv()
    queryResult = [{ _id: 'project-existing', name: 'Workbench E2E Fixture' }]
    mutationResult = 'artifact-created'
    try {
      const { GET } = await importFreshRoute()

      const response = await GET(
        new Request(
          'http://localhost:3000/api/e2e/project?name=Workbench%20E2E%20Fixture&filePath=e2e-artifact.ts&fileContent=export%20const%20value%20%3D%201%0A&artifactContent=export%20const%20value%20%3D%202%0A&e2eBypassSecret=test-e2e-secret'
        )
      )

      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toMatchObject({
        projectId: 'project-existing',
        created: false,
        chatId: expect.any(String),
        filePath: 'e2e-artifact.ts',
        artifactPath: 'e2e-artifact.ts',
      })
      const artifactMutation = mutationCalls.find(
        (call) =>
          call.args &&
          'actions' in call.args &&
          Array.isArray(call.args.actions) &&
          call.args.status === 'pending'
      )
      expect(artifactMutation).toBeTruthy()
      expect(artifactMutation?.args).toMatchObject({
        chatId: expect.any(String),
        status: 'pending',
        actions: [
          {
            type: 'file_write',
            payload: {
              filePath: 'e2e-artifact.ts',
              content: 'export const value = 2\n',
              originalContent: 'export const value = 1\n',
            },
          },
        ],
      })
    } finally {
      restoreEnv()
    }
  })

  test('sets a project agent policy override when requested', async () => {
    setTestEnv()
    queryResult = [{ _id: 'project-existing', name: 'Workbench E2E Fixture' }]
    try {
      const { GET } = await importFreshRoute()

      const response = await GET(
        new Request(
          'http://localhost:3000/api/e2e/project?name=Workbench%20E2E%20Fixture&autoApplyFiles=0&autoRunCommands=0&e2eBypassSecret=test-e2e-secret'
        )
      )

      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toMatchObject({
        projectId: 'project-existing',
        created: false,
      })
      expect(mutationCalls).toContainEqual({
        name: expect.any(String),
        args: {
          id: 'project-existing',
          agentPolicy: {
            autoApplyFiles: false,
            autoRunCommands: false,
            allowedCommandPrefixes: [],
          },
        },
      })
    } finally {
      restoreEnv()
    }
  })

  test('seeds a chat with plan workflow metadata when requested', async () => {
    setTestEnv()
    queryResult = [{ _id: 'project-existing', name: 'Workbench E2E Fixture' }]
    mutationResult = 'chat-updated'
    try {
      const { GET } = await importFreshRoute()

      const response = await GET(
        new Request(
          'http://localhost:3000/api/e2e/project?name=Workbench%20E2E%20Fixture&planStatus=awaiting_review&planDraft=%23%23%20Goal%0ASeed%20the%20plan%20artifact%0A%0A%23%23%20Implementation%20Plan%0A1.%20Open%20the%20plan%20panel%0A2.%20Approve%20the%20plan&e2eBypassSecret=test-e2e-secret'
        )
      )

      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toMatchObject({
        projectId: 'project-existing',
        created: false,
        chatId: expect.any(String),
        planStatus: 'awaiting_review',
      })
      expect(queryCalls).toHaveLength(3)
      expect(mutationCalls).toHaveLength(1)
      expect(mutationCalls[0]).toMatchObject({
        name: expect.any(String),
        args: {
          id: expect.any(String),
          planStatus: 'awaiting_review',
          planDraft:
            '## Goal\nSeed the plan artifact\n\n## Implementation Plan\n1. Open the plan panel\n2. Approve the plan',
          planLastGeneratedAt: expect.any(Number),
        },
      })
    } finally {
      restoreEnv()
    }
  })

  test('seeds a structured planning session with a generated plan artifact when requested', async () => {
    setTestEnv()
    queryImpl = () => {
      const queryIndex = queryCalls.length
      if (queryIndex === 1) {
        return [{ _id: 'project-existing', name: 'Workbench E2E Fixture' }]
      }
      if (queryIndex === 2) {
        return { maxProjectsPerUser: 100 }
      }
      if (queryIndex === 3) {
        return []
      }
      return []
    }

    mutationImpl = (_func, args) => {
      if ('title' in args && 'mode' in args) {
        expect(args).toMatchObject({
          projectId: 'project-existing',
          title: 'Workbench E2E Chat',
          mode: 'build',
        })
        return 'chat-existing'
      }
      if ('questions' in args) {
        expect(args).toMatchObject({
          chatId: 'chat-existing',
          questions: expect.arrayContaining([
            expect.objectContaining({
              id: 'outcome',
              title: 'Outcome',
            }),
          ]),
        })
        return 'planning-session-123'
      }
      if ('questionId' in args) {
        expect(args).toMatchObject({
          sessionId: 'planning-session-123',
          source: 'suggestion',
        })
        return 'planning-session-123'
      }
      if ('generatedPlan' in args) {
        expect(args).toMatchObject({
          sessionId: 'planning-session-123',
          generatedPlan: expect.objectContaining({
            chatId: 'chat-existing',
            sessionId: 'planning-session-123',
            title: 'Structured Fixture Plan',
            status: 'ready_for_review',
          }),
        })
        return 'planning-session-123'
      }
      throw new Error(`Unexpected mutation call: ${JSON.stringify(args)}`)
    }

    try {
      const { GET } = await importFreshRoute()

      const response = await GET(
        new Request(
          'http://localhost:3000/api/e2e/project?name=Workbench%20E2E%20Fixture&structuredPlanningSession=1&structuredPlanningSessionPlan=%7B%22title%22%3A%22Structured%20Fixture%20Plan%22%2C%22summary%22%3A%22Seeded%20structured%20plan%22%2C%22acceptanceChecks%22%3A%5B%22Workspace%20plan%20tab%20opens%22%5D%7D&e2eBypassSecret=test-e2e-secret'
        )
      )

      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toMatchObject({
        projectId: 'project-existing',
        created: false,
        chatId: 'chat-existing',
        planningSessionId: 'planning-session-123',
        generatedPlanTitle: 'Structured Fixture Plan',
        generatedPlanStatus: 'ready_for_review',
        planTabPath: 'plan:planning-session-123',
      })

      expect(
        mutationCalls.filter((call) => 'questionId' in call.args && 'source' in call.args)
      ).toHaveLength(4)
      expect(mutationCalls.some((call) => 'generatedPlan' in call.args)).toBe(true)
    } finally {
      restoreEnv()
    }
  })

  test('returns a structured 500 response when fixture bootstrap fails', async () => {
    setTestEnv()
    mutationError = new Error('Unauthorized: Authentication required')
    try {
      const { GET } = await importFreshRoute()

      const response = await GET(
        new Request('http://localhost:3000/api/e2e/project?e2eBypassSecret=test-e2e-secret')
      )

      expect(response.status).toBe(500)
      await expect(response.json()).resolves.toEqual({
        error: 'Failed to create E2E fixture project',
        details: 'Unauthorized: Authentication required',
      })
    } finally {
      restoreEnv()
    }
  })

  test('reclaims the oldest E2E fixture project and retries when the project limit is reached', async () => {
    setTestEnv()
    queryResult = [
      {
        _id: 'fixture-oldest',
        name: 'Agent Run Plan 1',
        description: 'Deterministic browser E2E fixture project',
        createdAt: 100,
        lastOpenedAt: 100,
      },
      {
        _id: 'fixture-newer',
        name: 'Sharing Fixture 2',
        description: 'Deterministic browser E2E fixture project',
        createdAt: 200,
        lastOpenedAt: 200,
      },
    ]
    let createAttempts = 0
    mutationImpl = (_func, args) => {
      if ('name' in args && 'description' in args) {
        createAttempts += 1
        if (createAttempts === 1) {
          throw new Error(
            'Project limit reached. You have 172 projects (maximum: 100). Please delete an existing project before creating a new one.'
          )
        }
        return 'project-created-after-cleanup'
      }
      if ('id' in args) {
        expect(args).toEqual({ id: 'fixture-oldest' })
        return 'fixture-oldest'
      }
      return mutationResult
    }

    try {
      const { GET } = await importFreshRoute()

      const response = await GET(
        new Request('http://localhost:3000/api/e2e/project?e2eBypassSecret=test-e2e-secret')
      )

      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toEqual({
        projectId: 'project-created-after-cleanup',
        created: true,
      })
      expect(createAttempts).toBe(2)
      expect(mutationCalls.some((call) => 'id' in call.args)).toBe(true)
    } finally {
      restoreEnv()
    }
  })

  test('reclaims legacy browser-test projects without the default fixture description', async () => {
    setTestEnv()
    queryResult = [
      {
        _id: 'legacy-dashboard-project',
        name: 'Test Project 1700000000000',
        createdAt: 100,
        lastOpenedAt: 100,
      },
    ]
    let createAttempts = 0
    mutationImpl = (_func, args) => {
      if ('name' in args && 'description' in args) {
        createAttempts += 1
        if (createAttempts === 1) {
          throw new Error(
            'Project limit reached. You have 100 projects (maximum: 100). Please delete an existing project before creating a new one.'
          )
        }
        return 'project-created-after-legacy-cleanup'
      }
      if ('id' in args) {
        expect(args).toEqual({ id: 'legacy-dashboard-project' })
        return 'legacy-dashboard-project'
      }
      return mutationResult
    }

    try {
      const { GET } = await importFreshRoute()

      const response = await GET(
        new Request('http://localhost:3000/api/e2e/project?e2eBypassSecret=test-e2e-secret')
      )

      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toEqual({
        projectId: 'project-created-after-legacy-cleanup',
        created: true,
      })
      expect(createAttempts).toBe(2)
      expect(mutationCalls.some((call) => 'id' in call.args)).toBe(true)
    } finally {
      restoreEnv()
    }
  })

  test('reclaims an old fixture before create when already at the project limit', async () => {
    setTestEnv()
    const projectsAtLimit = Array.from({ length: 100 }, (_, index) => ({
      _id: `fixture-${index}`,
      name: `Workbench Smoke ${index}`,
      description: 'Deterministic browser E2E fixture project',
      createdAt: index + 1,
      lastOpenedAt: index + 1,
    }))

    let removedOldFixture = false
    queryImpl = () => {
      const queryIndex = queryCalls.length
      if (queryIndex === 1) {
        return projectsAtLimit
      }
      if (queryIndex === 2) {
        return { maxProjectsPerUser: 100 }
      }
      if (queryIndex === 3) {
        return projectsAtLimit.filter((project) => project._id !== 'fixture-0')
      }
      return []
    }

    mutationImpl = (func, args) => {
      if ('id' in args) {
        expect(args).toEqual({ id: 'fixture-0' })
        removedOldFixture = true
        return 'fixture-0'
      }
      if ('name' in args && 'description' in args) {
        expect(removedOldFixture).toBe(true)
        return 'project-created-after-proactive-cleanup'
      }
      return mutationResult
    }

    try {
      const { GET } = await importFreshRoute()

      const response = await GET(
        new Request(
          'http://localhost:3000/api/e2e/project?name=Loop%20Debug%20Fixture&e2eBypassSecret=test-e2e-secret'
        )
      )

      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toEqual({
        projectId: 'project-created-after-proactive-cleanup',
        created: true,
      })

      expect(
        mutationCalls.filter((call) => 'name' in call.args && 'description' in call.args)
      ).toHaveLength(1)
    } finally {
      restoreEnv()
    }
  })
})
