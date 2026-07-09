import { query, mutation, type MutationCtx, type QueryCtx } from './_generated/server'
import { v } from 'convex/values'
import type { Id, TableNames } from './_generated/dataModel'
import { getCurrentUserId } from './lib/auth'
import { deleteProjectFileContents } from './lib/fileContentStore'
import { deleteRunEventWithBody } from './lib/runEvents'
import { HarnessCommandFamilyPolicyEntry } from './schema'

/**
 * Check if the current user is an admin
 */
type AdminCtx = QueryCtx | MutationCtx

type IndexQueryBuilder = {
  eq: (fieldName: string, value: unknown) => IndexQueryBuilder
}

async function deleteByIndex<TableName extends Parameters<MutationCtx['db']['query']>[0]>(
  ctx: MutationCtx,
  table: TableName,
  indexName: string,
  buildQuery: (q: IndexQueryBuilder) => unknown
): Promise<number> {
  const batchSize = 1000
  const maxRows = 5000
  let deleted = 0

  while (true) {
    const rows = await ctx.db
      .query(table)
      .withIndex(indexName as never, buildQuery as never)
      .take(batchSize)

    if (rows.length === 0) return deleted
    if (deleted + rows.length > maxRows) {
      throw new Error(`Cascade delete for ${String(table)} exceeded ${maxRows} rows`)
    }

    for (const row of rows) {
      await ctx.db.delete(row._id)
    }

    deleted += rows.length
    if (rows.length < batchSize) return deleted
  }
}

async function deleteProjectFilesWithSnapshots(
  ctx: MutationCtx,
  projectId: Id<'projects'>
): Promise<number> {
  const batchSize = 1000
  const maxRows = 5000
  let deleted = 0

  while (true) {
    const files = await ctx.db
      .query('files')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .take(batchSize)

    if (files.length === 0) return deleted
    if (deleted + files.length > maxRows) {
      throw new Error(`Refusing to delete more than ${maxRows} files in one admin project cascade`)
    }

    for (const file of files) {
      await deleteByIndex(ctx, 'fileSnapshots', 'by_file', (q) => q.eq('fileId', file._id))
      await deleteByIndex(ctx, 'fileMetadata', 'by_file', (q) => q.eq('fileId', file._id))
      await ctx.db.delete(file._id)
      deleted += 1
    }
  }
}

type CommandFamilyPolicyEntry = {
  family:
    | 'package-manager'
    | 'network'
    | 'git'
    | 'destructive'
    | 'remote-exec'
    | 'filesystem-write'
    | 'unknown'
  decision: 'allow' | 'ask' | 'deny'
}

const DEFAULT_COMMAND_FAMILY_POLICY: CommandFamilyPolicyEntry[] = [
  { family: 'package-manager', decision: 'allow' },
  { family: 'network', decision: 'ask' },
  { family: 'git', decision: 'allow' },
  { family: 'destructive', decision: 'ask' },
  { family: 'remote-exec', decision: 'ask' },
  { family: 'filesystem-write', decision: 'ask' },
  { family: 'unknown', decision: 'ask' },
]

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

const ADMIN_AGGREGATE_SYSTEM_OVERVIEW_KEY = 'system_overview_v1'
const ADMIN_AGGREGATE_PROVIDER_USAGE_KEY = 'provider_usage_v1'
const ADMIN_ANALYTICS_SAMPLE_LIMIT = 1000
const ADMIN_OPERATIONAL_CLEANUP_MAX_LIMIT = 1000
const MS_PER_DAY = 24 * 60 * 60 * 1000

async function readAdminAggregate(ctx: AdminCtx, key: string) {
  return await ctx.db
    .query('adminUsageAggregates')
    .withIndex('by_key', (q) => q.eq('key', key))
    .unique()
}

