import { beforeAll, describe, expect, it, mock } from 'bun:test'

let isAuthenticated = true

mock.module('@convex-dev/auth/nextjs/server', () => ({
  isAuthenticatedNextjs: async () => isAuthenticated,
}))

let POST: typeof import('./route').POST

beforeAll(async () => {
  ;({ POST } = await import('./route'))
})

function makeJsonRequest(body: unknown): Request {
  return new Request('http://localhost/api/providers/chutes/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('/api/providers/chutes/test route', () => {
  it('returns 401 when unauthenticated', async () => {
    isAuthenticated = false
    const response = await POST(makeJsonRequest({ apiKey: 'test-key' }))
    isAuthenticated = true

    expect(response.status).toBe(401)
    const payload = (await response.json()) as { error: string }
    expect(payload.error).toContain('Unauthorized')
  })

  it('rejects unsupported base URLs', async () => {
    const response = await POST(
      makeJsonRequest({
        apiKey: 'test-key',
        baseUrl: 'https://evil.example.com/v1',
      })
    )

    expect(response.status).toBe(400)
    const payload = (await response.json()) as { error: string }
    expect(payload.error).toContain('Unsupported base URL')
  })
})
