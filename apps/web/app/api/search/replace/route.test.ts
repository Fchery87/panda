// apps/web/app/api/search/replace/route.test.ts
import { describe, it, expect, mock } from 'bun:test'

let isAuthenticated = true

// Mock auth
mock.module('@/lib/auth/nextjs', () => ({
  isAuthenticatedNextjs: () => Promise.resolve(isAuthenticated),
}))

process.env.PANDA_ENABLE_LOCAL_WORKSPACE_API = 'true'

describe('POST /api/search/replace', () => {
  it('rejects unauthenticated requests', async () => {
    isAuthenticated = false

    const { POST } = await import('./route')
    const req = new Request('http://localhost/api/search/replace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath: 'test.ts', searchText: 'a', replaceText: 'b' }),
    })
    const res = await POST(req)
    isAuthenticated = true
    expect(res.status).toBe(401)
  })

  it('returns 404 when local workspace APIs are not enabled', async () => {
    delete process.env.PANDA_ENABLE_LOCAL_WORKSPACE_API

    const { POST } = await import('./route')
    const req = new Request('http://localhost/api/search/replace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath: 'test.ts', searchText: 'a', replaceText: 'b' }),
    })

    const res = await POST(req)
    process.env.PANDA_ENABLE_LOCAL_WORKSPACE_API = 'true'
    expect(res.status).toBe(404)
  })

  it('rejects missing required fields', async () => {
    const { POST } = await import('./route')
    const req = new Request('http://localhost/api/search/replace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath: 'test.ts' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('rejects absolute sibling paths that only share the workspace prefix', async () => {
    const { POST } = await import('./route')
    const siblingPath = `${process.cwd()}-sibling/package.json`
    const req = new Request('http://localhost/api/search/replace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filePath: siblingPath,
        searchText: 'panda',
        replaceText: 'bear',
      }),
    })

    const res = await POST(req)
    const body = (await res.json()) as { error?: string }

    expect(res.status).toBe(400)
    expect(body.error).toBe('Path traversal not allowed')
  })
})
