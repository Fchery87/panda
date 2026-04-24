import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { requireChatOwner, requireProjectOwner } from './lib/authz'
import { ChatMode } from './schema'
import { trackUserAnalytics } from './lib/userAnalytics'

// list (query) - list chats by projectId, ordered by updatedAt
export const list = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const { project } = await requireProjectOwner(ctx, args.projectId)
    return await ctx.db
      .query('chats')
      .withIndex('by_updated', (q) => q.eq('projectId', args.projectId))
      .order('desc')
      .collect()
  },
})

export const listRecent = query({
  args: {
    projectId: v.id('projects'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    const limit = Math.max(1, Math.min(args.limit ?? 25, 100))
    const chats = await ctx.db
      .query('chats')
      .withIndex('by_updated', (q) => q.eq('projectId', args.projectId))
      .order('desc')
      .take(limit)

    return chats.map((chat) => ({
      _id: chat._id,
      _creationTime: chat._creationTime,
      projectId: chat.projectId,
      title: chat.title,
      mode: chat.mode,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    }))
  },
})

// get (query) - get chat by id
export const get = query({
  args: { id: v.id('chats') },
  handler: async (ctx, args) => {
    await requireChatOwner(ctx, args.id)
    return await ctx.db.get(args.id)
  },
})

// Default limits if not configured
const DEFAULT_MAX_CHATS_PER_PROJECT = 50

// create (mutation) - create new chat with title and mode
export const create = mutation({
  args: {
    projectId: v.id('projects'),
    title: v.optional(v.string()),
    mode: ChatMode,
  },
  handler: async (ctx, args) => {
    const { project } = await requireProjectOwner(ctx, args.projectId)

    // Check resource limits
    const adminSettings = await ctx.db.query('adminSettings').order('desc').first()
    const maxChats = adminSettings?.maxChatsPerProject ?? DEFAULT_MAX_CHATS_PER_PROJECT

    const existingChats = await ctx.db
      .query('chats')
      .withIndex('by_updated', (q) => q.eq('projectId', args.projectId))
      .collect()

    if (existingChats.length >= maxChats) {
      throw new Error(
        `Chat limit reached for this project. There are ${existingChats.length} chats (maximum: ${maxChats}). Please delete an existing chat before creating a new one.`
      )
    }

    const now = Date.now()

    const chatId = await ctx.db.insert('chats', {
      projectId: args.projectId,
      title: args.title,
      mode: args.mode,
      createdAt: now,
      updatedAt: now,
    })

    await trackUserAnalytics(ctx, project.createdBy, {
      totalChats: 1,
    })

    return chatId
  },
})

// update (mutation) - update chat title/mode
export const update = mutation({
  args: {
    id: v.id('chats'),
    title: v.optional(v.string()),
    mode: v.optional(ChatMode),
  },
  handler: async (ctx, args) => {
    const { chat } = await requireChatOwner(ctx, args.id)

    const updates: Partial<typeof chat> = {
      updatedAt: Date.now(),
    }

    if (args.title !== undefined) updates.title = args.title
    if (args.mode !== undefined) updates.mode = args.mode

    await ctx.db.patch(args.id, updates)

    return args.id
  },
})

// remove (mutation) - delete chat and cascade messages/artifacts
export const remove = mutation({
  args: { id: v.id('chats') },
  handler: async (ctx, args) => {
    const { project } = await requireChatOwner(ctx, args.id)

    // Delete all messages for this chat
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_chat', (q) => q.eq('chatId', args.id))
      .collect()

    for (const message of messages) {
      // Delete artifacts associated with this message
      const artifacts = await ctx.db
        .query('artifacts')
        .withIndex('by_message', (q) => q.eq('messageId', message._id))
        .collect()

      for (const artifact of artifacts) {
        await ctx.db.delete(artifact._id)
      }

      await ctx.db.delete(message._id)
    }

    // Delete all artifacts associated with this chat
    const chatArtifacts = await ctx.db
      .query('artifacts')
      .withIndex('by_chat', (q) => q.eq('chatId', args.id))
      .collect()

    for (const artifact of chatArtifacts) {
      await ctx.db.delete(artifact._id)
    }

    // Delete planning sessions tied to this chat so the new planning state does not orphan
    const planningSessions = await ctx.db
      .query('planningSessions')
      .withIndex('by_chat', (q) => q.eq('chatId', args.id))
      .collect()

    for (const planningSession of planningSessions) {
      await ctx.db.delete(planningSession._id)
    }

    // Delete all checkpoints associated with this chat
    const chatCheckpoints = await ctx.db
      .query('checkpoints')
      .withIndex('by_chat', (q) => q.eq('chatId', args.id))
      .collect()

    for (const checkpoint of chatCheckpoints) {
      await ctx.db.delete(checkpoint._id)
    }

    // Delete the chat
    await ctx.db.delete(args.id)

    await trackUserAnalytics(ctx, project.createdBy, {
      totalChats: -1,
      totalMessages: -messages.length,
    })

    return args.id
  },
})

// fork (mutation) - create a copy of a chat with all messages up to a point
export const fork = mutation({
  args: {
    chatId: v.id('chats'),
    upToMessageId: v.optional(v.id('messages')),
  },
  handler: async (ctx, args) => {
    const { chat: originalChat, project } = await requireChatOwner(ctx, args.chatId)

    const now = Date.now()

    const forkedChatId = await ctx.db.insert('chats', {
      projectId: originalChat.projectId,
      title: `${originalChat.title || 'Untitled'} (fork)`,
      mode: originalChat.mode,
      createdAt: now,
      updatedAt: now,
    })

    const messages = await ctx.db
      .query('messages')
      .withIndex('by_chat', (q) => q.eq('chatId', args.chatId))
      .order('asc')
      .collect()

    const cutoffTime = args.upToMessageId
      ? (await ctx.db.get(args.upToMessageId))?.createdAt
      : undefined

    let copiedMessageCount = 0
    for (const message of messages) {
      if (cutoffTime && message.createdAt > cutoffTime) {
        break
      }

      await ctx.db.insert('messages', {
        chatId: forkedChatId,
        role: message.role,
        content: message.content,
        annotations: message.annotations,
        createdAt: message.createdAt,
      })
      copiedMessageCount += 1
    }

    await trackUserAnalytics(ctx, project.createdBy, {
      totalChats: 1,
      totalMessages: copiedMessageCount,
    })

    return forkedChatId
  },
})

// revert (mutation) - delete messages after a specific point
export const revert = mutation({
  args: {
    chatId: v.id('chats'),
    upToMessageId: v.id('messages'),
  },
  handler: async (ctx, args) => {
    await requireChatOwner(ctx, args.chatId)

    const cutoffMessage = await ctx.db.get(args.upToMessageId)
    if (!cutoffMessage || cutoffMessage.chatId !== args.chatId) {
      throw new Error('Message not found in this chat')
    }

    const messages = await ctx.db
      .query('messages')
      .withIndex('by_chat', (q) => q.eq('chatId', args.chatId))
      .collect()

    for (const message of messages) {
      if (message.createdAt > cutoffMessage.createdAt) {
        const artifacts = await ctx.db
          .query('artifacts')
          .withIndex('by_message', (q) => q.eq('messageId', message._id))
          .collect()

        for (const artifact of artifacts) {
          await ctx.db.delete(artifact._id)
        }

        await ctx.db.delete(message._id)
      }
    }

    await ctx.db.patch(args.chatId, {
      updatedAt: Date.now(),
    })

    return args.chatId
  },
})
