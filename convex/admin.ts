import { query, mutation, type MutationCtx, type QueryCtx } from './_generated/server'
import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import { getCurrentUserId } from './lib/auth'

/**
 * Check if the current user is an admin
 */
type AdminCtx = QueryCtx | MutationCtx

async function requireAdmin(ctx: AdminCtx) {
  const userId = await getCurrentUserId(ctx)
  if (!userId) {
    throw new Error('Unauthorized: Not authenticated')
  }

  const user = await ctx.db.get(userId)
  if (!user || !user.isAdmin) {
    throw new Error('Unauthorized: Admin access required')
  }

  return { userId, user }
}

export async function resolveAdminUserIdFromUrlValue(
  ctx: Pick<AdminCtx, 'db'>,
  urlUserId: string | null | undefined
): Promise<Id<'users'> | null> {
  const value = urlUserId?.trim()
  if (!value) return null

  const normalizedUserId = ctx.db.normalizeId('users', value)
  if (!normalizedUserId) return null

  const user = await ctx.db.get(normalizedUserId)
  return user ? normalizedUserId : null
}

export function sortAuditLogsNewestFirst<T extends { createdAt: number }>(logs: T[]): T[] {
  return [...logs].sort((a, b) => b.createdAt - a.createdAt)
}

export const resolveAdminUserIdFromUrl = query({
  args: {
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    return await resolveAdminUserIdFromUrlValue(ctx, args.userId)
  },
})

async function countProjectsByUser(ctx: AdminCtx, userId: string) {
  const userIdAsId = ctx.db.normalizeId('users', userId)
  if (!userIdAsId) return 0

  const projects = await ctx.db
    .query('projects')
    .withIndex('by_creator', (q) => q.eq('createdBy', userIdAsId))
    .collect()

  return projects.length
}

