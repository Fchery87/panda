import { beforeAll, describe, expect, it, mock } from 'bun:test'

let isAuthenticated = true

mock.module('@/lib/auth/nextjs', () => ({
  isAuthenticatedNextjs: async () => isAuthenticated,
}))

let POST: typeof import('../route').POST

beforeAll(async () => {
  ;({ POST } = await import('../route'))
})

function makeJsonRequest(body: unknown): Request {
  return new Request('http://localhost/api/providers/openai-compatible/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/providers/openai-compatible/test', () => {
  it('returns 401 when unauthenticated', async () => {
    isAuthenticated = false
    const response = await POST(makeJsonRequest({ apiKey: 'test-key', baseUrl: 'https://api.example.com/v1' }) as any)
    isAuthenticated = true

    expect(response.status).toBe(401)
  })

  it('returns 400 when API key is missing', async () => {
    const response = await POST(makeJsonRequest({ baseUrl: 'https://api.example.com/v1' }) as any)
    expect(response.status).toBe(400)
  })

  it('returns 400 when base URL is missing', async () => {
    const response = await POST(makeJsonRequest({ apiKey: 'test-key' }) as any)
    expect(response.status).toBe(400)
  })

  it('returns 400 for invalid URL', async () => {
    const response = await POST(
      makeJsonRequest({ apiKey: 'test-key', baseUrl: 'not-a-valid-url' }) as any
    )
    expect(response.status).toBe(400)
  })

  it('returns 400 for non-HTTPS URL', async () => {
    const response = await POST(
      makeJsonRequest({ apiKey: 'test-key', baseUrl: 'http://api.example.com/v1' }) as any
    )
    expect(response.status).toBe(400)
  })

  it('returns 400 for private-network base URLs', async () => {
    const response = await POST(
      makeJsonRequest({ apiKey: 'test-key', baseUrl: 'https://127.0.0.1/v1' }) as any
    )

    expect(response.status).toBe(400)
    const payload = (await response.json()) as { error: string }
    expect(payload.error).toContain('private')
  })
})
