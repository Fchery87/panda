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
    const userIdAsId = ctx.db.normalizeId('users', userId);
    
    if (!userIdAsId) {
      return null;
    }
    
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
  },
  handler: async (ctx, args) => {
    const userId = getCurrentUserId();
    const userIdAsId = ctx.db.normalizeId('users', userId);
    
    if (!userIdAsId) {
      throw new Error('User not found');
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
        updatedAt: now,
      });
      
      return settingsId;
    }
  },
});
