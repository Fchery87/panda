import { describe, expect, mock, test } from 'bun:test'

const mutationCalls: Array<{ name: string; args: Record<string, unknown> }> = []

let mutationResult: unknown = { success: true, userId: 'user-admin' }
let mutationError: Error | null = null
let mutationImpl:
  | ((func: unknown, args: Record<string, unknown>) => Promise<unknown> | unknown)
  | null = null

class MockConvexHttpClient {
  constructor(_url: string) {}

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

  query() {
    return Promise.resolve(null)
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

describe('/api/e2e/admin route', () => {
  const env = process.env as Record<string, string | undefined>
  const originalEnv = {
    NODE_ENV: env.NODE_ENV,
    E2E_AUTH_BYPASS: env.E2E_AUTH_BYPASS,
    NEXT_PUBLIC_CONVEX_URL: env.NEXT_PUBLIC_CONVEX_URL,
  }

  function setTestEnv() {
    mutationCalls.length = 0
    mutationResult = { success: true, userId: 'user-admin' }
    mutationError = null
    mutationImpl = null
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
      const { POST } = await importFreshRoute()

      const response = await POST(
        new Request('http://localhost:3000/api/e2e/admin', { method: 'POST' })
      )

      expect(response.status).toBe(404)
    } finally {
      restoreEnv()
    }
  })

  test('promotes the E2E user to admin when bypass is enabled', async () => {
    setTestEnv()
    try {
      const { POST } = await importFreshRoute()

      const response = await POST(
        new Request('http://localhost:3000/api/e2e/admin', { method: 'POST' })
      )

      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toEqual({
        success: true,
        email: 'e2e@example.com',
        userId: 'user-admin',
      })
      expect(mutationCalls).toHaveLength(2)
      expect(mutationCalls[0]?.args).toMatchObject({
        email: 'e2e@example.com',
        name: 'E2E Admin',
        tokenIdentifier: 'e2e-admin-token',
      })
      expect(mutationCalls[1]?.args).toMatchObject({
        email: 'e2e@example.com',
      })
    } finally {
      restoreEnv()
    }
  })
})
