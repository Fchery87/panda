import { describe, expect, it, mock } from 'bun:test'

mock.module('@/lib/auth/nextjs', () => ({
  isAuthenticatedNextjs: () => Promise.resolve(true),
}))

process.env.PANDA_ENABLE_LOCAL_WORKSPACE_API = 'true'

function makeJsonRequest(body: unknown): Request {
  return new Request('http://localhost/api/git/diff', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/git/diff', () => {
  it('returns 404 when local workspace APIs are not enabled', async () => {
    delete process.env.PANDA_ENABLE_LOCAL_WORKSPACE_API

    const { POST } = await import('./route')
    const response = await POST(makeJsonRequest({ to: 'abcdef' }))
    process.env.PANDA_ENABLE_LOCAL_WORKSPACE_API = 'true'

    expect(response.status).toBe(404)
  })

  it('rejects invalid hashes when local workspace APIs are enabled', async () => {
    const { POST } = await import('./route')
    const response = await POST(makeJsonRequest({ to: 'HEAD;rm -rf .' }))

    expect(response.status).toBe(400)
    const payload = (await response.json()) as { error: string }
    expect(payload.error).toContain('Invalid diff hashes')
  })
})
