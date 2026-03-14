import { query, mutation, type MutationCtx, type QueryCtx } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'

/**
 * Check if the current user is an admin
 */
type AdminCtx = QueryCtx | MutationCtx

async function requireAdmin(ctx: AdminCtx) {
  const userId = await getAuthUserId(ctx)
  if (!userId) {
    throw new Error('Unauthorized: Not authenticated')
  }

  const user = await ctx.db.get(userId)
  if (!user || !user.isAdmin) {
    throw new Error('Unauthorized: Admin access required')
  }

  return { userId, user }
}

/**
 * Get current admin settings
 */
export const getSettings = query({
  handler: async (ctx) => {
    await requireAdmin(ctx)

    const settings = await ctx.db.query('adminSettings').order('desc').first()

    if (!settings) {
      // Return default settings
      return {
        _id: null,
        globalDefaultProvider: null,
        globalDefaultModel: null,
        globalProviderConfigs: {},
        enhancementProvider: null,
        enhancementModel: null,
        allowUserOverrides: true,
        allowUserMCP: true,
        allowUserSubagents: true,
        systemMaintenance: false,
        registrationEnabled: true,
        maxProjectsPerUser: 100,
        maxChatsPerProject: 50,
        trackUsageAnalytics: true,
        trackProviderUsage: true,
        updatedAt: Date.now(),
      }
    }

    return settings
  },
})

/**
 * Update admin settings
 */
export const updateSettings = mutation({
  args: {
    globalDefaultProvider: v.optional(v.string()),
    globalDefaultModel: v.optional(v.string()),
    globalProviderConfigs: v.optional(v.record(v.string(), v.record(v.string(), v.any()))),
    enhancementProvider: v.optional(v.string()),
    enhancementModel: v.optional(v.string()),
    allowUserOverrides: v.optional(v.boolean()),
    allowUserMCP: v.optional(v.boolean()),
    allowUserSubagents: v.optional(v.boolean()),
    systemMaintenance: v.optional(v.boolean()),
    registrationEnabled: v.optional(v.boolean()),
    maxProjectsPerUser: v.optional(v.number()),
    maxChatsPerProject: v.optional(v.number()),
    trackUsageAnalytics: v.optional(v.boolean()),
    trackProviderUsage: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAdmin(ctx)

    const existing = await ctx.db.query('adminSettings').order('desc').first()

    const updateData = {
      ...args,
      updatedAt: Date.now(),
      updatedBy: userId,
    }

    if (existing) {
      await ctx.db.patch(existing._id, updateData)
      return existing._id
    } else {
      return await ctx.db.insert('adminSettings', updateData)
    }
  },
})

/**
 * List all users with pagination
 */
export const listUsers = query({
  args: {
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
    search: v.optional(v.string()),
    filter: v.optional(
      v.union(v.literal('all'), v.literal('admins'), v.literal('banned'), v.literal('active'))
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const limit = args.limit ?? 50

    // Get all users and filter in memory
    // Note: For production with many users, consider implementing pagination with cursors
    const allUsers = await ctx.db.query('users').order('desc').take(1000)

    // Apply filters in memory
    let users = allUsers
    if (args.filter === 'admins') {
      users = users.filter((u) => u.isAdmin === true)
    } else if (args.filter === 'banned') {
      users = users.filter((u) => u.isBanned === true)
    } else if (args.filter === 'active') {
      users = users.filter((u) => !u.isBanned)
    }

    // Apply search filter in memory (Convex doesn't support full-text search yet)
    if (args.search) {
      const searchLower = args.search.toLowerCase()
      users = users.filter(
        (u) =>
          u.email?.toLowerCase().includes(searchLower) ||
          u.name?.toLowerCase().includes(searchLower)
      )
    }

    // Check if there are more results
    const hasMore = users.length > limit
    const results = hasMore ? users.slice(0, limit) : users

    // Get user analytics for each user
    const usersWithAnalytics = await Promise.all(
      results.map(async (user) => {
        const analytics = await ctx.db
          .query('userAnalytics')
          .withIndex('by_user', (q) => q.eq('userId', user._id))
          .first()

        return {
          ...user,
          analytics: analytics || null,
        }
      })
    )

    return {
      users: usersWithAnalytics,
      hasMore,
      nextCursor: hasMore ? results[results.length - 1]._id : null,
    }
  },
})

/**
 * Get detailed user information
 */
export const getUserDetails = query({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const user = await ctx.db.get(args.userId)
    if (!user) {
      throw new Error('User not found')
    }

    // Get user settings
    const settings = await ctx.db
      .query('settings')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first()

    // Get user analytics
    const analytics = await ctx.db
      .query('userAnalytics')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first()

    // Get user's projects count
    const projects = await ctx.db
      .query('projects')
      .withIndex('by_creator', (q) => q.eq('createdBy', args.userId))
      .collect()

    // Get user's MCP servers count
    const mcpServers = await ctx.db
      .query('mcpServers')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect()

    // Get user's subagents count
    const subagents = await ctx.db
      .query('subagents')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect()

    return {
      user,
      settings,
      analytics,
      projectCount: projects.length,
      mcpServerCount: mcpServers.length,
      subagentCount: subagents.length,
    }
  },
})

