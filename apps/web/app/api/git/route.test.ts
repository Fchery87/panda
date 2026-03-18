// apps/web/app/api/git/route.test.ts
import { describe, it, expect, mock } from 'bun:test'

mock.module('@convex-dev/auth/nextjs/server', () => ({
  isAuthenticatedNextjs: () => Promise.resolve(true),
}))

describe('POST /api/git', () => {
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
