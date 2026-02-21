/**
 * Provider Tokens - OAuth token storage for LLM providers
 *
 * Manages OAuth tokens for providers like Chutes.ai
 * that support sign-in with OAuth flows.
 */

import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

/**
 * Get OAuth tokens for a provider
 */
export const getProviderTokens = query({
  args: {
    provider: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return null
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', identity.subject))
      .first()

    if (!user) {
      return null
    }

    const tokenRecord = await ctx.db
      .query('providerTokens')
      .withIndex('by_user_provider', (q) => q.eq('userId', user._id).eq('provider', args.provider))
      .first()

    if (!tokenRecord) {
      return null
    }

    // Check if token is expired
    if (tokenRecord.expiresAt && tokenRecord.expiresAt < Date.now()) {
      return {
        expired: true,
        provider: tokenRecord.provider,
      }
    }

    return {
      accessToken: tokenRecord.accessToken,
      refreshToken: tokenRecord.refreshToken,
      expiresAt: tokenRecord.expiresAt,
      scope: tokenRecord.scope,
      provider: tokenRecord.provider,
    }
  },
})

/**
 * Store OAuth tokens for a provider
 */
export const storeProviderTokens = mutation({
  args: {
    provider: v.string(),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    scope: v.optional(v.string()),
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

    // Check if tokens already exist for this provider
    const existing = await ctx.db
      .query('providerTokens')
      .withIndex('by_user_provider', (q) => q.eq('userId', user._id).eq('provider', args.provider))
      .first()

    const now = Date.now()

    if (existing) {
      // Update existing tokens
      await ctx.db.patch(existing._id, {
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        expiresAt: args.expiresAt,
        scope: args.scope,
        updatedAt: now,
      })
      return existing._id
    }

    // Create new token record
    const tokenId = await ctx.db.insert('providerTokens', {
      userId: user._id,
      provider: args.provider,
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      expiresAt: args.expiresAt,
      scope: args.scope,
      createdAt: now,
      updatedAt: now,
    })

    return tokenId
  },
})

/**
 * Delete OAuth tokens for a provider
 */
export const deleteProviderTokens = mutation({
  args: {
    provider: v.string(),
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

    const existing = await ctx.db
      .query('providerTokens')
      .withIndex('by_user_provider', (q) => q.eq('userId', user._id).eq('provider', args.provider))
      .first()

    if (existing) {
      await ctx.db.delete(existing._id)
      return true
    }

    return false
  },
})

/**
 * List all connected providers for the current user
 */
export const listConnectedProviders = query({
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

    const tokens = await ctx.db
      .query('providerTokens')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect()

    return tokens.map((t) => ({
      provider: t.provider,
      connectedAt: t.createdAt,
      expiresAt: t.expiresAt,
      isExpired: t.expiresAt ? t.expiresAt < Date.now() : false,
    }))
  },
})