async function upsertAdminAggregate(ctx: MutationCtx, key: string, data: unknown) {
  const existing = await readAdminAggregate(ctx, key)
  const payload = { key, data, computedAt: Date.now() }
  if (existing) {
    await ctx.db.patch(existing._id, payload)
    return existing._id
  }
  return await ctx.db.insert('adminUsageAggregates', payload)
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
    .take(1000)

  return projects.length
}

async function countChatsByUser(ctx: AdminCtx, userId: string) {
  const userIdAsId = ctx.db.normalizeId('users', userId)
  if (!userIdAsId) return 0

  const projects = await ctx.db
    .query('projects')
    .withIndex('by_creator', (q) => q.eq('createdBy', userIdAsId))
    .take(1000)

  let chatCount = 0
  for (const project of projects) {
    const chats = await ctx.db
      .query('chats')
      .withIndex('by_project', (q) => q.eq('projectId', project._id))
      .take(1000)
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
        allowedMCPTransports: ['stdio', 'sse', 'http'],
        commandFamilyPolicy: DEFAULT_COMMAND_FAMILY_POLICY,
        allowUserSubagents: true,
        allowUserSkills: true,
        allowSkillAutoActivation: true,
        allowStrictUserSkills: true,
        allowSkillImportExport: true,
        allowedSubagentCapabilityPresets: ['research', 'assistant', 'builder', 'restricted'],
        systemMaintenance: false,
        registrationEnabled: true,
        maxProjectsPerUser: 100,
        maxChatsPerProject: 50,
        maxCustomSubagentsPerUser: 50,
        maxCustomSkillsPerUser: 50,
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
    allowedMCPTransports: v.optional(
      v.array(v.union(v.literal('stdio'), v.literal('sse'), v.literal('http')))
    ),
    commandFamilyPolicy: v.optional(v.array(HarnessCommandFamilyPolicyEntry)),
    allowUserSubagents: v.optional(v.boolean()),
    allowUserSkills: v.optional(v.boolean()),
    allowSkillAutoActivation: v.optional(v.boolean()),
    allowStrictUserSkills: v.optional(v.boolean()),
    allowSkillImportExport: v.optional(v.boolean()),
    allowedSubagentCapabilityPresets: v.optional(
      v.array(
        v.union(
          v.literal('research'),
          v.literal('assistant'),
          v.literal('builder'),
          v.literal('restricted')
        )
      )
    ),
    systemMaintenance: v.optional(v.boolean()),
    registrationEnabled: v.optional(v.boolean()),
    maxProjectsPerUser: v.optional(v.number()),
    maxChatsPerProject: v.optional(v.number()),
    maxCustomSubagentsPerUser: v.optional(v.number()),
    maxCustomSkillsPerUser: v.optional(v.number()),
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
          allowedMCPTransports: existing.allowedMCPTransports ?? ['stdio', 'sse', 'http'],
          commandFamilyPolicy: existing.commandFamilyPolicy ?? DEFAULT_COMMAND_FAMILY_POLICY,
          allowUserSubagents: existing.allowUserSubagents ?? true,
          allowUserSkills: existing.allowUserSkills ?? true,
          allowSkillAutoActivation: existing.allowSkillAutoActivation ?? true,
          allowStrictUserSkills: existing.allowStrictUserSkills ?? true,
          allowSkillImportExport: existing.allowSkillImportExport ?? true,
          allowedSubagentCapabilityPresets: existing.allowedSubagentCapabilityPresets ?? [
            'research',
            'assistant',
            'builder',
            'restricted',
          ],
          systemMaintenance: existing.systemMaintenance ?? false,
          registrationEnabled: existing.registrationEnabled ?? true,
          maxProjectsPerUser: existing.maxProjectsPerUser ?? 100,
          maxChatsPerProject: existing.maxChatsPerProject ?? 50,
          maxCustomSubagentsPerUser: existing.maxCustomSubagentsPerUser ?? 50,
          maxCustomSkillsPerUser: existing.maxCustomSkillsPerUser ?? 50,
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

    const limit = Math.max(1, Math.min(args.limit ?? 50, 100))
    const paginationOpts = { numItems: limit, cursor: args.cursor ?? null }

    const page =
      args.filter === 'admins'
        ? await ctx.db
            .query('users')
            .withIndex('by_admin', (q) => q.eq('isAdmin', true))
            .order('desc')
            .paginate(paginationOpts)
        : args.filter === 'banned'
          ? await ctx.db
              .query('users')
              .withIndex('by_banned', (q) => q.eq('isBanned', true))
              .order('desc')
              .paginate(paginationOpts)
          : await ctx.db.query('users').order('desc').paginate(paginationOpts)

    // Active users include legacy rows where isBanned is undefined, so this filter
    // remains bounded on the current page instead of querying by_banned=false only.
    let users = args.filter === 'active' ? page.page.filter((u) => !u.isBanned) : page.page

    // Apply search filter to a bounded page. Convex does not support full-text search here;
    // callers can continue from nextCursor to scan additional bounded pages.
    if (args.search) {
      const searchLower = args.search.toLowerCase()
      users = users.filter(
        (u) =>
          u.email?.toLowerCase().includes(searchLower) ||
          u.name?.toLowerCase().includes(searchLower)
      )
    }

    const results = users

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
      hasMore: !page.isDone,
      nextCursor: page.isDone ? null : page.continueCursor,
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
      .take(1000)

    // Get user's MCP servers count
    const mcpServers = await ctx.db
      .query('mcpServers')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .take(1000)

    // Get user's subagents count
    const subagents = await ctx.db
      .query('subagents')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .take(1000)

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
      .take(1000)

    // Delete projects and associated data
    for (const project of projects) {
      // Delete files
      await deleteProjectFilesWithSnapshots(ctx, project._id)

      // Delete chats and messages
      const chats = await ctx.db
        .query('chats')
        .withIndex('by_project', (q) => q.eq('projectId', project._id))
        .take(1000)

      for (const chat of chats) {
        const messages = await ctx.db
          .query('messages')
          .withIndex('by_chat', (q) => q.eq('chatId', chat._id))
          .take(1000)
        for (const message of messages) {
          await ctx.db.delete(message._id)
        }
        await deleteByIndex(ctx, 'agentRunEventBodies', 'by_chat_created', (q) =>
          q.eq('chatId', chat._id)
        )
        await deleteByIndex(ctx, 'agentRunEvents', 'by_chat_created', (q) =>
          q.eq('chatId', chat._id)
        )
        await deleteByIndex(ctx, 'harnessRuntimeCheckpointBodies', 'by_chat_created', (q) =>
          q.eq('chatId', chat._id)
        )
        await deleteByIndex(ctx, 'harnessRuntimeCheckpoints', 'by_chat_saved', (q) =>
          q.eq('chatId', chat._id)
        )
        await deleteByIndex(ctx, 'agentRuns', 'by_chat_started', (q) => q.eq('chatId', chat._id))
        await ctx.db.delete(chat._id)
      }

      await deleteProjectFileContents(ctx, project._id)

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
      .take(1000)
    for (const server of mcpServers) {
      await ctx.db.delete(server._id)
    }

    // Delete user's subagents
    const subagents = await ctx.db
      .query('subagents')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .take(1000)
    for (const subagent of subagents) {
      await ctx.db.delete(subagent._id)
    }

    // Delete user's provider tokens
    const tokens = await ctx.db
      .query('providerTokens')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .take(1000)
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
 * Refresh admin dashboard aggregates. This is intentionally a mutation so the
 * expensive sampling work is explicit instead of happening in live dashboard queries.
 */
export const refreshUsageAggregates = mutation({
  handler: async (ctx) => {
    await requireAdmin(ctx)

    const totalUsers = await ctx.db.query('users').take(ADMIN_ANALYTICS_SAMPLE_LIMIT)
    const activeUsers = totalUsers.filter((u) => !u.isBanned)
    const adminUsers = totalUsers.filter((u) => u.isAdmin)
    const bannedUsers = totalUsers.filter((u) => u.isBanned)
    const totalProjects = await ctx.db.query('projects').take(ADMIN_ANALYTICS_SAMPLE_LIMIT)
    const totalChats = await ctx.db.query('chats').take(ADMIN_ANALYTICS_SAMPLE_LIMIT)
    const totalMessages = await ctx.db.query('messages').take(ADMIN_ANALYTICS_SAMPLE_LIMIT)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
    const recentRegistrations = totalUsers.filter((u) => u.createdAt && u.createdAt > oneDayAgo)
    const userAnalytics = await ctx.db.query('userAnalytics').take(ADMIN_ANALYTICS_SAMPLE_LIMIT)
    const recentAnalyticsUsers = new Set(
      userAnalytics
        .filter((a) => a.lastActiveAt && a.lastActiveAt > oneDayAgo)
        .map((analytics) => analytics.userId)
    )
    const agentRuns = await ctx.db
      .query('agentRuns')
      .withIndex('by_started')
      .order('desc')
      .take(ADMIN_ANALYTICS_SAMPLE_LIMIT)
    const recentRunUsers = new Set(
      agentRuns.filter((run) => run.startedAt > oneDayAgo).map((run) => run.userId)
    )
    const recentlyActive = new Set([...recentAnalyticsUsers, ...recentRunUsers])

    const systemOverview = {
      users: {
        total: totalUsers.length,
        active: activeUsers.length,
        admins: adminUsers.length,
        banned: bannedUsers.length,
        recentRegistrations: recentRegistrations.length,
        recentlyActive: recentlyActive.size,
      },
      projects: { total: totalProjects.length },
      chats: { total: totalChats.length },
      messages: { total: totalMessages.length },
    }

    const providerUsage: Record<string, number> = {}
    const modelUsage: Record<string, number> = {}
    for (const run of agentRuns) {
      if (run.provider) providerUsage[run.provider] = (providerUsage[run.provider] || 0) + 1
      if (run.model) modelUsage[run.model] = (modelUsage[run.model] || 0) + 1
    }
    const providerAnalytics = {
      totalRuns: agentRuns.length,
      providers: Object.entries(providerUsage)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count })),
      models: Object.entries(modelUsage)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([name, count]) => ({ name, count })),
    }

    await upsertAdminAggregate(ctx, ADMIN_AGGREGATE_SYSTEM_OVERVIEW_KEY, systemOverview)
    await upsertAdminAggregate(ctx, ADMIN_AGGREGATE_PROVIDER_USAGE_KEY, providerAnalytics)
    return { systemOverview, providerAnalytics, computedAt: Date.now() }
  },
})

