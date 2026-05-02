import { query, mutation, type MutationCtx, type QueryCtx } from './_generated/server'
import { v } from 'convex/values'
import { requireAuth, getCurrentUserId } from './lib/auth'

const DISALLOWED_PROVIDER_SECRET_KEYS = new Set([
  'accessToken',
  'refreshToken',
  'idToken',
  'clientSecret',
  'sessionToken',
])

type ProviderConfigMap = Record<string, Record<string, unknown>>
type SettingsCtx = QueryCtx | MutationCtx

function toClientProviderConfigs(
  providerConfigs: ProviderConfigMap | undefined
): ProviderConfigMap {
  return sanitizeProviderConfigsForStorage(providerConfigs) ?? {}
}

function sanitizeProviderConfigsForStorage(
  providerConfigs: ProviderConfigMap | undefined
): ProviderConfigMap | undefined {
  if (!providerConfigs) return providerConfigs

  const sanitized: ProviderConfigMap = {}

  for (const [providerKey, config] of Object.entries(providerConfigs)) {
    const nextConfig: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(config || {})) {
      if (DISALLOWED_PROVIDER_SECRET_KEYS.has(key)) {
        continue
      }
      nextConfig[key] = value
    }
    sanitized[providerKey] = nextConfig
  }

  return sanitized
}

/**
 * Get admin global settings
 */
async function getAdminSettings(ctx: SettingsCtx) {
  const settings = await ctx.db.query('adminSettings').order('desc').first()

  return (
    settings || {
      globalDefaultProvider: null,
      globalDefaultModel: null,
      globalProviderConfigs: {},
      enhancementProvider: null,
      enhancementModel: null,
      allowUserOverrides: true,
      allowUserMCP: true,
      allowUserSubagents: true,
      allowUserSkills: true,
      allowSkillAutoActivation: true,
      allowStrictUserSkills: true,
      allowSkillImportExport: true,
      allowedSubagentCapabilityPresets: ['research', 'assistant', 'builder', 'restricted'],
      systemMaintenance: false,
      registrationEnabled: true,
      maxProjectsPerUser: 100,
      maxCustomSubagentsPerUser: 50,
      maxCustomSkillsPerUser: 50,
      updatedAt: 0,
    }
  )
}

// get (query) - get settings for current user
export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx)
    if (!userId) return null

    let userIdAsId = ctx.db.normalizeId('users', userId)

    // If normalizeId fails, try to find by dev email
    if (!userIdAsId) {
      const devUser = await ctx.db
        .query('users')
        .withIndex('email', (q) => q.eq('email', 'dev@example.com'))
        .first()
      if (devUser) {
        userIdAsId = devUser._id
      }
    }

    if (!userIdAsId) {
      return null
    }

    const settings = await ctx.db
      .query('settings')
      .withIndex('by_user', (q) => q.eq('userId', userIdAsId))
      .unique()

    return settings
  },
})

/**
 * Get effective settings - merges admin global settings with user overrides
 * This is the main function that should be used when running the agent
 */
