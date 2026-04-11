import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { requireChatOwner, requireMessageOwner } from './lib/authz'

export const generateUploadUrl = mutation({
  args: {
    chatId: v.id('chats'),
  },
  handler: async (ctx, args) => {
    await requireChatOwner(ctx, args.chatId)
    return await ctx.storage.generateUploadUrl()
  },
})

export const createMany = mutation({
  args: {
    chatId: v.id('chats'),
    messageId: v.id('messages'),
    attachments: v.array(
      v.object({
        storageId: v.id('_storage'),
        kind: v.union(v.literal('file'), v.literal('image')),
        filename: v.string(),
        contentType: v.optional(v.string()),
        size: v.optional(v.number()),
        contextFilePath: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { project } = await requireChatOwner(ctx, args.chatId)
    const { message } = await requireMessageOwner(ctx, args.messageId)

    if (message.chatId !== args.chatId) {
      throw new Error('Message does not belong to the specified chat')
    }

    const now = Date.now()

    return await Promise.all(
      args.attachments.map((attachment) =>
        ctx.db.insert('chatAttachments', {
          projectId: project._id,
          chatId: args.chatId,
          messageId: args.messageId,
          storageId: attachment.storageId,
          kind: attachment.kind,
          filename: attachment.filename,
          contentType: attachment.contentType,
          size: attachment.size,
          contextFilePath: attachment.contextFilePath,
          createdAt: now,
        })
      )
    )
  },
})

export const listByMessage = query({
  args: {
    messageId: v.id('messages'),
  },
  handler: async (ctx, args) => {
    await requireMessageOwner(ctx, args.messageId)

    const attachments = await ctx.db
      .query('chatAttachments')
      .withIndex('by_message', (q) => q.eq('messageId', args.messageId))
      .collect()

    return await Promise.all(
      attachments.map(async (attachment) => ({
        ...attachment,
        url: await ctx.storage.getUrl(attachment.storageId),
      }))
    )
  },
})