/**
 * Update user admin status
 */
export const updateUserAdmin = mutation({
  args: {
    userId: v.id('users'),
    isAdmin: v.boolean(),
    adminRole: v.optional(v.union(v.literal('super'), v.literal('admin'), v.literal('moderator'))),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAdmin(ctx)

    const user = await ctx.db.get(args.userId)
    if (!user) {
      throw new Error('User not found')
    }

    await ctx.db.patch(args.userId, {
      isAdmin: args.isAdmin,
      adminRole: args.isAdmin ? args.adminRole : undefined,
      adminGrantedAt: args.isAdmin ? Date.now() : undefined,
      adminGrantedBy: args.isAdmin ? adminId : undefined,
    })

    // Log the action
    await ctx.db.insert('auditLog', {
      userId: adminId,
      action: args.isAdmin ? 'GRANT_ADMIN' : 'REVOKE_ADMIN',
      resource: 'user',
      resourceId: args.userId,
      details: { adminRole: args.adminRole },
      createdAt: Date.now(),
    })

    return args.userId
  },
})

/**
 * Ban or unban a user
 */
export const updateUserBan = mutation({
  args: {
    userId: v.id('users'),
    isBanned: v.boolean(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAdmin(ctx)

    const user = await ctx.db.get(args.userId)
    if (!user) {
      throw new Error('User not found')
    }

    await ctx.db.patch(args.userId, {
      isBanned: args.isBanned,
      bannedAt: args.isBanned ? Date.now() : undefined,
      bannedReason: args.isBanned ? args.reason : undefined,
    })

    // Log the action
    await ctx.db.insert('auditLog', {
      userId: adminId,
      action: args.isBanned ? 'BAN_USER' : 'UNBAN_USER',
      resource: 'user',
      resourceId: args.userId,
      details: { reason: args.reason },
      createdAt: Date.now(),
    })

    return args.userId
  },
})

/**
 * Delete a user and all their data
 */
export const deleteUser = mutation({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAdmin(ctx)

    const user = await ctx.db.get(args.userId)
    if (!user) {
      throw new Error('User not found')
    }

    // Get all user's projects
    const projects = await ctx.db
      .query('projects')
      .withIndex('by_creator', (q) => q.eq('createdBy', args.userId))
      .collect()

    // Delete projects and associated data
    for (const project of projects) {
      // Delete files
      const files = await ctx.db
        .query('files')
        .withIndex('by_project', (q) => q.eq('projectId', project._id))
        .collect()

      for (const file of files) {
        // Delete file snapshots
        const snapshots = await ctx.db
          .query('fileSnapshots')
          .withIndex('by_file', (q) => q.eq('fileId', file._id))
          .collect()
        for (const snapshot of snapshots) {
          await ctx.db.delete(snapshot._id)
        }
        await ctx.db.delete(file._id)
      }

      // Delete chats and messages
      const chats = await ctx.db
        .query('chats')
        .withIndex('by_project', (q) => q.eq('projectId', project._id))
        .collect()

      for (const chat of chats) {
        const messages = await ctx.db
          .query('messages')
          .withIndex('by_chat', (q) => q.eq('chatId', chat._id))
          .collect()
        for (const message of messages) {
          await ctx.db.delete(message._id)
        }
        await ctx.db.delete(chat._id)
      }

      await ctx.db.delete(project._id)
    }

    // Delete user's settings
    const settings = await ctx.db
      .query('settings')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first()
    if (settings) {
      await ctx.db.delete(settings._id)
    }

    // Delete user's analytics
    const analytics = await ctx.db
      .query('userAnalytics')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first()
    if (analytics) {
      await ctx.db.delete(analytics._id)
    }

    // Delete user's MCP servers
    const mcpServers = await ctx.db
      .query('mcpServers')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect()
    for (const server of mcpServers) {
      await ctx.db.delete(server._id)
    }

    // Delete user's subagents
    const subagents = await ctx.db
      .query('subagents')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect()
    for (const subagent of subagents) {
      await ctx.db.delete(subagent._id)
    }

    // Delete user's provider tokens
    const tokens = await ctx.db
      .query('providerTokens')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect()
    for (const token of tokens) {
      await ctx.db.delete(token._id)
    }

    // Finally delete the user
    await ctx.db.delete(args.userId)

    // Log the action
    await ctx.db.insert('auditLog', {
      userId: adminId,
      action: 'DELETE_USER',
      resource: 'user',
      resourceId: args.userId,
      details: {
        projectsDeleted: projects.length,
        email: user.email,
      },
      createdAt: Date.now(),
    })

    return args.userId
  },
})

