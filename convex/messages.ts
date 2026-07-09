import { query, mutation } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import { paginationOptsValidator } from 'convex/server'
import { v } from 'convex/values'
import { MessageAnnotation, MessageBlock } from './schema'
import { requireChatOwner, requireMessageOwner } from './lib/authz'
import { trackUserAnalytics } from './lib/userAnalytics'

type MessageDoc = Doc<'messages'>
type ChatAttachmentDoc = Doc<'chatAttachments'>
type ChatAttachmentMetadata = Pick<
  ChatAttachmentDoc,
  | '_id'
  | 'storageId'
  | 'kind'
  | 'filename'
  | 'contentType'
  | 'size'
  | 'contextFilePath'
  | 'createdAt'
>

function toAttachmentMetadata(attachment: ChatAttachmentDoc): ChatAttachmentMetadata {
  return {
    _id: attachment._id,
    storageId: attachment.storageId,
    kind: attachment.kind,
    filename: attachment.filename,
    contentType: attachment.contentType,
    size: attachment.size,
    contextFilePath: attachment.contextFilePath,
    createdAt: attachment.createdAt,
  }
}

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

/**
 * @deprecated Legacy compatibility query. Loads up to 1,000 messages and resolves
 * attachment signed URLs for every row. Keep off hot UI paths; use
 * listPaginatedLite plus lazy attachment URL detail instead.
 */
export const list = query({
  args: { chatId: v.id('chats') },
  handler: async (ctx, args) => {
    await requireChatOwner(ctx, args.chatId)
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_created', (q) => q.eq('chatId', args.chatId))
      .order('asc')
      .take(1000)

    return await Promise.all(
      messages.map(async (message) => {
        const attachments = await ctx.db
          .query('chatAttachments')
          .withIndex('by_message', (q) => q.eq('messageId', message._id))
          .take(1000)

        return await enrichMessageWithAttachments({
          message,
          attachments,
          getUrl: (storageId) => ctx.storage.getUrl(storageId),
        })
      })
    )
  },
})

/**
 * @deprecated Legacy compatibility query. Although paginated, it resolves signed
 * attachment URLs for every message in the page. Keep off hot UI paths; use
 * listPaginatedLite and fetch attachment URLs on demand.
 */
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
            .take(1000)

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

// listPaginatedLite (query) - paginated messages with attachment metadata only.
export const listPaginatedLite = query({
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

    const attachmentsByMessage = new Map<Id<'messages'>, ChatAttachmentMetadata[]>()

    await Promise.all(
      page.page.map(async (message) => {
        const attachments = await ctx.db
          .query('chatAttachments')
          .withIndex('by_chat_message', (q) =>
            q.eq('chatId', args.chatId).eq('messageId', message._id)
          )
          .take(1000)

        if (attachments.length > 0) {
          attachmentsByMessage.set(message._id, attachments.map(toAttachmentMetadata))
        }
      })
    )

    return {
      ...page,
      page: page.page.map((message) => ({
        ...message,
        attachments: attachmentsByMessage.get(message._id) ?? [],
      })),
    }
  },
})

export const getAttachmentUrl = query({
  args: { attachmentId: v.id('chatAttachments') },
  handler: async (ctx, args) => {
    const attachment = await ctx.db.get(args.attachmentId)
    if (!attachment) return null

    await requireMessageOwner(ctx, attachment.messageId)

    return await ctx.storage.getUrl(attachment.storageId)
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
      .take(1000)

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
    blocks: v.optional(v.array(MessageBlock)),
    annotations: v.optional(v.array(MessageAnnotation)),
    skipAnalytics: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { project } = await requireChatOwner(ctx, args.chatId)

    const now = Date.now()

    const messageId = await ctx.db.insert('messages', {
      chatId: args.chatId,
      role: args.role,
      content: args.content,
      blocks: args.blocks,
      annotations: args.annotations,
      analyticsTracked: args.skipAnalytics ? false : true,
      createdAt: now,
    })

    await ctx.db.patch(args.chatId, {
      updatedAt: now,
    })

    if (!args.skipAnalytics) {
      await trackUserAnalytics(ctx, project.createdBy, {
        totalMessages: 1,
      })
    }

    return messageId
  },
})

// update (mutation) - update message content/annotations
export const update = mutation({
  args: {
    id: v.id('messages'),
    content: v.optional(v.string()),
    blocks: v.optional(v.array(MessageBlock)),
    annotations: v.optional(v.array(MessageAnnotation)),
  },
  handler: async (ctx, args) => {
    const { message } = await requireMessageOwner(ctx, args.id)

    const updates: Partial<typeof message> = {}

    if (args.content !== undefined) updates.content = args.content
    if (args.blocks !== undefined) updates.blocks = args.blocks
    if (args.annotations !== undefined) updates.annotations = args.annotations

    await ctx.db.patch(args.id, updates)

    return args.id
  },
})

// remove (mutation) - delete message
export const remove = mutation({
  args: { id: v.id('messages') },
  handler: async (ctx, args) => {
    const { message, project } = await requireMessageOwner(ctx, args.id)

    const artifacts = await ctx.db
      .query('artifacts')
      .withIndex('by_message', (q) => q.eq('messageId', args.id))
      .take(1000)

    for (const artifact of artifacts) {
      await ctx.db.delete(artifact._id)
    }

    const attachments = await ctx.db
      .query('chatAttachments')
      .withIndex('by_message', (q) => q.eq('messageId', args.id))
      .take(1000)

    for (const attachment of attachments) {
      await ctx.storage.delete(attachment.storageId)
      await ctx.db.delete(attachment._id)
    }

    await ctx.db.delete(args.id)

    if (message.analyticsTracked !== false) {
      await trackUserAnalytics(ctx, project.createdBy, {
        totalMessages: -1,
      })
    }

    return args.id
  },
})
