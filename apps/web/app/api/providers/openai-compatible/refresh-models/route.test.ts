import { beforeAll, describe, expect, it, mock } from 'bun:test'

let isAuthenticated = true

mock.module('@/lib/auth/nextjs', () => ({
  isAuthenticatedNextjs: async () => isAuthenticated,
}))

let POST: typeof import('./route').POST

beforeAll(async () => {
  ;({ POST } = await import('./route'))
})

function makeJsonRequest(body: unknown): Request {
  return new Request('http://localhost/api/providers/openai-compatible/refresh-models', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/providers/openai-compatible/refresh-models', () => {
  it('returns 401 when unauthenticated', async () => {
    isAuthenticated = false
    const response = await POST(
      makeJsonRequest({ apiKey: 'test-key', baseUrl: 'https://api.example.com/v1' }) as any
    )
    isAuthenticated = true

    expect(response.status).toBe(401)
  })

  it('returns 400 for private-network base URLs', async () => {
    const response = await POST(
      makeJsonRequest({ apiKey: 'test-key', baseUrl: 'https://localhost/v1' }) as any
    )

    expect(response.status).toBe(400)
    const payload = (await response.json()) as { error: string }
    expect(payload.error).toContain('private')
  })
})
