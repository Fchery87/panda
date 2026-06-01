import { query, mutation, type MutationCtx, type QueryCtx } from './_generated/server'
import { v } from 'convex/values'
import { requireAuth } from './lib/auth'
import { SubagentCapabilityPreset } from './schema'

async function resolveUserId(ctx: QueryCtx | MutationCtx) {
  const userId = await requireAuth(ctx)
  let userIdAsId = ctx.db.normalizeId('users', userId)

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
    throw new Error('User not found')
  }

  return userIdAsId
}

async function assertSubagentsEnabled(ctx: QueryCtx | MutationCtx) {
  const adminSettings = await ctx.db.query('adminSettings').order('desc').first()
  if (adminSettings?.allowUserSubagents === false) {
    throw new Error('Custom subagents are disabled by admin policy')
  }
  return adminSettings
}

function normalizeSubagentName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

async function assertCapabilityPresetAllowed(
  ctx: QueryCtx | MutationCtx,
  preset: 'research' | 'assistant' | 'builder' | 'restricted' | undefined
) {
  if (!preset) return
  const adminSettings = await assertSubagentsEnabled(ctx)
  const allowed = adminSettings?.allowedSubagentCapabilityPresets
  if (allowed && allowed.length > 0 && !allowed.includes(preset)) {
    throw new Error(`Subagent capability preset "${preset}" is disabled by admin policy`)
  }
}

async function assertCustomSubagentLimit(
  ctx: QueryCtx | MutationCtx,
  userId: Awaited<ReturnType<typeof resolveUserId>>
) {
  const adminSettings = await assertSubagentsEnabled(ctx)
  const limit = adminSettings?.maxCustomSubagentsPerUser
  if (typeof limit !== 'number' || limit <= 0) return
  const existing = await ctx.db
    .query('subagents')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .take(limit)
  if (existing.length >= limit) {
    throw new Error(`Custom subagent limit reached (${limit})`)
  }
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    if ((await ctx.db.query('adminSettings').order('desc').first())?.allowUserSubagents === false) {
      return []
    }
    const userIdAsId = await resolveUserId(ctx)

    return await ctx.db
      .query('subagents')
      .withIndex('by_user', (q) => q.eq('userId', userIdAsId!))
      .take(100)
  },
})

export const get = query({
  args: { id: v.id('subagents') },
  handler: async (ctx, args) => {
    await assertSubagentsEnabled(ctx)
    const userId = await requireAuth(ctx)
    const subagent = await ctx.db.get(args.id)

    if (!subagent) {
      throw new Error('Subagent not found')
    }

    let userIdAsId = ctx.db.normalizeId('users', userId)
    if (!userIdAsId) {
      const devUser = await ctx.db
        .query('users')
        .withIndex('email', (q) => q.eq('email', 'dev@example.com'))
        .first()
      if (devUser) userIdAsId = devUser._id
    }

    if (subagent.userId !== userIdAsId) {
      throw new Error('Unauthorized')
    }

    return subagent
  },
})

export const add = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    prompt: v.optional(v.string()),
    model: v.optional(v.string()),
    temperature: v.optional(v.number()),
    maxSteps: v.optional(v.number()),
    capabilityPreset: v.optional(SubagentCapabilityPreset),
    defaultSkillIds: v.optional(v.array(v.id('customSkills'))),
    skillAutoMatchingEnabled: v.optional(v.boolean()),
    permissions: v.optional(
      v.object({
        tools: v.optional(v.record(v.string(), v.string())),
        bash: v.optional(v.record(v.string(), v.string())),
      })
    ),
  },
  handler: async (ctx, args) => {
    await assertSubagentsEnabled(ctx)
    const userIdAsId = await resolveUserId(ctx)
    await assertCustomSubagentLimit(ctx, userIdAsId)
    await assertCapabilityPresetAllowed(ctx, args.capabilityPreset)

    const now = Date.now()
    const normalizedName = normalizeSubagentName(args.name)
    if (!normalizedName) {
      throw new Error('Subagent name must contain letters or numbers')
    }

    const existing = await ctx.db
      .query('subagents')
      .withIndex('by_user_name', (q) => q.eq('userId', userIdAsId!).eq('name', normalizedName))
      .first()

    if (existing) {
      throw new Error('Subagent with this name already exists')
    }

    return await ctx.db.insert('subagents', {
      userId: userIdAsId,
      name: normalizedName,
      description: args.description,
      prompt: args.prompt,
      model: args.model,
      temperature: args.temperature,
      maxSteps: args.maxSteps,
      capabilityPreset: args.capabilityPreset,
      defaultSkillIds: args.defaultSkillIds,
      skillAutoMatchingEnabled: args.skillAutoMatchingEnabled,
      permissions: args.permissions,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const update = mutation({
  args: {
    id: v.id('subagents'),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    prompt: v.optional(v.string()),
    model: v.optional(v.string()),
    temperature: v.optional(v.number()),
    maxSteps: v.optional(v.number()),
    capabilityPreset: v.optional(SubagentCapabilityPreset),
    defaultSkillIds: v.optional(v.array(v.id('customSkills'))),
    skillAutoMatchingEnabled: v.optional(v.boolean()),
    permissions: v.optional(
      v.object({
        tools: v.optional(v.record(v.string(), v.string())),
        bash: v.optional(v.record(v.string(), v.string())),
      })
    ),
  },
  handler: async (ctx, args) => {
    await assertSubagentsEnabled(ctx)
    const userIdAsId = await resolveUserId(ctx)
    await assertCapabilityPresetAllowed(ctx, args.capabilityPreset)
    const subagent = await ctx.db.get(args.id)

    if (!subagent) {
      throw new Error('Subagent not found')
    }

    if (subagent.userId !== userIdAsId) {
      throw new Error('Unauthorized')
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() }
    if (args.name !== undefined) {
      const normalizedName = normalizeSubagentName(args.name)
      if (!normalizedName) {
        throw new Error('Subagent name must contain letters or numbers')
      }
      const existing = await ctx.db
        .query('subagents')
        .withIndex('by_user_name', (q) => q.eq('userId', userIdAsId!).eq('name', normalizedName))
        .first()
      if (existing && existing._id !== args.id) {
        throw new Error('Subagent with this name already exists')
      }
      updates.name = normalizedName
    }
    if (args.description !== undefined) updates.description = args.description
    if (args.prompt !== undefined) updates.prompt = args.prompt
    if (args.model !== undefined) updates.model = args.model
    if (args.temperature !== undefined) updates.temperature = args.temperature
    if (args.maxSteps !== undefined) updates.maxSteps = args.maxSteps
    if (args.capabilityPreset !== undefined) updates.capabilityPreset = args.capabilityPreset
    if (args.defaultSkillIds !== undefined) updates.defaultSkillIds = args.defaultSkillIds
    if (args.skillAutoMatchingEnabled !== undefined) {
      updates.skillAutoMatchingEnabled = args.skillAutoMatchingEnabled
    }
    if (args.permissions !== undefined) updates.permissions = args.permissions

    await ctx.db.patch(args.id, updates)
    return args.id
  },
})

export const remove = mutation({
  args: { id: v.id('subagents') },
  handler: async (ctx, args) => {
    await assertSubagentsEnabled(ctx)
    const userIdAsId = await resolveUserId(ctx)
    const subagent = await ctx.db.get(args.id)

    if (!subagent) {
      throw new Error('Subagent not found')
    }

    if (subagent.userId !== userIdAsId) {
      throw new Error('Unauthorized')
    }

    await ctx.db.delete(args.id)
    return args.id
  },
})
