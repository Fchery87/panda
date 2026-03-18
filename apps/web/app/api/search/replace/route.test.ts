// apps/web/app/api/search/replace/route.test.ts
import { describe, it, expect, mock } from 'bun:test'

// Mock auth
mock.module('@convex-dev/auth/nextjs/server', () => ({
  isAuthenticatedNextjs: () => Promise.resolve(true),
}))

describe('POST /api/search/replace', () => {
  it('rejects unauthenticated requests', async () => {
    mock.module('@convex-dev/auth/nextjs/server', () => ({
      isAuthenticatedNextjs: () => Promise.resolve(false),
    }))

    const { POST } = await import('./route')
    const req = new Request('http://localhost/api/search/replace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath: 'test.ts', searchText: 'a', replaceText: 'b' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('rejects missing required fields', async () => {
    mock.module('@convex-dev/auth/nextjs/server', () => ({
      isAuthenticatedNextjs: () => Promise.resolve(true),
    }))

    const { POST } = await import('./route')
    const req = new Request('http://localhost/api/search/replace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath: 'test.ts' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
