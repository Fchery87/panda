import { beforeAll, describe, expect, it, mock } from 'bun:test'
import type { NextRequest } from 'next/server'

let isAuthenticated = true

mock.module('@/lib/auth/nextjs', () => ({
  isAuthenticatedNextjs: async () => isAuthenticated,
}))

let POST: typeof import('./route').POST

beforeAll(async () => {
  ;({ POST } = await import('./route'))
})

function makeJsonRequest(body: unknown): NextRequest {
  const request = new Request('http://localhost/api/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  return request as unknown as NextRequest
}

describe('/api/search route', () => {
  it('rejects unauthenticated requests', async () => {
    isAuthenticated = false
    const response = await POST(makeJsonRequest({ type: 'text', query: 'hello' }))
    isAuthenticated = true

    expect(response.status).toBe(401)
    const payload = (await response.json()) as { error: string }
    expect(payload.error).toContain('Unauthorized')
  })

  it('rejects invalid JSON', async () => {
    const request = new Request('http://localhost/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{',
    }) as unknown as NextRequest

    const response = await POST(request)
    expect(response.status).toBe(400)
    const payload = (await response.json()) as { error: string }
    expect(payload.error).toContain('Invalid JSON body')
  })

  it('rejects unsupported type', async () => {
    const response = await POST(makeJsonRequest({ type: 'unknown', query: 'hello' }))
    expect(response.status).toBe(400)
    const payload = (await response.json()) as { error: string }
    expect(payload.error).toContain('type must be')
  })

  it('returns structured response for text search', async () => {
    const response = await POST(
      makeJsonRequest({
        type: 'text',
        query: 'SearchResponse',
        mode: 'literal',
        paths: ['apps/web/lib/agent/search/types.ts'],
        maxResults: 10,
      })
    )

    expect(response.status).toBe(200)

    const payload = (await response.json()) as {
      engine: string
      mode: string
      matches: Array<{ file: string; line: number }>
      stats: { matchesReturned: number }
      warnings: string[]
    }

    expect(payload.mode).toBe('literal')
    expect(typeof payload.engine).toBe('string')
    expect(Array.isArray(payload.matches)).toBe(true)
    expect(payload.stats.matchesReturned).toBe(payload.matches.length)
    expect(Array.isArray(payload.warnings)).toBe(true)
  })

  it('rejects denied paths', async () => {
    const response = await POST(
      makeJsonRequest({
        type: 'text',
        query: 'x',
        paths: ['.git'],
      })
    )

    expect(response.status).toBe(400)
    const payload = (await response.json()) as { error: string }
    expect(payload.error).toContain('not searchable')
  })

  it('handles ast search requests', async () => {
    const response = await POST(
      makeJsonRequest({
        type: 'ast',
        pattern: 'console.log($X)',
        paths: ['apps/web/lib/agent/search'],
        maxResults: 5,
      })
    )

    expect(response.status).toBe(200)
    const payload = (await response.json()) as {
      mode: string
      warnings: string[]
      matches: unknown[]
    }

    expect(payload.mode).toBe('ast')
    expect(Array.isArray(payload.warnings)).toBe(true)
    expect(Array.isArray(payload.matches)).toBe(true)
  })
})
