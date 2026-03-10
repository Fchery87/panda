import { beforeAll, describe, expect, it, mock } from 'bun:test'
import type { NextRequest } from 'next/server'

let isAuthenticated = true
const cancelJobProcessCalls: string[] = []

mock.module('@convex-dev/auth/nextjs/server', () => ({
  isAuthenticatedNextjs: async () => isAuthenticated,
}))

mock.module('@/lib/jobs/processRegistry', () => ({
  cancelJobProcess: (jobId: string) => {
    cancelJobProcessCalls.push(jobId)
    return true
  },
}))

let POST: typeof import('./route').POST

beforeAll(async () => {
  ;({ POST } = await import('./route'))
})

function makeJsonRequest(body: unknown): NextRequest {
  const request = new Request('http://localhost/api/jobs/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return request as unknown as NextRequest
}

describe('/api/jobs/cancel route', () => {
  it('returns 401 when unauthenticated', async () => {
    isAuthenticated = false
    const response = await POST(makeJsonRequest({ jobId: 'job_123' }))
    isAuthenticated = true

    expect(response.status).toBe(401)
  })

  it('requires a jobId', async () => {
    const response = await POST(makeJsonRequest({}))

    expect(response.status).toBe(400)
    const payload = (await response.json()) as { error: string }
    expect(payload.error).toContain('jobId is required')
  })

  it('delegates cancellation to the process registry', async () => {
    cancelJobProcessCalls.length = 0
    const response = await POST(makeJsonRequest({ jobId: 'job_456' }))

    expect(response.status).toBe(200)
    expect(cancelJobProcessCalls).toEqual(['job_456'])
    const payload = (await response.json()) as { ok: boolean }
    expect(payload.ok).toBe(true)
  })
})
