import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { requireChatOwner, requireProjectOwner } from './lib/authz'
import { ChatMode, PlanStatus } from './schema'

// list (query) - list chats by projectId, ordered by updatedAt
export const list = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    return await ctx.db
      .query('chats')
      .withIndex('by_updated', (q) => q.eq('projectId', args.projectId))
      .order('desc')
      .collect()
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

// create (mutation) - create new chat with title and mode
export const create = mutation({
  args: {
    projectId: v.id('projects'),
    title: v.optional(v.string()),
    mode: ChatMode,
  },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    const now = Date.now()

    const chatId = await ctx.db.insert('chats', {
      projectId: args.projectId,
      title: args.title,
      mode: args.mode,
      planDraft: undefined,
      planStatus: 'idle',
      planSourceMessageId: undefined,
      planApprovedAt: undefined,
      planLastGeneratedAt: undefined,
      planBuildRunId: undefined,
      planUpdatedAt: undefined,
      createdAt: now,
      updatedAt: now,
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
    planDraft: v.optional(v.string()),
    planStatus: v.optional(PlanStatus),
    planSourceMessageId: v.optional(v.string()),
    planApprovedAt: v.optional(v.number()),
    planLastGeneratedAt: v.optional(v.number()),
    planBuildRunId: v.optional(v.id('agentRuns')),
  },
  handler: async (ctx, args) => {
    const { chat } = await requireChatOwner(ctx, args.id)

    const updates: Partial<typeof chat> = {
      updatedAt: Date.now(),
    }

    if (args.title !== undefined) updates.title = args.title
    if (args.mode !== undefined) updates.mode = args.mode
    if (args.planDraft !== undefined) {
      updates.planDraft = args.planDraft
      updates.planUpdatedAt = Date.now()
    }
    if (args.planStatus !== undefined) updates.planStatus = args.planStatus
    if (args.planSourceMessageId !== undefined)
      updates.planSourceMessageId = args.planSourceMessageId
    if (args.planApprovedAt !== undefined) updates.planApprovedAt = args.planApprovedAt
    if (args.planLastGeneratedAt !== undefined) {
      updates.planLastGeneratedAt = args.planLastGeneratedAt
    }
    if (args.planBuildRunId !== undefined) updates.planBuildRunId = args.planBuildRunId

    await ctx.db.patch(args.id, updates)

    return args.id
  },
})

// remove (mutation) - delete chat and cascade messages/artifacts
export const remove = mutation({
  args: { id: v.id('chats') },
  handler: async (ctx, args) => {
    await requireChatOwner(ctx, args.id)

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
    const { chat: originalChat } = await requireChatOwner(ctx, args.chatId)

    const now = Date.now()

    const forkedChatId = await ctx.db.insert('chats', {
      projectId: originalChat.projectId,
      title: `${originalChat.title || 'Untitled'} (fork)`,
      mode: originalChat.mode,
      planDraft: originalChat.planDraft,
      planStatus: originalChat.planStatus,
      planSourceMessageId: originalChat.planSourceMessageId,
      planApprovedAt: originalChat.planApprovedAt,
      planLastGeneratedAt: originalChat.planLastGeneratedAt,
      planBuildRunId: originalChat.planBuildRunId,
      planUpdatedAt: originalChat.planUpdatedAt,
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
    }

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