async function countChatsByUser(ctx: AdminCtx, userId: string) {
  const userIdAsId = ctx.db.normalizeId('users', userId)
  if (!userIdAsId) return 0

  const projects = await ctx.db
    .query('projects')
    .withIndex('by_creator', (q) => q.eq('createdBy', userIdAsId))
    .collect()

  let chatCount = 0
  for (const project of projects) {
    const chats = await ctx.db
      .query('chats')
      .withIndex('by_project', (q) => q.eq('projectId', project._id))
      .collect()
    chatCount += chats.length
  }

  return chatCount
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
    const previousSettings = existing
      ? {
          globalDefaultProvider: existing.globalDefaultProvider ?? null,
          globalDefaultModel: existing.globalDefaultModel ?? null,
          enhancementProvider: existing.enhancementProvider ?? null,
          enhancementModel: existing.enhancementModel ?? null,
          allowUserOverrides: existing.allowUserOverrides ?? true,
          allowUserMCP: existing.allowUserMCP ?? true,
          allowUserSubagents: existing.allowUserSubagents ?? true,
          systemMaintenance: existing.systemMaintenance ?? false,
          registrationEnabled: existing.registrationEnabled ?? true,
          maxProjectsPerUser: existing.maxProjectsPerUser ?? 100,
          maxChatsPerProject: existing.maxChatsPerProject ?? 50,
          trackUsageAnalytics: existing.trackUsageAnalytics ?? true,
          trackProviderUsage: existing.trackProviderUsage ?? true,
        }
      : null

    const updateData = {
      ...args,
      updatedAt: Date.now(),
      updatedBy: userId,
    }

    const resourceId = existing ? existing._id : await ctx.db.insert('adminSettings', updateData)

    if (existing) {
      await ctx.db.patch(existing._id, updateData)
    }

    const changedKeys = Object.keys(args).filter((key) => {
      const typedKey = key as keyof typeof args
      return previousSettings?.[typedKey as keyof typeof previousSettings] !== args[typedKey]
    })

    await ctx.db.insert('auditLog', {
      userId,
      action: 'UPDATE_SETTINGS',
      resource: 'adminSettings',
      resourceId,
      details: {
        changedKeys,
        before: previousSettings,
        after: {
          ...previousSettings,
          ...args,
        },
      },
      createdAt: Date.now(),
    })

    return resourceId
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

    let allUsers = await ctx.db.query('users').order('desc').take(1000)
    if (args.cursor) {
      const cursorUser = await ctx.db.get(args.cursor as Id<'users'>)
      if (cursorUser) {
        allUsers = allUsers.filter(
          (user) =>
            user._creationTime < cursorUser._creationTime ||
            (user._creationTime === cursorUser._creationTime && user._id < cursorUser._id)
        )
      }
    }

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

    const projectCountByUser = new Map<string, number>()
    const usersWithAnalytics = await Promise.all(
      results.map(async (user) => {
        const analytics = await ctx.db
          .query('userAnalytics')
          .withIndex('by_user', (q) => q.eq('userId', user._id))
          .first()

        const projectCount = analytics?.totalProjects ?? (await countProjectsByUser(ctx, user._id))
        projectCountByUser.set(user._id, projectCount)

        return {
          ...user,
          analytics: analytics
            ? {
                ...analytics,
                totalProjects: analytics?.totalProjects ?? projectCountByUser.get(user._id) ?? 0,
              }
            : {
                totalProjects: projectCountByUser.get(user._id) ?? 0,
              },
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

    const chatCount = analytics?.totalChats ?? (await countChatsByUser(ctx, args.userId))

    return {
      user,
      settings,
      analytics: analytics
        ? {
            ...analytics,
            totalProjects: analytics?.totalProjects ?? projects.length,
            totalChats: analytics?.totalChats ?? chatCount,
          }
        : {
            totalProjects: projects.length,
            totalChats: chatCount,
          },
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
    const recentAnalyticsUsers = new Set(
      userAnalytics
        .filter((a) => a.lastActiveAt && a.lastActiveAt > oneDayAgo)
        .map((analytics) => analytics.userId)
    )
    const recentRunUsers = new Set(
      (await ctx.db.query('agentRuns').collect())
        .filter((run) => run.startedAt > oneDayAgo)
        .map((run) => run.userId)
    )
    const recentlyActive = new Set([...recentAnalyticsUsers, ...recentRunUsers])

    return {
      users: {
        total: totalUsers.length,
        active: activeUsers.length,
        admins: adminUsers.length,
        banned: bannedUsers.length,
        recentRegistrations: recentRegistrations.length,
        recentlyActive: recentlyActive.size,
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
  args: {
    fromDate: v.optional(v.string()),
    toDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const agentRuns = await ctx.db.query('agentRuns').collect()
    const parseDateBoundary = (value: string, endOfDay: boolean) => {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
      if (!match) return null
      const [, year, month, day] = match
      return endOfDay
        ? Date.UTC(Number(year), Number(month) - 1, Number(day), 23, 59, 59, 999)
        : Date.UTC(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0)
    }

    const fromTimestamp = args.fromDate ? parseDateBoundary(args.fromDate, false) : null
    const toTimestamp = args.toDate ? parseDateBoundary(args.toDate, true) : null
    const filteredRuns = agentRuns.filter((run) => {
      if (fromTimestamp !== null && run.startedAt < fromTimestamp) return false
      if (toTimestamp !== null && run.startedAt > toTimestamp) return false
      return true
    })

    // Aggregate provider usage
    const providerUsage: Record<string, number> = {}
    const modelUsage: Record<string, number> = {}

    for (const run of filteredRuns) {
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
      totalRuns: filteredRuns.length,
      providers: sortedProviders,
      models: sortedModels,
      dateRange: {
        fromDate: args.fromDate || null,
        toDate: args.toDate || null,
      },
    }
  },
})

/**
 * Get audit log entries
 */
export const getAuditLog = query({
  args: {
    limit: v.optional(v.number()),
    action: v.optional(v.string()),
    resource: v.optional(v.string()),
    actor: v.optional(v.string()),
    fromDate: v.optional(v.string()),
    toDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)

    const limit = args.limit ?? 100
    const parseDateBoundary = (value: string, endOfDay: boolean) => {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
      if (!match) return null
      const [, year, month, day] = match
      return endOfDay
        ? Date.UTC(Number(year), Number(month) - 1, Number(day), 23, 59, 59, 999)
        : Date.UTC(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0)
    }

    const fromTimestamp = args.fromDate ? parseDateBoundary(args.fromDate, false) : null
    const toTimestamp = args.toDate ? parseDateBoundary(args.toDate, true) : null

    const actionFilter = args.action
    const resourceFilter = args.resource
    const logs = actionFilter
      ? await ctx.db
          .query('auditLog')
          .withIndex('by_action', (q) => q.eq('action', actionFilter))
          .order('desc')
          .collect()
      : resourceFilter
        ? await ctx.db
            .query('auditLog')
            .withIndex('by_resource', (q) => q.eq('resource', resourceFilter))
            .order('desc')
            .collect()
        : await ctx.db.query('auditLog').withIndex('by_created').order('desc').collect()

    const filteredLogs = logs.filter((log) => {
      if (args.action && log.action !== args.action) return false
      if (args.resource && log.resource !== args.resource) return false
      if (fromTimestamp !== null && log.createdAt < fromTimestamp) return false
      if (toTimestamp !== null && log.createdAt > toTimestamp) return false
      return true
    })

    // Get user info for each log entry
    const logsWithUsers = await Promise.all(
      filteredLogs.map(async (log) => {
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

    const actorQuery = args.actor?.trim().toLowerCase()
    const actorFilteredLogs = actorQuery
      ? logsWithUsers.filter((log) => {
          if (!log.user) return 'system'.includes(actorQuery)
          const actorFields = [log.user.name, log.user.email]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
          return actorFields.includes(actorQuery)
        })
      : logsWithUsers

    return sortAuditLogsNewestFirst(actorFilteredLogs).slice(0, limit)
  },
})

/**
 * Check if current user is admin
 */
export const checkIsAdmin = query({
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx)
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