export const getEffective = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx)
    if (!userId) return null

    let userIdAsId = ctx.db.normalizeId('users', userId)

    // If normalizeId fails, try to find by dev email
    if (!userIdAsId) {
      const devUser = await ctx.db
        .query('users')
        .withIndex('email', (q) => q.eq('email', 'dev@example.com'))
        .first()
      if (devUser) {
        userIdAsId = devUser._id
      }
    }

    if (!userIdAsId) {
      return null
    }

    // Get admin global settings
    const adminSettings = await getAdminSettings(ctx)

    // Get user settings
    const userSettings = await ctx.db
      .query('settings')
      .withIndex('by_user', (q) => q.eq('userId', userIdAsId))
      .unique()

    // Check if user is admin (admins always use their own settings)
    const user = await ctx.db.get(userIdAsId)
    const isAdmin = user?.isAdmin ?? false

    // If user is admin, return their settings without merging
    if (isAdmin && userSettings) {
      return {
        ...userSettings,
        isAdmin: true,
        effectiveProvider: userSettings.defaultProvider,
        effectiveModel: userSettings.defaultModel,
        usingGlobalDefaults: false,
      }
    }

    // Determine effective provider and model
    let effectiveProvider = userSettings?.defaultProvider
    let effectiveModel = userSettings?.defaultModel
    let usingGlobalDefaults = false

    // Check if overrides are allowed
    const allowOverrides = adminSettings.allowUserOverrides ?? true

    if (!allowOverrides || !effectiveProvider || !effectiveModel) {
      // Use admin global settings
      effectiveProvider = adminSettings.globalDefaultProvider ?? effectiveProvider ?? 'openai'
      effectiveModel = adminSettings.globalDefaultModel ?? effectiveModel ?? 'gpt-4o-mini'
      usingGlobalDefaults = true
    }

    return {
      // Base settings
      theme: userSettings?.theme ?? 'system',
      language: userSettings?.language ?? 'en',
      agentDefaults: userSettings?.agentDefaults,

      // Provider configuration
      defaultProvider: effectiveProvider,
      defaultModel: effectiveModel,
      providerConfigs: toClientProviderConfigs(
        userSettings?.providerConfigs as ProviderConfigMap | undefined
      ),

      // Admin settings info
      allowUserOverrides: adminSettings.allowUserOverrides,
      allowUserMCP: adminSettings.allowUserMCP,
      allowUserSubagents: adminSettings.allowUserSubagents,
      allowUserSkills: adminSettings.allowUserSkills ?? true,
      allowSkillAutoActivation: adminSettings.allowSkillAutoActivation ?? true,
      allowStrictUserSkills: adminSettings.allowStrictUserSkills ?? true,
      allowSkillImportExport: adminSettings.allowSkillImportExport ?? true,
      allowedSubagentCapabilityPresets: adminSettings.allowedSubagentCapabilityPresets ?? [
        'research',
        'assistant',
        'builder',
        'restricted',
      ],
      maxCustomSubagentsPerUser: adminSettings.maxCustomSubagentsPerUser ?? 50,
      maxCustomSkillsPerUser: adminSettings.maxCustomSkillsPerUser ?? 50,

      // User settings info
      userOverridesProvider: userSettings?.overrideGlobalProvider ?? false,
      userOverridesModel: userSettings?.overrideGlobalModel ?? false,

      // Effective settings info
      isAdmin: false,
      effectiveProvider,
      effectiveModel,
      usingGlobalDefaults,

      // Original settings
      updatedAt: userSettings?.updatedAt ?? Date.now(),
    }
  },
})

/**
 * Get admin settings info for the settings page
 * This tells users what the admin has configured as defaults
 */
export const getAdminDefaults = query({
  args: {},
  handler: async (ctx) => {
    const adminSettings = await getAdminSettings(ctx)

    return {
      globalDefaultProvider: adminSettings.globalDefaultProvider,
      globalDefaultModel: adminSettings.globalDefaultModel,
      enhancementProvider: adminSettings.enhancementProvider,
      enhancementModel: adminSettings.enhancementModel,
      allowUserOverrides: adminSettings.allowUserOverrides ?? true,
      allowUserMCP: adminSettings.allowUserMCP ?? true,
      allowUserSubagents: adminSettings.allowUserSubagents ?? true,
      allowUserSkills: adminSettings.allowUserSkills ?? true,
      allowSkillAutoActivation: adminSettings.allowSkillAutoActivation ?? true,
      allowStrictUserSkills: adminSettings.allowStrictUserSkills ?? true,
      allowSkillImportExport: adminSettings.allowSkillImportExport ?? true,
      allowedSubagentCapabilityPresets: adminSettings.allowedSubagentCapabilityPresets ?? [
        'research',
        'assistant',
        'builder',
        'restricted',
      ],
      registrationEnabled: adminSettings.registrationEnabled ?? true,
      systemMaintenance: adminSettings.systemMaintenance ?? false,
      maxProjectsPerUser: adminSettings.maxProjectsPerUser ?? 100,
      maxCustomSubagentsPerUser: adminSettings.maxCustomSubagentsPerUser ?? 50,
      maxCustomSkillsPerUser: adminSettings.maxCustomSkillsPerUser ?? 50,
      updatedAt: adminSettings.updatedAt,
    }
  },
})

