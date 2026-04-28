/**
 * Provider Tokens - OAuth token storage for LLM providers
 *
 * Manages OAuth tokens for providers like Chutes.ai
 * that support sign-in with OAuth flows.
 */

import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getCurrentUserId, requireAuth } from './lib/auth'
import { sealProviderSecret } from './lib/providerSecrets'

/**
 * Get OAuth tokens for a provider
 */
export const getProviderTokens = query({
  args: {
    provider: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    if (!userId) return null

    const tokenRecord = await ctx.db
      .query('providerTokens')
      .withIndex('by_user_provider', (q) => q.eq('userId', userId).eq('provider', args.provider))
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
      connected: true,
      hasAccessToken: Boolean(tokenRecord.accessTokenEnvelope),
      hasRefreshToken: Boolean(tokenRecord.refreshTokenEnvelope),
      expiresAt: tokenRecord.expiresAt,
      scope: tokenRecord.scope,
      provider: tokenRecord.provider,
      expiresSoon:
        typeof tokenRecord.expiresAt === 'number'
          ? tokenRecord.expiresAt - Date.now() < 5 * 60 * 1000
          : false,
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
    const userId = await requireAuth(ctx)

    // Check if tokens already exist for this provider
    const existing = await ctx.db
      .query('providerTokens')
      .withIndex('by_user_provider', (q) => q.eq('userId', userId).eq('provider', args.provider))
      .first()

    const now = Date.now()

    if (existing) {
      // Update existing tokens
      await ctx.db.patch(existing._id, {
        accessTokenEnvelope: sealProviderSecret(args.accessToken),
        refreshTokenEnvelope: sealProviderSecret(args.refreshToken),
        expiresAt: args.expiresAt,
        scope: args.scope,
        updatedAt: now,
      })
      return existing._id
    }

    // Create new token record
    const tokenId = await ctx.db.insert('providerTokens', {
      userId,
      provider: args.provider,
      accessTokenEnvelope: sealProviderSecret(args.accessToken)!,
      refreshTokenEnvelope: sealProviderSecret(args.refreshToken),
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
    const userId = await requireAuth(ctx)

    const existing = await ctx.db
      .query('providerTokens')
      .withIndex('by_user_provider', (q) => q.eq('userId', userId).eq('provider', args.provider))
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
    const userId = await getCurrentUserId(ctx)
    if (!userId) return []

    const tokens = await ctx.db
      .query('providerTokens')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()

    return tokens.map((t) => ({
      provider: t.provider,
      connectedAt: t.createdAt,
      expiresAt: t.expiresAt,
      isExpired: t.expiresAt ? t.expiresAt < Date.now() : false,
    }))
  },
})
