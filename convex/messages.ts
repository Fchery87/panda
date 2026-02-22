import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { requireChatOwner, requireMessageOwner } from './lib/authz'

// list (query) - list messages by chatId, ordered by createdAt
export const list = query({
  args: { chatId: v.id('chats') },
  handler: async (ctx, args) => {
    await requireChatOwner(ctx, args.chatId)
    return await ctx.db
      .query('messages')
      .withIndex('by_created', (q) => q.eq('chatId', args.chatId))
      .order('asc')
      .collect()
  },
})

// get (query) - get message by id
export const get = query({
  args: { id: v.id('messages') },
  handler: async (ctx, args) => {
    await requireMessageOwner(ctx, args.id)
    return await ctx.db.get(args.id)
  },
})

// add (mutation) - add new message (updates chat's updatedAt)
export const add = mutation({
  args: {
    chatId: v.id('chats'),
    role: v.union(v.literal('user'), v.literal('assistant'), v.literal('system')),
    content: v.string(),
    annotations: v.optional(v.array(v.record(v.string(), v.any()))),
  },
  handler: async (ctx, args) => {
    await requireChatOwner(ctx, args.chatId)

    const now = Date.now()

    const messageId = await ctx.db.insert('messages', {
      chatId: args.chatId,
      role: args.role,
      content: args.content,
      annotations: args.annotations,
      createdAt: now,
    })

    // Update the chat's updatedAt timestamp
    await ctx.db.patch(args.chatId, {
      updatedAt: now,
    })

    return messageId
  },
})

// update (mutation) - update message content/annotations
export const update = mutation({
  args: {
    id: v.id('messages'),
    content: v.optional(v.string()),
    annotations: v.optional(v.array(v.record(v.string(), v.any()))),
  },
  handler: async (ctx, args) => {
    const { message } = await requireMessageOwner(ctx, args.id)

    const updates: Partial<typeof message> = {}

    if (args.content !== undefined) updates.content = args.content
    if (args.annotations !== undefined) updates.annotations = args.annotations

    await ctx.db.patch(args.id, updates)

    return args.id
  },
})

// remove (mutation) - delete message
export const remove = mutation({
  args: { id: v.id('messages') },
  handler: async (ctx, args) => {
    await requireMessageOwner(ctx, args.id)

    // Delete artifacts associated with this message
    const artifacts = await ctx.db
      .query('artifacts')
      .withIndex('by_message', (q) => q.eq('messageId', args.id))
      .collect()

    for (const artifact of artifacts) {
      await ctx.db.delete(artifact._id)
    }

    // Delete the message
    await ctx.db.delete(args.id)

    return args.id
  },
})
