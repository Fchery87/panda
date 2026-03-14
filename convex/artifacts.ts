import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { ArtifactAction } from './schema'
import { requireArtifactOwner, requireChatOwner } from './lib/authz'

// list (query) - list artifacts by chatId
export const list = query({
  args: { chatId: v.id('chats') },
  handler: async (ctx, args) => {
    await requireChatOwner(ctx, args.chatId)
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
    await requireArtifactOwner(ctx, args.id)
    return await ctx.db.get(args.id)
  },
})

// create (mutation) - create new artifact
export const create = mutation({
  args: {
    chatId: v.id('chats'),
    messageId: v.optional(v.id('messages')),
    actions: v.array(ArtifactAction),
    status: v.union(
      v.literal('pending'),
      v.literal('in_progress'),
      v.literal('completed'),
      v.literal('failed'),
      v.literal('rejected')
    ),
  },
  handler: async (ctx, args) => {
    await requireChatOwner(ctx, args.chatId)
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
      v.literal('failed'),
      v.literal('rejected')
    ),
    actions: v.optional(v.array(ArtifactAction)),
  },
  handler: async (ctx, args) => {
    const { artifact } = await requireArtifactOwner(ctx, args.id)

    const updates: Partial<typeof artifact> = {
      status: args.status,
    }

    if (args.actions !== undefined) updates.actions = args.actions

    await ctx.db.patch(args.id, updates)

    return args.id
  },
})
