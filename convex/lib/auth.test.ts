import { describe, it, expect, beforeEach, mock } from 'bun:test'

describe('auth helpers', () => {
  let getAuthUserId: (ctx: any) => Promise<string | null>
  let getCurrentUserId: (ctx: any) => Promise<string | null>
  let requireAuth: (ctx: any) => Promise<string>

  beforeEach(async () => {
    mock.module('@convex-dev/auth/server', () => ({
      getAuthUserId: mock(async (ctx: any) => {
        return ctx.auth?.userId || null
      })
    }))

    const auth = await import('./auth')
    getCurrentUserId = auth.getCurrentUserId
    requireAuth = auth.requireAuth
  })

  it('requireAuth throws when not authenticated', async () => {
    const mockCtx = { auth: { userId: null } }
    await expect(requireAuth(mockCtx)).rejects.toThrow('Unauthorized')
  })

  it('requireAuth returns userId when authenticated', async () => {
    const mockUserId = 'user_123'
    const mockCtx = { auth: { userId: mockUserId } }
    const result = await requireAuth(mockCtx)
    expect(result).toBe(mockUserId)
  })

  it('getCurrentUserId returns null when not authenticated', async () => {
    const mockCtx = { auth: { userId: null } }
    const result = await getCurrentUserId(mockCtx)
    expect(result).toBeNull()
  })

  it('getCurrentUserId returns userId when authenticated', async () => {
    const mockUserId = 'user_123'
    const mockCtx = { auth: { userId: mockUserId } }
    const result = await getCurrentUserId(mockCtx)
    expect(result).toBe(mockUserId)
  })
})