// update (mutation) - update or create settings
export const update = mutation({
  args: {
    providerConfigs: v.optional(v.record(v.string(), v.record(v.string(), v.any()))),
    theme: v.optional(v.union(v.literal('light'), v.literal('dark'), v.literal('system'))),
    language: v.optional(v.string()),
    defaultProvider: v.optional(v.string()),
    defaultModel: v.optional(v.string()),
    agentDefaults: v.optional(
      v.union(
        v.null(),
        v.object({
          autoApplyFiles: v.boolean(),
          autoRunCommands: v.boolean(),
          allowedCommandPrefixes: v.array(v.string()),
        })
      )
    ),
    // Admin override tracking
    overrideGlobalProvider: v.optional(v.boolean()),
    overrideGlobalModel: v.optional(v.boolean()),
    overrideProviderConfigs: v.optional(v.record(v.string(), v.boolean())),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx)
    const sanitizedProviderConfigs = sanitizeProviderConfigsForStorage(
      args.providerConfigs as ProviderConfigMap | undefined
    )
    let userIdAsId = ctx.db.normalizeId('users', userId)

    // If normalizeId fails, try to find by dev email
    if (!userIdAsId) {
      const devUser = await ctx.db
        .query('users')
        .withIndex('email', (q) => q.eq('email', 'dev@example.com'))
        .first()
      if (devUser) {
        userIdAsId = devUser._id
      }
    }

    // Create user if they don't exist (for development)
    if (!userIdAsId) {
      userIdAsId = await ctx.db.insert('users', {
        email: 'dev@example.com',
        name: 'Developer',
        tokenIdentifier: 'dev-token-' + Date.now(),
        createdAt: Date.now(),
      })
    }

    const now = Date.now()

    // Try to find existing settings
    const existing = await ctx.db
      .query('settings')
      .withIndex('by_user', (q) => q.eq('userId', userIdAsId))
      .unique()

    if (existing) {
      // Update existing settings
      const updates: Partial<typeof existing> = {
        updatedAt: now,
      }

      if (args.providerConfigs !== undefined) updates.providerConfigs = sanitizedProviderConfigs
      if (args.theme !== undefined) updates.theme = args.theme
      if (args.language !== undefined) updates.language = args.language
      if (args.defaultProvider !== undefined) updates.defaultProvider = args.defaultProvider
      if (args.defaultModel !== undefined) updates.defaultModel = args.defaultModel
      if (args.agentDefaults !== undefined) updates.agentDefaults = args.agentDefaults
      if (args.overrideGlobalProvider !== undefined)
        updates.overrideGlobalProvider = args.overrideGlobalProvider
      if (args.overrideGlobalModel !== undefined)
        updates.overrideGlobalModel = args.overrideGlobalModel
      if (args.overrideProviderConfigs !== undefined)
        updates.overrideProviderConfigs = args.overrideProviderConfigs

      await ctx.db.patch(existing._id, updates)
      return existing._id
    } else {
      // Create new settings
      const settingsId = await ctx.db.insert('settings', {
        userId: userIdAsId,
        providerConfigs: sanitizedProviderConfigs || {},
        theme: args.theme || 'system',
        language: args.language,
        defaultProvider: args.defaultProvider,
        defaultModel: args.defaultModel,
        agentDefaults: args.agentDefaults ?? null,
        overrideGlobalProvider: args.overrideGlobalProvider,
        overrideGlobalModel: args.overrideGlobalModel,
        overrideProviderConfigs: args.overrideProviderConfigs,
        updatedAt: now,
      })

      return settingsId
    }
  },
})
