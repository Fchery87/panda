/**
 * Session Sharing - Convex mutations and queries
 *
 * Allows sharing chat sessions publicly for collaboration and debugging.
 * Generates unique shareable links.
 */

import { mutation, query, type QueryCtx } from './_generated/server'
import { paginationOptsValidator } from 'convex/server'
import { v } from 'convex/values'
import type { Doc } from './_generated/dataModel'
import { requireChatOwner } from './lib/authz'
import { getCurrentUserId, requireAuth } from './lib/auth'

function generateShareId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '')
  }

  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

async function getPublicSharedChat(ctx: QueryCtx, shareId: string) {
  const sharedChat = await ctx.db
    .query('sharedChats')
    .withIndex('by_shareId', (q) => q.eq('shareId', shareId))
    .first()

  if (!sharedChat || !sharedChat.isPublic) {
    return null
  }

  return sharedChat
}

function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

function publicReviewSummary(run: Doc<'agentRuns'> | null) {
  const receipt = run?.receipt

  if (!receipt) {
    return {
      outcome: run?.status ?? 'No run receipt shared',
      validation: 'No validation command recorded',
      changedFiles: 0,
      reviewNote:
        'Public share hides raw tool arguments, command output, and owner-only proof detail.',
    }
  }

  const commandCount = receipt.webcontainer.commandsRun.length
  return {
    outcome: receipt.resultStatus,
    validation:
      commandCount > 0
        ? `${pluralize(commandCount, 'validation command')} recorded`
        : 'No validation command recorded',
    changedFiles: receipt.webcontainer.filesWritten.length,
    reviewNote:
      'Public share hides raw tool arguments, command output, and owner-only proof detail.',
  }
}

export const shareChat = mutation({
  args: {
    chatId: v.id('chats'),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx)
    const chat = await ctx.db.get(args.chatId)
    if (!chat) {
      throw new Error('Chat not found')
    }

    const project = await ctx.db.get(chat.projectId)
    if (!project) {
      throw new Error('Project not found')
    }

    if (project.createdBy !== userId) {
      throw new Error('Not authorized to share this chat')
    }

    const existingShare = await ctx.db
      .query('sharedChats')
      .withIndex('by_chat', (q) => q.eq('chatId', args.chatId))
      .first()

    if (existingShare) {
      return existingShare.shareId
    }

    for (let attempt = 0; attempt < 5; attempt++) {
      const shareId = generateShareId()
      const collision = await ctx.db
        .query('sharedChats')
        .withIndex('by_shareId', (q) => q.eq('shareId', shareId))
        .first()

      if (collision) continue

      await ctx.db.insert('sharedChats', {
        chatId: args.chatId,
        shareId,
        createdBy: userId,
        createdAt: Date.now(),
        isPublic: true,
      })

      return shareId
    }

    throw new Error('Failed to generate unique share link')
  },
})

export const unshareChat = mutation({
  args: {
    chatId: v.id('chats'),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx)

    const sharedChat = await ctx.db
      .query('sharedChats')
      .withIndex('by_chat', (q) => q.eq('chatId', args.chatId))
      .first()

    if (!sharedChat) {
      return false
    }

    if (sharedChat.createdBy !== userId) {
      throw new Error('Not authorized to unshare this chat')
    }

    await ctx.db.delete(sharedChat._id)
    return true
  },
})

export const getSharedChat = query({
  args: {
    shareId: v.string(),
  },
  handler: async (ctx, args) => {
    const sharedChat = await ctx.db
      .query('sharedChats')
      .withIndex('by_shareId', (q) => q.eq('shareId', args.shareId))
      .first()

    if (!sharedChat || !sharedChat.isPublic) {
      return null
    }

    const chat = await ctx.db.get(sharedChat.chatId)
    if (!chat) {
      return null
    }

    const messages = await ctx.db
      .query('messages')
      .withIndex('by_chat', (q) => q.eq('chatId', sharedChat.chatId))
      .order('asc')
      .take(100)

    return {
      chat: {
        title: chat.title,
        mode: chat.mode,
        createdAt: chat.createdAt,
      },
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })),
      sharedAt: sharedChat.createdAt,
    }
  },
})

export const getSharedChatHeader = query({
  args: {
    shareId: v.string(),
  },
  handler: async (ctx, args) => {
    const sharedChat = await getPublicSharedChat(ctx, args.shareId)
    if (!sharedChat) {
      return null
    }

    const chat = await ctx.db.get(sharedChat.chatId)
    if (!chat) {
      return null
    }
    const latestRuns = await ctx.db
      .query('agentRuns')
      .withIndex('by_chat_started', (q) => q.eq('chatId', sharedChat.chatId))
      .order('desc')
      .take(1)

    return {
      chat: {
        title: chat.title,
        mode: chat.mode,
        createdAt: chat.createdAt,
      },
      publicReviewSummary: publicReviewSummary(latestRuns[0] ?? null),
      sharedAt: sharedChat.createdAt,
    }
  },
})

export const listSharedMessagesPaginated = query({
  args: {
    shareId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const sharedChat = await getPublicSharedChat(ctx, args.shareId)
    if (!sharedChat) {
      return {
        page: [],
        isDone: true,
        continueCursor: '',
      }
    }

    const page = await ctx.db
      .query('messages')
      .withIndex('by_created', (q) => q.eq('chatId', sharedChat.chatId))
      .order('asc')
      .paginate(args.paginationOpts)

    return {
      ...page,
      page: page.page.map((message) => ({
        role: message.role,
        content: message.content,
        createdAt: message.createdAt,
      })),
    }
  },
})

export const getChatShareStatus = query({
  args: {
    chatId: v.id('chats'),
  },
  handler: async (ctx, args) => {
    await requireChatOwner(ctx, args.chatId)
    const sharedChat = await ctx.db
      .query('sharedChats')
      .withIndex('by_chat', (q) => q.eq('chatId', args.chatId))
      .first()

    if (!sharedChat) {
      return null
    }

    return {
      shareId: sharedChat.shareId,
      sharedAt: sharedChat.createdAt,
      isPublic: sharedChat.isPublic,
    }
  },
})

export const listMySharedChats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx)
    if (!userId) return []

    const sharedChats = await ctx.db
      .query('sharedChats')
      .withIndex('by_creator', (q) => q.eq('createdBy', userId))
      .take(100)

    return sharedChats.map((sc) => ({
      shareId: sc.shareId,
      chatId: sc.chatId,
      sharedAt: sc.createdAt,
    }))
  },
})
