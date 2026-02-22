import { beforeAll, describe, expect, it, mock } from 'bun:test'
import type { NextRequest } from 'next/server'

let isAuthenticated = true

mock.module('@convex-dev/auth/nextjs/server', () => ({
  isAuthenticatedNextjs: async () => isAuthenticated,
}))

let POST: typeof import('./route').POST

beforeAll(async () => {
  ;({ POST } = await import('./route'))
})

function makeJsonRequest(body: unknown): NextRequest {
  const request = new Request('http://localhost/api/jobs/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return request as unknown as NextRequest
}

describe('/api/jobs/execute route', () => {
  it('returns 401 when unauthenticated', async () => {
    isAuthenticated = false
    const response = await POST(makeJsonRequest({ command: 'pwd' }))
    isAuthenticated = true

    expect(response.status).toBe(401)
    const payload = (await response.json()) as { error: string }
    expect(payload.error).toContain('Unauthorized')
  })

  it('rejects shell operators before execution', async () => {
    const response = await POST(makeJsonRequest({ command: 'pwd && ls' }))

    expect(response.status).toBe(400)
    const payload = (await response.json()) as { error: string }
    expect(payload.error).toContain('Shell operators')
  })

  it('rejects non-allowlisted commands', async () => {
    const response = await POST(makeJsonRequest({ command: 'curl https://example.com' }))

    expect(response.status).toBe(403)
    const payload = (await response.json()) as { error: string }
    expect(payload.error).toContain('Command not allowed')
  })
})
