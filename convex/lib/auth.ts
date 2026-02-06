import { query, mutation } from '../_generated/server'
import { v } from 'convex/values'
import type { Id } from '../_generated/dataModel'
import { getAuthUserId } from '@convex-dev/auth/server'

export async function getCurrentUserId(ctx: any): Promise<Id<'users'> | null> {
  const userId = await getAuthUserId(ctx)
  return userId as Id<'users'> | null
}

export async function requireAuth(ctx: any): Promise<Id<'users'>> {
  const userId = await getAuthUserId(ctx)
  if (!userId) {
    throw new Error('Unauthorized: Authentication required')
  }
  return userId as Id<'users'>
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
