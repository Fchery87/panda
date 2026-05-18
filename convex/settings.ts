import { query, mutation, type MutationCtx, type QueryCtx } from './_generated/server'
import { v } from 'convex/values'
import { requireAuth, getCurrentUserId } from './lib/auth'
import { HarnessCommandFamilyPolicyEntry } from './schema'

const DISALLOWED_PROVIDER_SECRET_KEYS = new Set([
  'accessToken',
  'refreshToken',
  'idToken',
  'clientSecret',
  'sessionToken',
])

type ProviderConfigMap = Record<string, Record<string, unknown>>
type SettingsCtx = QueryCtx | MutationCtx
type CommandFamily =
  | 'package-manager'
  | 'network'
  | 'git'
  | 'destructive'
  | 'remote-exec'
  | 'filesystem-write'
  | 'unknown'
type CommandFamilyDecision = 'allow' | 'ask' | 'deny'
type CommandFamilyPolicyEntry = {
  family: CommandFamily
  decision: CommandFamilyDecision
}

const DEFAULT_COMMAND_FAMILY_POLICY: CommandFamilyPolicyEntry[] = [
  { family: 'package-manager', decision: 'allow' },
  { family: 'network', decision: 'ask' },
  { family: 'git', decision: 'allow' },
  { family: 'destructive', decision: 'ask' },
  { family: 'remote-exec', decision: 'ask' },
  { family: 'filesystem-write', decision: 'ask' },
  { family: 'unknown', decision: 'ask' },
]

const COMMAND_FAMILY_DECISION_RANK: Record<CommandFamilyDecision, number> = {
  allow: 0,
  ask: 1,
  deny: 2,
}

function normalizeCommandFamilyPolicy(
  policy: CommandFamilyPolicyEntry[] | undefined
): CommandFamilyPolicyEntry[] {
  const byFamily = new Map<CommandFamily, CommandFamilyDecision>()
  for (const entry of DEFAULT_COMMAND_FAMILY_POLICY) {
    byFamily.set(entry.family, entry.decision)
  }
  for (const entry of policy ?? []) {
    byFamily.set(entry.family, entry.decision)
  }
  return DEFAULT_COMMAND_FAMILY_POLICY.map((entry) => ({
    family: entry.family,
    decision: byFamily.get(entry.family) ?? entry.decision,
  }))
}

function mergeCommandFamilyPolicy(args: {
  adminPolicy: CommandFamilyPolicyEntry[] | undefined
  userPreferences: CommandFamilyPolicyEntry[] | undefined
}): CommandFamilyPolicyEntry[] {
  const adminPolicy = normalizeCommandFamilyPolicy(args.adminPolicy)
  const userPreferences = new Map<CommandFamily, CommandFamilyDecision>()
  for (const entry of args.userPreferences ?? []) {
    userPreferences.set(entry.family, entry.decision)
  }

  return adminPolicy.map((adminEntry) => {
    const userDecision = userPreferences.get(adminEntry.family)
    if (!userDecision) return adminEntry
    return COMMAND_FAMILY_DECISION_RANK[userDecision] >=
      COMMAND_FAMILY_DECISION_RANK[adminEntry.decision]
      ? { family: adminEntry.family, decision: userDecision }
      : adminEntry
  })
}

function assertCommandFamilyPreferencesWithinAdminCeiling(args: {
  adminPolicy: CommandFamilyPolicyEntry[] | undefined
  userPreferences: CommandFamilyPolicyEntry[] | undefined
}) {
  const adminPolicy = normalizeCommandFamilyPolicy(args.adminPolicy)
  const adminByFamily = new Map(adminPolicy.map((entry) => [entry.family, entry.decision] as const))

  for (const preference of args.userPreferences ?? []) {
    const adminDecision = adminByFamily.get(preference.family) ?? 'ask'
    if (
      COMMAND_FAMILY_DECISION_RANK[preference.decision] <
      COMMAND_FAMILY_DECISION_RANK[adminDecision]
    ) {
      throw new Error(
        `Command-family preference for ${preference.family} cannot loosen admin policy`
      )
    }
  }
}

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
      allowedMCPTransports: ['stdio', 'sse', 'http'],
      commandFamilyPolicy: DEFAULT_COMMAND_FAMILY_POLICY,
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

    const commandFamilyPolicy = normalizeCommandFamilyPolicy(adminSettings.commandFamilyPolicy)
    const commandFamilyPreferences = userSettings?.commandFamilyPreferences ?? []
    const effectiveCommandFamilyPolicy = mergeCommandFamilyPolicy({
      adminPolicy: commandFamilyPolicy,
      userPreferences: commandFamilyPreferences,
    })

    // If user is admin, return their settings without provider merging, but still expose
    // command-family governance metadata used by the runtime permission snapshot.
    if (isAdmin && userSettings) {
      return {
        ...userSettings,
        commandFamilyPolicy,
        effectiveCommandFamilyPolicy,
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
      commandFamilyPreferences,

      // Provider configuration
      defaultProvider: effectiveProvider,
      defaultModel: effectiveModel,
      providerConfigs: toClientProviderConfigs(
        userSettings?.providerConfigs as ProviderConfigMap | undefined
      ),

      // Admin settings info
      allowUserOverrides: adminSettings.allowUserOverrides,
      allowUserMCP: adminSettings.allowUserMCP,
      allowedMCPTransports: adminSettings.allowedMCPTransports ?? ['stdio', 'sse', 'http'],
      commandFamilyPolicy,
      effectiveCommandFamilyPolicy,
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
      allowedMCPTransports: adminSettings.allowedMCPTransports ?? ['stdio', 'sse', 'http'],
      commandFamilyPolicy: normalizeCommandFamilyPolicy(adminSettings.commandFamilyPolicy),
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
          yoloCommandMode: v.optional(v.boolean()),
        })
      )
    ),
    commandFamilyPreferences: v.optional(v.array(HarnessCommandFamilyPolicyEntry)),
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
    const adminSettings = await getAdminSettings(ctx)
    if (args.commandFamilyPreferences !== undefined) {
      assertCommandFamilyPreferencesWithinAdminCeiling({
        adminPolicy: adminSettings.commandFamilyPolicy,
        userPreferences: args.commandFamilyPreferences,
      })
    }
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
      if (args.commandFamilyPreferences !== undefined)
        updates.commandFamilyPreferences = args.commandFamilyPreferences
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
        commandFamilyPreferences: args.commandFamilyPreferences,
        overrideGlobalProvider: args.overrideGlobalProvider,
        overrideGlobalModel: args.overrideGlobalModel,
        overrideProviderConfigs: args.overrideProviderConfigs,
        updatedAt: now,
      })

      return settingsId
    }
  },
})
