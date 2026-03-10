import { query, mutation, type MutationCtx, type QueryCtx } from './_generated/server'
import { v } from 'convex/values'
import { requireAuth } from './lib/auth'

async function resolveUserId(ctx: QueryCtx | MutationCtx) {
  const userId = await requireAuth(ctx)
  let userIdAsId = ctx.db.normalizeId('users', userId)

  if (!userIdAsId) {
    const devUser = await ctx.db
      .query('users')
      .withIndex('email', (q) => q.eq('email', 'dev@example.com'))
      .first()
    if (devUser) {
      userIdAsId = devUser._id
    }
  }

  if (!userIdAsId) {
    throw new Error('User not found')
  }

  return userIdAsId
}

async function assertMcpEnabled(ctx: QueryCtx | MutationCtx) {
  const adminSettings = await ctx.db.query('adminSettings').order('desc').first()
  if (adminSettings?.allowUserMCP === false) {
    throw new Error('MCP servers are disabled by admin policy')
  }
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    if ((await ctx.db.query('adminSettings').order('desc').first())?.allowUserMCP === false) {
      return []
    }
    const userIdAsId = await resolveUserId(ctx)

    return await ctx.db
      .query('mcpServers')
      .withIndex('by_user', (q) => q.eq('userId', userIdAsId!))
      .collect()
  },
})

export const add = mutation({
  args: {
    name: v.string(),
    transport: v.union(v.literal('stdio'), v.literal('sse')),
    command: v.optional(v.string()),
    args: v.optional(v.array(v.string())),
    url: v.optional(v.string()),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    await assertMcpEnabled(ctx)
    const userIdAsId = await resolveUserId(ctx)

    const now = Date.now()

    const existing = await ctx.db
      .query('mcpServers')
      .withIndex('by_user_name', (q) => q.eq('userId', userIdAsId!).eq('name', args.name))
      .first()

    if (existing) {
      throw new Error('Server with this name already exists')
    }

    return await ctx.db.insert('mcpServers', {
      userId: userIdAsId,
      name: args.name,
      transport: args.transport,
      command: args.command,
      args: args.args,
      url: args.url,
      enabled: args.enabled,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const update = mutation({
  args: {
    id: v.id('mcpServers'),
    name: v.optional(v.string()),
    transport: v.optional(v.union(v.literal('stdio'), v.literal('sse'))),
    command: v.optional(v.string()),
    args: v.optional(v.array(v.string())),
    url: v.optional(v.string()),
    enabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await assertMcpEnabled(ctx)
    const userIdAsId = await resolveUserId(ctx)
    const server = await ctx.db.get(args.id)

    if (!server) {
      throw new Error('Server not found')
    }

    if (server.userId !== userIdAsId) {
      throw new Error('Unauthorized')
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() }
    if (args.name !== undefined) updates.name = args.name
    if (args.transport !== undefined) updates.transport = args.transport
    if (args.command !== undefined) updates.command = args.command
    if (args.args !== undefined) updates.args = args.args
    if (args.url !== undefined) updates.url = args.url
    if (args.enabled !== undefined) updates.enabled = args.enabled

    await ctx.db.patch(args.id, updates)
    return args.id
  },
})

export const remove = mutation({
  args: { id: v.id('mcpServers') },
  handler: async (ctx, args) => {
    await assertMcpEnabled(ctx)
    const userIdAsId = await resolveUserId(ctx)
    const server = await ctx.db.get(args.id)

    if (!server) {
      throw new Error('Server not found')
    }

    if (server.userId !== userIdAsId) {
      throw new Error('Unauthorized')
    }

    await ctx.db.delete(args.id)
    return args.id
  },
})
