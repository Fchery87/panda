import { mutation } from './_generated/server'
import { v } from 'convex/values'

export const makeFirstAdmin = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('email', (q) => q.eq('email', args.email))
      .first()

    if (!user) {
      throw new Error(`User not found with email: ${args.email}`)
    }

    await ctx.db.patch(user._id, {
      isAdmin: true,
      adminRole: 'super',
      adminGrantedAt: Date.now(),
    })

    return { success: true, userId: user._id }
  },
})
