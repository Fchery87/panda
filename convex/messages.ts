import { query, mutation } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import { paginationOptsValidator } from 'convex/server'
import { v } from 'convex/values'
import { MessageAnnotation } from './schema'
import { requireChatOwner, requireMessageOwner } from './lib/authz'
import { trackUserAnalytics } from './lib/userAnalytics'

type MessageDoc = Doc<'messages'>
type ChatAttachmentDoc = Doc<'chatAttachments'>

async function enrichMessageWithAttachments(args: {
  message: MessageDoc
  attachments: ChatAttachmentDoc[]
  getUrl: (storageId: Id<'_storage'>) => Promise<string | null>
}): Promise<MessageDoc & { attachments: Array<ChatAttachmentDoc & { url: string | null }> }> {
  const resolvedAttachments = await Promise.all(
    args.attachments.map(async (attachment) => ({
      ...attachment,
      url: await args.getUrl(attachment.storageId),
    }))
  )

  return {
    ...args.message,
    attachments: resolvedAttachments,
  }
}

// list (query) - list messages by chatId, ordered by createdAt
export const list = query({
  args: { chatId: v.id('chats') },
  handler: async (ctx, args) => {
    await requireChatOwner(ctx, args.chatId)
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_created', (q) => q.eq('chatId', args.chatId))
      .order('asc')
      .collect()

    return await Promise.all(
      messages.map(async (message) => {
        const attachments = await ctx.db
          .query('chatAttachments')
          .withIndex('by_message', (q) => q.eq('messageId', message._id))
          .collect()

        return await enrichMessageWithAttachments({
          message,
          attachments,
          getUrl: (storageId) => ctx.storage.getUrl(storageId),
        })
      })
    )
  },
})

// listPaginated (query) - paginated list of messages by chatId
export const listPaginated = query({
  args: {
    chatId: v.id('chats'),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await requireChatOwner(ctx, args.chatId)
    const page = await ctx.db
      .query('messages')
      .withIndex('by_created', (q) => q.eq('chatId', args.chatId))
      .order('asc')
      .paginate(args.paginationOpts)

    return {
      ...page,
      page: await Promise.all(
        page.page.map(async (message) => {
          const attachments = await ctx.db
            .query('chatAttachments')
            .withIndex('by_message', (q) => q.eq('messageId', message._id))
            .collect()

          return await enrichMessageWithAttachments({
            message,
            attachments,
            getUrl: (storageId) => ctx.storage.getUrl(storageId),
          })
        })
      ),
    }
  },
})

// get (query) - get message by id
export const get = query({
  args: { id: v.id('messages') },
  handler: async (ctx, args) => {
    await requireMessageOwner(ctx, args.id)
    const message = await ctx.db.get(args.id)
    if (!message) return null

    const attachments = await ctx.db
      .query('chatAttachments')
      .withIndex('by_message', (q) => q.eq('messageId', message._id))
      .collect()

    return await enrichMessageWithAttachments({
      message,
      attachments,
      getUrl: (storageId) => ctx.storage.getUrl(storageId),
    })
  },
})

// add (mutation) - add new message (updates chat's updatedAt)
export const add = mutation({
  args: {
    chatId: v.id('chats'),
    role: v.union(v.literal('user'), v.literal('assistant'), v.literal('system')),
    content: v.string(),
    annotations: v.optional(v.array(MessageAnnotation)),
  },
  handler: async (ctx, args) => {
    const { project } = await requireChatOwner(ctx, args.chatId)

    const now = Date.now()

    const messageId = await ctx.db.insert('messages', {
      chatId: args.chatId,
      role: args.role,
      content: args.content,
      annotations: args.annotations,
      createdAt: now,
    })

    await ctx.db.patch(args.chatId, {
      updatedAt: now,
    })

    await trackUserAnalytics(ctx, project.createdBy, {
      totalMessages: 1,
    })

    return messageId
  },
})

// update (mutation) - update message content/annotations
export const update = mutation({
  args: {
    id: v.id('messages'),
    content: v.optional(v.string()),
    annotations: v.optional(v.array(MessageAnnotation)),
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
    const { project } = await requireMessageOwner(ctx, args.id)

    const artifacts = await ctx.db
      .query('artifacts')
      .withIndex('by_message', (q) => q.eq('messageId', args.id))
      .collect()

    for (const artifact of artifacts) {
      await ctx.db.delete(artifact._id)
    }

    const attachments = await ctx.db
      .query('chatAttachments')
      .withIndex('by_message', (q) => q.eq('messageId', args.id))
      .collect()

    for (const attachment of attachments) {
      await ctx.storage.delete(attachment.storageId)
      await ctx.db.delete(attachment._id)
    }

    await ctx.db.delete(args.id)

    await trackUserAnalytics(ctx, project.createdBy, {
      totalMessages: -1,
    })

    return args.id
  },
})