/**
 * Get system overview statistics
 */
export const getSystemOverview = query({
  handler: async (ctx) => {
    await requireAdmin(ctx)

    // Count total users
    const totalUsers = await ctx.db.query('users').collect()
    const activeUsers = totalUsers.filter((u) => !u.isBanned)
    const adminUsers = totalUsers.filter((u) => u.isAdmin)
    const bannedUsers = totalUsers.filter((u) => u.isBanned)

    // Count total projects
    const totalProjects = await ctx.db.query('projects').collect()

    // Count total chats
    const totalChats = await ctx.db.query('chats').collect()

    // Count total messages
    const totalMessages = await ctx.db.query('messages').collect()

    // Get recent registrations (last 24 hours)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
    const recentRegistrations = totalUsers.filter((u) => u.createdAt && u.createdAt > oneDayAgo)

    // Get active users (last 24 hours) - based on analytics
    const userAnalytics = await ctx.db.query('userAnalytics').collect()
    const recentlyActive = userAnalytics.filter((a) => a.lastActiveAt && a.lastActiveAt > oneDayAgo)

    return {
      users: {
        total: totalUsers.length,
        active: activeUsers.length,
        admins: adminUsers.length,
        banned: bannedUsers.length,
        recentRegistrations: recentRegistrations.length,
        recentlyActive: recentlyActive.length,
      },
      projects: {
        total: totalProjects.length,
      },
      chats: {
        total: totalChats.length,
      },
      messages: {
        total: totalMessages.length,
      },
    }
  },
})

/**
 * Get provider usage analytics
 */
export const getProviderAnalytics = query({
  handler: async (ctx) => {
    await requireAdmin(ctx)

    const agentRuns = await ctx.db.query('agentRuns').collect()

    // Aggregate provider usage
    const providerUsage: Record<string, number> = {}
    const modelUsage: Record<string, number> = {}

    for (const run of agentRuns) {
      if (run.provider) {
        providerUsage[run.provider] = (providerUsage[run.provider] || 0) + 1
      }
      if (run.model) {
        modelUsage[run.model] = (modelUsage[run.model] || 0) + 1
      }
    }

    // Sort by usage
    const sortedProviders = Object.entries(providerUsage)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }))

    const sortedModels = Object.entries(modelUsage)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([name, count]) => ({ name, count }))

    return {
      totalRuns: agentRuns.length,
      providers: sortedProviders,
      models: sortedModels,
    }
  },
})

/**
 * Get audit log entries
 */
export const getAuditLog = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const limit = args.limit ?? 100

    const logs = await ctx.db.query('auditLog').order('desc').take(limit)

    // Get user info for each log entry
    const logsWithUsers = await Promise.all(
      logs.map(async (log) => {
        if (log.userId) {
          const user = await ctx.db.get(log.userId)
          return {
            ...log,
            user: user ? { name: user.name, email: user.email } : null,
          }
        }
        return { ...log, user: null }
      })
    )

    return logsWithUsers
  },
})

/**
 * Check if current user is admin
 */
export const checkIsAdmin = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return { isAdmin: false }
    }

    const user = await ctx.db.get(userId)
    return {
      isAdmin: user?.isAdmin ?? false,
      adminRole: user?.adminRole ?? null,
    }
  },
})
