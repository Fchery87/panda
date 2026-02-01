import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

// Helper to get current user ID - returns 'mock-user-id' for now
export function getCurrentUserId(): string {
  return 'mock-user-id'
}

// list (query) - list artifacts by chatId
export const list = query({
  args: { chatId: v.id('chats') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('artifacts')
      .withIndex('by_chat', (q) => q.eq('chatId', args.chatId))
      .collect()
  },
})

// get (query) - get artifact by id
export const get = query({
  args: { id: v.id('artifacts') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

// create (mutation) - create new artifact
export const create = mutation({
  args: {
    chatId: v.id('chats'),
    messageId: v.id('messages'),
    actions: v.array(v.record(v.string(), v.any())),
    status: v.union(
      v.literal('pending'),
      v.literal('in_progress'),
      v.literal('completed'),
      v.literal('failed')
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    const artifactId = await ctx.db.insert('artifacts', {
      chatId: args.chatId,
      messageId: args.messageId,
      actions: args.actions,
      status: args.status,
      createdAt: now,
    })

    return artifactId
  },
})

// updateStatus (mutation) - update artifact status
export const updateStatus = mutation({
  args: {
    id: v.id('artifacts'),
    status: v.union(
      v.literal('pending'),
      v.literal('in_progress'),
      v.literal('completed'),
      v.literal('failed')
    ),
    actions: v.optional(v.array(v.record(v.string(), v.any()))),
  },
  handler: async (ctx, args) => {
    const artifact = await ctx.db.get(args.id)

    if (!artifact) {
      throw new Error('Artifact not found')
    }

    const updates: Partial<typeof artifact> = {
      status: args.status,
    }

    if (args.actions !== undefined) updates.actions = args.actions

    await ctx.db.patch(args.id, updates)

    return args.id
  },
})
