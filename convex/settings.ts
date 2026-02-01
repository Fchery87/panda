import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

// Helper to get current user ID - returns 'mock-user-id' for now
export function getCurrentUserId(): string {
  return 'mock-user-id';
}

// get (query) - get settings for current user
export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = getCurrentUserId();
    let userIdAsId = ctx.db.normalizeId('users', userId);
    
    // Dev-mode fallback: allow settings to work before auth is wired.
    if (!userIdAsId) {
      const existingDevUser = await ctx.db
        .query('users')
        .withIndex('by_email', (q) => q.eq('email', 'dev@example.com'))
        .first();
      userIdAsId = existingDevUser?._id ?? null;
    }
    
    if (!userIdAsId) return null;
    
    const settings = await ctx.db
      .query('settings')
      .withIndex('by_user', (q) => q.eq('userId', userIdAsId))
      .unique();
    
    return settings;
  },
});

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
  },
  handler: async (ctx, args) => {
    const userId = getCurrentUserId();
    let userIdAsId = ctx.db.normalizeId('users', userId);
    
    // Dev-mode fallback: create a default user record if none exists yet.
    // This avoids blocking settings for local development while auth is not wired.
    if (!userIdAsId) {
      const existingDevUser = await ctx.db
        .query('users')
        .withIndex('by_email', (q) => q.eq('email', 'dev@example.com'))
        .first();

      userIdAsId =
        existingDevUser?._id ??
        (await ctx.db.insert('users', {
          email: 'dev@example.com',
          name: 'Developer',
          createdAt: Date.now(),
        }));
    }
    
    const now = Date.now();
    
    // Try to find existing settings
    const existing = await ctx.db
      .query('settings')
      .withIndex('by_user', (q) => q.eq('userId', userIdAsId))
      .unique();
    
    if (existing) {
      // Update existing settings
      const updates: Partial<typeof existing> = {
        updatedAt: now,
      };
      
      if (args.providerConfigs !== undefined) updates.providerConfigs = args.providerConfigs;
      if (args.theme !== undefined) updates.theme = args.theme;
      if (args.language !== undefined) updates.language = args.language;
      if (args.defaultProvider !== undefined) updates.defaultProvider = args.defaultProvider;
      if (args.defaultModel !== undefined) updates.defaultModel = args.defaultModel;
      if (args.agentDefaults !== undefined) updates.agentDefaults = args.agentDefaults;
      
      await ctx.db.patch(existing._id, updates);
      return existing._id;
    } else {
      // Create new settings
      const settingsId = await ctx.db.insert('settings', {
        userId: userIdAsId,
        providerConfigs: args.providerConfigs || {},
        theme: args.theme || 'system',
        language: args.language,
        defaultProvider: args.defaultProvider,
        defaultModel: args.defaultModel,
        agentDefaults: args.agentDefaults ?? null,
        updatedAt: now,
      });
      
      return settingsId;
    }
  },
});
