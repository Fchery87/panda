import { query } from './_generated/server'
import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import { getCurrentUserId } from './lib/auth'

export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx)
    if (!userId) return null
    return await ctx.db.get(userId as Id<'users'>)
  },
})

export const listByIds = query({
  args: {
    userIds: v.array(v.id('users')),
  },
  handler: async (ctx, args) => {
    const users = []
    for (const userId of args.userIds) {
      const user = await ctx.db.get(userId)
      if (user) users.push(user)
    }
    return users
  },
})
