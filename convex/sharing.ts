/**
 * Session Sharing - Convex mutations and queries
 *
 * Allows sharing chat sessions publicly for collaboration and debugging.
 * Generates unique shareable links.
 */

import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { Id } from './_generated/dataModel'
import { requireChatOwner } from './lib/authz'

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

export const shareChat = mutation({
  args: {
    chatId: v.id('chats'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    const chat = await ctx.db.get(args.chatId)
    if (!chat) {
      throw new Error('Chat not found')
    }

    const project = await ctx.db.get(chat.projectId)
    if (!project) {
      throw new Error('Project not found')
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', identity.subject))
      .first()

    if (!user || project.createdBy !== user._id) {
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
        createdBy: user._id,
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
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', identity.subject))
      .first()

    if (!user) {
      throw new Error('User not found')
    }

    const sharedChat = await ctx.db
      .query('sharedChats')
      .withIndex('by_chat', (q) => q.eq('chatId', args.chatId))
      .first()

    if (!sharedChat) {
      return false
    }

    if (sharedChat.createdBy !== user._id) {
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
      .collect()

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
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return []
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', identity.subject))
      .first()

    if (!user) {
      return []
    }

    const sharedChats = await ctx.db
      .query('sharedChats')
      .withIndex('by_creator', (q) => q.eq('createdBy', user._id))
      .collect()

    return sharedChats.map((sc) => ({
      shareId: sc.shareId,
      chatId: sc.chatId,
      sharedAt: sc.createdAt,
    }))
  },
})
