import { describe, expect, mock, test } from 'bun:test'

const queryCalls: Array<{ name: string; args: Record<string, unknown> }> = []
const mutationCalls: Array<{ name: string; args: Record<string, unknown> }> = []

let queryResult: unknown = []
let mutationResult: unknown = 'project-created'

class MockConvexHttpClient {
  constructor(_url: string) {}

  query(func: unknown, args: Record<string, unknown>) {
    queryCalls.push({ name: getFunctionLabel(func), args })
    return Promise.resolve(queryResult)
  }

  mutation(func: unknown, args: Record<string, unknown>) {
    mutationCalls.push({ name: getFunctionLabel(func), args })
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

mock.module('convex/browser', () => ({
  ConvexHttpClient: MockConvexHttpClient,
}))

describe('/api/e2e/project route', () => {
  const env = process.env as Record<string, string | undefined>
  const originalEnv = {
    NODE_ENV: env.NODE_ENV,
    E2E_AUTH_BYPASS: env.E2E_AUTH_BYPASS,
    NEXT_PUBLIC_CONVEX_URL: env.NEXT_PUBLIC_CONVEX_URL,
  }

  function setTestEnv() {
    queryCalls.length = 0
    mutationCalls.length = 0
    queryResult = []
    mutationResult = 'project-created'
    env.NODE_ENV = 'test'
    env.E2E_AUTH_BYPASS = 'true'
    env.NEXT_PUBLIC_CONVEX_URL = 'https://example.convex.cloud'
  }

  function restoreEnv() {
    env.NODE_ENV = originalEnv.NODE_ENV
    env.E2E_AUTH_BYPASS = originalEnv.E2E_AUTH_BYPASS
    env.NEXT_PUBLIC_CONVEX_URL = originalEnv.NEXT_PUBLIC_CONVEX_URL
  }

  test('rejects when E2E bypass is disabled', async () => {
    setTestEnv()
    env.E2E_AUTH_BYPASS = 'false'
    try {
      const { GET } = await import('./route')

      const response = await GET(new Request('http://localhost:3000/api/e2e/project'))

      expect(response.status).toBe(404)
    } finally {
      restoreEnv()
    }
  })

  test('returns an existing fixture project id when present', async () => {
    setTestEnv()
    queryResult = [{ _id: 'project-existing', name: 'Workbench E2E Fixture' }]
    try {
      const { GET } = await import('./route')

      const response = await GET(
        new Request('http://localhost:3000/api/e2e/project?name=Workbench%20E2E%20Fixture')
      )

      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toEqual({
        projectId: 'project-existing',
        created: false,
      })
      expect(queryCalls).toHaveLength(1)
      expect(mutationCalls).toHaveLength(0)
    } finally {
      restoreEnv()
    }
  })

  test('creates a fixture project when none exists', async () => {
    setTestEnv()
    try {
      const { GET } = await import('./route')

      const response = await GET(new Request('http://localhost:3000/api/e2e/project'))

      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toEqual({
        projectId: 'project-created',
        created: true,
      })
      expect(queryCalls).toHaveLength(1)
      expect(mutationCalls).toHaveLength(1)
      expect(mutationCalls[0]?.args).toMatchObject({
        name: 'Workbench E2E Fixture',
        description: 'Deterministic browser E2E fixture project',
      })
    } finally {
      restoreEnv()
    }
  })
})
