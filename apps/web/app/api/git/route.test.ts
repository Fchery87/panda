// apps/web/app/api/git/route.test.ts
import { describe, it, expect, mock } from 'bun:test'

mock.module('@/lib/auth/nextjs', () => ({
  isAuthenticatedNextjs: () => Promise.resolve(true),
}))

process.env.PANDA_ENABLE_LOCAL_WORKSPACE_API = 'true'

describe('POST /api/git', () => {
  it('returns 404 when local workspace APIs are not enabled', async () => {
    delete process.env.PANDA_ENABLE_LOCAL_WORKSPACE_API

    const { POST } = await import('./route')
    const req = new Request('http://localhost/api/git', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'status' }),
    })

    const res = await POST(req)
    process.env.PANDA_ENABLE_LOCAL_WORKSPACE_API = 'true'
    expect(res.status).toBe(404)
  })

  it('supports status command', async () => {
    const { POST } = await import('./route')
    const req = new Request('http://localhost/api/git', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'status' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('branch')
    expect(body).toHaveProperty('staged')
    expect(body).toHaveProperty('unstaged')
    expect(body).toHaveProperty('untracked')
  })

  it('supports log command', async () => {
    const { POST } = await import('./route')
    const req = new Request('http://localhost/api/git', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'log', limit: 5 }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('commits')
    expect(Array.isArray(body.commits)).toBe(true)
  })

  it('supports branch-list command', async () => {
    const { POST } = await import('./route')
    const req = new Request('http://localhost/api/git', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'branch-list' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('branches')
    expect(body).toHaveProperty('current')
  })

  it('rejects unsupported commands', async () => {
    const { POST } = await import('./route')
    const req = new Request('http://localhost/api/git', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'push --force' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
