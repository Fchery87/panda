import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

// Helper to get current user ID - returns 'mock-user-id' for now
export function getCurrentUserId(): string {
  return 'mock-user-id';
}

// list (query) - list chats by projectId, ordered by updatedAt
export const list = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('chats')
      .withIndex('by_updated', (q) => q.eq('projectId', args.projectId))
      .order('desc')
      .collect();
  },
});

// get (query) - get chat by id
export const get = query({
  args: { id: v.id('chats') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// create (mutation) - create new chat with title and mode
export const create = mutation({
  args: {
    projectId: v.id('projects'),
    title: v.optional(v.string()),
    mode: v.union(v.literal('discuss'), v.literal('build')),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const chatId = await ctx.db.insert('chats', {
      projectId: args.projectId,
      title: args.title,
      mode: args.mode,
      createdAt: now,
      updatedAt: now,
    });
    
    return chatId;
  },
});

// update (mutation) - update chat title/mode
export const update = mutation({
  args: {
    id: v.id('chats'),
    title: v.optional(v.string()),
    mode: v.optional(v.union(v.literal('discuss'), v.literal('build'))),
  },
  handler: async (ctx, args) => {
    const chat = await ctx.db.get(args.id);
    
    if (!chat) {
      throw new Error('Chat not found');
    }
    
    const updates: Partial<typeof chat> = {
      updatedAt: Date.now(),
    };
    
    if (args.title !== undefined) updates.title = args.title;
    if (args.mode !== undefined) updates.mode = args.mode;
    
    await ctx.db.patch(args.id, updates);
    
    return args.id;
  },
});

// remove (mutation) - delete chat and cascade messages/artifacts
export const remove = mutation({
  args: { id: v.id('chats') },
  handler: async (ctx, args) => {
    const chat = await ctx.db.get(args.id);
    
    if (!chat) {
      throw new Error('Chat not found');
    }
    
    // Delete all messages for this chat
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_chat', (q) => q.eq('chatId', args.id))
      .collect();
    
    for (const message of messages) {
      // Delete artifacts associated with this message
      const artifacts = await ctx.db
        .query('artifacts')
        .withIndex('by_message', (q) => q.eq('messageId', message._id))
        .collect();
      
      for (const artifact of artifacts) {
        await ctx.db.delete(artifact._id);
      }
      
      await ctx.db.delete(message._id);
    }
    
    // Delete all artifacts associated with this chat
    const chatArtifacts = await ctx.db
      .query('artifacts')
      .withIndex('by_chat', (q) => q.eq('chatId', args.id))
      .collect();
    
    for (const artifact of chatArtifacts) {
      await ctx.db.delete(artifact._id);
    }
    
    // Delete the chat
    await ctx.db.delete(args.id);
    
    return args.id;
  },
});
