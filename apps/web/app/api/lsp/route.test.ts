import { describe, expect, it, mock } from 'bun:test'

let isAuthenticated = true

mock.module('@/lib/auth/nextjs', () => ({
  isAuthenticatedNextjs: () => Promise.resolve(isAuthenticated),
}))

process.env.PANDA_ENABLE_LOCAL_WORKSPACE_API = 'true'

describe('/api/lsp route', () => {
  it('returns 401 when unauthenticated', async () => {
    isAuthenticated = false

    const { GET } = await import('./route')
    const response = await GET()
    isAuthenticated = true

    expect(response.status).toBe(401)
  })

  it('returns 404 when local workspace APIs are not enabled', async () => {
    delete process.env.PANDA_ENABLE_LOCAL_WORKSPACE_API

    const { GET } = await import('./route')
    const response = await GET()
    process.env.PANDA_ENABLE_LOCAL_WORKSPACE_API = 'true'

    expect(response.status).toBe(404)
  })

  it('requires a websocket upgrade when local workspace APIs are enabled', async () => {
    const { GET } = await import('./route')
    const response = await GET()

    expect(response.status).toBe(426)
  })
})
