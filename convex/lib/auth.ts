import { query, mutation, type MutationCtx, type QueryCtx } from '../_generated/server'
import { v } from 'convex/values'
import type { Id } from '../_generated/dataModel'
import { getAuthUserId } from '@convex-dev/auth/server'

const E2E_BYPASS_USER_EMAIL = 'e2e@example.com'

type AuthReadCtx = QueryCtx
type AuthWriteCtx = MutationCtx
type AuthCtx = AuthReadCtx | AuthWriteCtx

function isMutationAuthCtx(ctx: AuthCtx): ctx is AuthWriteCtx {
  return 'insert' in ctx.db
}

async function getE2EBypassUserId(ctx: AuthCtx): Promise<Id<'users'> | null> {
  const existing = await ctx.db
    .query('users')
    .withIndex('email', (q) => q.eq('email', E2E_BYPASS_USER_EMAIL))
    .first()

  if (existing) {
    return existing._id as Id<'users'>
  }

  return null
}

async function getOrCreateE2EBypassUserId(ctx: AuthWriteCtx): Promise<Id<'users'>> {
  const existing = await getE2EBypassUserId(ctx)
  if (existing) return existing

  return (await ctx.db.insert('users', {
    email: E2E_BYPASS_USER_EMAIL,
    name: 'E2E User',
    tokenIdentifier: `e2e-token-${Date.now()}`,
    createdAt: Date.now(),
  })) as Id<'users'>
}

export function isE2EAuthBypassAllowedForEnv(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.E2E_AUTH_BYPASS !== 'true') {
    return false
  }

  if (env.NODE_ENV === 'production') {
    return false
  }

  return true
}

function isE2EAuthBypassEnabled(): boolean {
  return isE2EAuthBypassAllowedForEnv()
}

export async function getCurrentUserId(ctx: AuthCtx): Promise<Id<'users'> | null> {
  const userId = await getAuthUserId(ctx)
  if (userId) {
    return userId as Id<'users'>
  }

  if (isE2EAuthBypassEnabled()) {
    return await getE2EBypassUserId(ctx)
  }

  return null
}

export async function requireAuth(ctx: AuthCtx): Promise<Id<'users'>> {
  const userId = await getAuthUserId(ctx)
  if (userId) {
    return userId as Id<'users'>
  }

  if (isE2EAuthBypassEnabled()) {
    if (isMutationAuthCtx(ctx)) {
      return await getOrCreateE2EBypassUserId(ctx)
    }
    const bypassUserId = await getE2EBypassUserId(ctx)
    if (bypassUserId) return bypassUserId
  }

  throw new Error('Unauthorized: Authentication required')
}

export const getOrCreateUser = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    tokenIdentifier: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('users')
      .withIndex('email', (q) => q.eq('email', args.email))
      .first()

    if (existing) {
      return existing._id
    }

    return await ctx.db.insert('users', {
      email: args.email,
      name: args.name,
      avatarUrl: args.avatarUrl,
      tokenIdentifier: args.tokenIdentifier,
      createdAt: Date.now(),
    })
  },
})
