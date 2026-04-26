import { mutation } from './_generated/server'
import { v } from 'convex/values'

function isAdminBootstrapEnabled(): boolean {
  return process.env.CONVEX_ALLOW_ADMIN_BOOTSTRAP === 'true' && process.env.NODE_ENV !== 'production'
}

export const makeFirstAdmin = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    if (!isAdminBootstrapEnabled()) {
      throw new Error('Admin bootstrap is disabled')
    }

    const existingAdmin = await ctx.db.query('users').withIndex('by_admin', (q) => q.eq('isAdmin', true)).first()
    if (existingAdmin) {
      throw new Error('Admin bootstrap has already been completed')
    }

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