/**
 * Get system overview statistics from the small aggregate projection.
 */
export const getSystemOverview = query({
  handler: async (ctx) => {
    await requireAdmin(ctx)
    const aggregate = await readAdminAggregate(ctx, ADMIN_AGGREGATE_SYSTEM_OVERVIEW_KEY)
    return (
      aggregate?.data ?? {
        users: {
          total: 0,
          active: 0,
          admins: 0,
          banned: 0,
          recentRegistrations: 0,
          recentlyActive: 0,
        },
        projects: { total: 0 },
        chats: { total: 0 },
        messages: { total: 0 },
        stale: true,
      }
    )
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

    const aggregate = await readAdminAggregate(ctx, ADMIN_AGGREGATE_PROVIDER_USAGE_KEY)
    if (!args.fromDate && !args.toDate && aggregate?.data && typeof aggregate.data === 'object') {
      const data = aggregate.data as {
        totalRuns?: number
        providers?: Array<{ name: string; count: number }>
        models?: Array<{ name: string; count: number }>
      }
      return {
        totalRuns: data.totalRuns ?? 0,
        providers: data.providers ?? [],
        models: data.models ?? [],
        dateRange: { fromDate: null as string | null, toDate: null as string | null },
      }
    }

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
    const recentRuns = await ctx.db
      .query('agentRuns')
      .withIndex('by_started')
      .order('desc')
      .take(250)
    const filteredRuns = recentRuns.filter((run) => {
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

    const limit = Math.max(1, Math.min(args.limit ?? 100, 200))
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
          .take(Math.min(limit * 3, 250))
      : resourceFilter
        ? await ctx.db
            .query('auditLog')
            .withIndex('by_resource_created', (q) => q.eq('resource', resourceFilter))
            .order('desc')
            .take(Math.min(limit * 3, 250))
        : await ctx.db
            .query('auditLog')
            .withIndex('by_created')
            .order('desc')
            .take(Math.min(limit * 3, 250))

    const filteredLogs = logs.filter((log) => {
      if (args.action && log.action !== args.action) return false
      if (args.resource && log.resource !== args.resource) return false
      if (fromTimestamp !== null && log.createdAt < fromTimestamp) return false
      if (toTimestamp !== null && log.createdAt > toTimestamp) return false
      return true
    })

    // Get user info for each log entry
    const logsWithUsers = await Promise.all(
      filteredLogs.slice(0, Math.min(limit * 2, 200)).map(async (log) => {
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
 * Admin-triggered operational cleanup for dev/test usage spikes.
 * Deletes only cold operational detail rows older than the configured retention
 * window. Source-of-truth projects/chats/messages/files/agentRuns remain intact.
 */
export const cleanupOperationalDataNow = mutation({
  args: {
    retentionDays: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const retentionDays = Math.max(1, Math.min(args.retentionDays ?? 30, 365))
    const limit = Math.max(1, Math.min(args.limit ?? 500, ADMIN_OPERATIONAL_CLEANUP_MAX_LIMIT))
    const olderThanMs = Date.now() - retentionDays * MS_PER_DAY
    let deleted = 0
    const byTable: Record<string, number> = {}

    const deleteRows = async <T extends TableNames>(table: T, rows: Array<{ _id: Id<T> }>) => {
      const remaining = limit - deleted
      const selected = rows.slice(0, remaining)
      for (const row of selected) await ctx.db.delete(row._id as Id<TableNames>)
      deleted += selected.length
      byTable[String(table)] = (byTable[String(table)] ?? 0) + selected.length
    }

    if (deleted < limit) {
      const rows = await ctx.db
        .query('agentRunEvents')
        .withIndex('by_created', (q) => q.lt('createdAt', olderThanMs))
        .order('asc')
        .take(limit - deleted)
      for (const row of rows) {
        await deleteRunEventWithBody(ctx, row._id)
      }
      deleted += rows.length
      byTable['agentRunEvents'] = (byTable['agentRunEvents'] ?? 0) + rows.length
    }
    if (deleted < limit) {
      const rows = await ctx.db
        .query('harnessRuntimeCheckpoints')
        .withIndex('by_saved', (q) => q.lt('savedAt', olderThanMs))
        .order('asc')
        .take(limit - deleted)
      for (const row of rows) {
        const bodies = await ctx.db
          .query('harnessRuntimeCheckpointBodies')
          .withIndex('by_checkpoint', (q) => q.eq('checkpointId', row._id))
          .take(10)
        for (const body of bodies) {
          await ctx.db.delete(body._id)
        }
        await ctx.db.delete(row._id)
      }
      deleted += rows.length
      byTable['harnessRuntimeCheckpoints'] =
        (byTable['harnessRuntimeCheckpoints'] ?? 0) + rows.length
    }
    if (deleted < limit) {
      await deleteRows(
        'evalRunResults',
        await ctx.db
          .query('evalRunResults')
          .withIndex('by_created', (q) => q.lt('createdAt', olderThanMs))
          .order('asc')
          .take(limit - deleted)
      )
    }
    await ctx.db.insert('auditLog', {
      action: 'CLEANUP_OPERATIONAL_DATA',
      resource: 'system',
      details: { retentionDays, limit, deleted, byTable },
      createdAt: Date.now(),
    })

    return { deleted, byTable, hasMore: deleted === limit }
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
