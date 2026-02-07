import { query, mutation } from '../_generated/server'
import { v } from 'convex/values'
import type { Id } from '../_generated/dataModel'
import { getAuthUserId } from '@convex-dev/auth/server'

const E2E_BYPASS_USER_EMAIL = 'e2e@example.com'

async function getE2EBypassUserId(ctx: any): Promise<Id<'users'> | null> {
  const existing = await ctx.db
    .query('users')
    .withIndex('email', (q: any) => q.eq('email', E2E_BYPASS_USER_EMAIL))
    .first()

  if (existing) {
    return existing._id as Id<'users'>
  }

  return null
}

async function getOrCreateE2EBypassUserId(ctx: any): Promise<Id<'users'>> {
  const existing = await getE2EBypassUserId(ctx)
  if (existing) return existing

  return (await ctx.db.insert('users', {
    email: E2E_BYPASS_USER_EMAIL,
    name: 'E2E User',
    tokenIdentifier: `e2e-token-${Date.now()}`,
    createdAt: Date.now(),
  })) as Id<'users'>
}

function isE2EAuthBypassEnabled(): boolean {
  return process.env.E2E_AUTH_BYPASS === 'true'
}

export async function getCurrentUserId(ctx: any): Promise<Id<'users'> | null> {
  const userId = await getAuthUserId(ctx)
  if (userId) {
    return userId as Id<'users'>
  }

  if (isE2EAuthBypassEnabled()) {
    return await getE2EBypassUserId(ctx)
  }

  return null
}

export async function requireAuth(ctx: any): Promise<Id<'users'>> {
  const userId = await getAuthUserId(ctx)
  if (userId) {
    return userId as Id<'users'>
  }

  if (isE2EAuthBypassEnabled()) {
    return await getOrCreateE2EBypassUserId(ctx)
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
