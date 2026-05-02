import { query, mutation, type MutationCtx, type QueryCtx } from './_generated/server'
import { v } from 'convex/values'
import { ChatMode, SkillProfile } from './schema'
import { requireAuth } from './lib/auth'

type CustomSkillsCtx = QueryCtx | MutationCtx

async function resolveUserId(ctx: CustomSkillsCtx) {
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

async function getAdminSettings(ctx: CustomSkillsCtx) {
  return await ctx.db.query('adminSettings').order('desc').first()
}

async function assertCustomSkillsEnabled(ctx: CustomSkillsCtx) {
  const adminSettings = await getAdminSettings(ctx)
  if (adminSettings?.allowUserSkills === false) {
    throw new Error('Custom skills are disabled by admin policy')
  }
}

async function assertProfileAllowed(
  ctx: CustomSkillsCtx,
  profile: 'soft_guidance' | 'strict_workflow'
) {
  const adminSettings = await getAdminSettings(ctx)
  if (profile === 'strict_workflow' && adminSettings?.allowStrictUserSkills === false) {
    throw new Error('Strict custom skills are disabled by admin policy')
  }
}

async function assertAutoActivationAllowed(ctx: CustomSkillsCtx, enabled: boolean) {
  const adminSettings = await getAdminSettings(ctx)
  if (enabled && adminSettings?.allowSkillAutoActivation === false) {
    throw new Error('Custom skill auto-activation is disabled by admin policy')
  }
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    if ((await getAdminSettings(ctx))?.allowUserSkills === false) {
      return []
    }

    const userIdAsId = await resolveUserId(ctx)

    return await ctx.db
      .query('customSkills')
      .withIndex('by_user', (q) => q.eq('userId', userIdAsId))
      .order('asc')
      .take(100)
  },
})

export const get = query({
  args: { id: v.id('customSkills') },
  handler: async (ctx, args) => {
    await assertCustomSkillsEnabled(ctx)
    const userIdAsId = await resolveUserId(ctx)
    const customSkill = await ctx.db.get(args.id)

    if (!customSkill) {
      throw new Error('Custom skill not found')
    }

    if (customSkill.userId !== userIdAsId) {
      throw new Error('Unauthorized')
    }

    return customSkill
  },
})

export const add = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    triggerPhrases: v.array(v.string()),
    applicableModes: v.array(ChatMode),
    profile: SkillProfile,
    instructions: v.string(),
    checklist: v.optional(v.array(v.string())),
    requiredValidation: v.optional(v.array(v.string())),
    suggestedSubagents: v.optional(v.array(v.string())),
    autoActivationEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await assertCustomSkillsEnabled(ctx)
    await assertProfileAllowed(ctx, args.profile)
    await assertAutoActivationAllowed(ctx, args.autoActivationEnabled ?? true)

    const userIdAsId = await resolveUserId(ctx)
    const existing = await ctx.db
      .query('customSkills')
      .withIndex('by_user_name', (q) => q.eq('userId', userIdAsId).eq('name', args.name))
      .first()

    if (existing) {
      throw new Error('Custom skill with this name already exists')
    }

    const now = Date.now()
    return await ctx.db.insert('customSkills', {
      userId: userIdAsId,
      name: args.name,
      description: args.description,
      triggerPhrases: args.triggerPhrases,
      applicableModes: args.applicableModes,
      profile: args.profile,
      instructions: args.instructions,
      checklist: args.checklist,
      requiredValidation: args.requiredValidation,
      suggestedSubagents: args.suggestedSubagents,
      autoActivationEnabled: args.autoActivationEnabled ?? true,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const update = mutation({
  args: {
    id: v.id('customSkills'),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    triggerPhrases: v.optional(v.array(v.string())),
    applicableModes: v.optional(v.array(ChatMode)),
    profile: v.optional(SkillProfile),
    instructions: v.optional(v.string()),
    checklist: v.optional(v.array(v.string())),
    requiredValidation: v.optional(v.array(v.string())),
    suggestedSubagents: v.optional(v.array(v.string())),
    autoActivationEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await assertCustomSkillsEnabled(ctx)
    const userIdAsId = await resolveUserId(ctx)
    const customSkill = await ctx.db.get(args.id)

    if (!customSkill) {
      throw new Error('Custom skill not found')
    }

    if (customSkill.userId !== userIdAsId) {
      throw new Error('Unauthorized')
    }

    if (args.profile !== undefined) {
      await assertProfileAllowed(ctx, args.profile)
    }
    if (args.autoActivationEnabled !== undefined) {
      await assertAutoActivationAllowed(ctx, args.autoActivationEnabled)
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() }
    if (args.name !== undefined) updates.name = args.name
    if (args.description !== undefined) updates.description = args.description
    if (args.triggerPhrases !== undefined) updates.triggerPhrases = args.triggerPhrases
    if (args.applicableModes !== undefined) updates.applicableModes = args.applicableModes
    if (args.profile !== undefined) updates.profile = args.profile
    if (args.instructions !== undefined) updates.instructions = args.instructions
    if (args.checklist !== undefined) updates.checklist = args.checklist
    if (args.requiredValidation !== undefined) updates.requiredValidation = args.requiredValidation
    if (args.suggestedSubagents !== undefined) updates.suggestedSubagents = args.suggestedSubagents
    if (args.autoActivationEnabled !== undefined) {
      updates.autoActivationEnabled = args.autoActivationEnabled
    }

    await ctx.db.patch(args.id, updates)
    return args.id
  },
})

export const remove = mutation({
  args: { id: v.id('customSkills') },
  handler: async (ctx, args) => {
    await assertCustomSkillsEnabled(ctx)
    const userIdAsId = await resolveUserId(ctx)
    const customSkill = await ctx.db.get(args.id)

    if (!customSkill) {
      throw new Error('Custom skill not found')
    }

    if (customSkill.userId !== userIdAsId) {
      throw new Error('Unauthorized')
    }

    await ctx.db.delete(args.id)
    return args.id
  },
})
