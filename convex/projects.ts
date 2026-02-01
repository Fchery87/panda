import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

// Helper to get current user ID - returns 'mock-user-id' for now
export function getCurrentUserId(): string {
  return 'mock-user-id';
}

// list (query) - list all projects for current user
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = getCurrentUserId();
    let userIdAsId = ctx.db.normalizeId('users', userId);
    
    // If normalizeId fails, try to find by mock email
    if (!userIdAsId) {
      const mockUser = await ctx.db
        .query('users')
        .withIndex('by_email', (q) => q.eq('email', 'mock@example.com'))
        .first();
      if (mockUser) {
        userIdAsId = mockUser._id;
      }
    }
    
    if (!userIdAsId) {
      return [];
    }
    
    return await ctx.db
      .query('projects')
      .withIndex('by_creator', (q) => q.eq('createdBy', userIdAsId))
      .collect();
  },
});

// get (query) - get single project by id
export const get = query({
  args: { id: v.id('projects') },
  handler: async (ctx, args) => {
    const userId = getCurrentUserId();
    let userIdAsId = ctx.db.normalizeId('users', userId);
    
    // If normalizeId fails, try to find by mock email
    if (!userIdAsId) {
      const mockUser = await ctx.db
        .query('users')
        .withIndex('by_email', (q) => q.eq('email', 'mock@example.com'))
        .first();
      if (mockUser) {
        userIdAsId = mockUser._id;
      }
    }
    
    const project = await ctx.db.get(args.id);
    
    if (!project || project.createdBy !== userIdAsId) {
      return null;
    }
    
    return project;
  },
});

// create (mutation) - create new project
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    repoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = getCurrentUserId();
    let userIdAsId = ctx.db.normalizeId('users', userId);
    
    // If user doesn't exist, create a mock user
    if (!userIdAsId) {
      const existingUser = await ctx.db
        .query('users')
        .withIndex('by_email', (q) => q.eq('email', 'mock@example.com'))
        .first();
      
      if (existingUser) {
        userIdAsId = existingUser._id;
      } else {
        userIdAsId = await ctx.db.insert('users', {
          email: 'mock@example.com',
          name: 'Mock User',
          createdAt: Date.now(),
        });
      }
    }
    
    const now = Date.now();
    
    const projectId = await ctx.db.insert('projects', {
      name: args.name,
      description: args.description,
      createdBy: userIdAsId,
      createdAt: now,
      lastOpenedAt: now,
      repoUrl: args.repoUrl,
      agentPolicy: null,
    });
    
    return projectId;
  },
});

// update (mutation) - update project name/description
export const update = mutation({
  args: {
    id: v.id('projects'),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    repoUrl: v.optional(v.string()),
    lastOpenedAt: v.optional(v.number()),
    agentPolicy: v.optional(
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
    
    // If normalizeId fails, try to find by mock email
    if (!userIdAsId) {
      const mockUser = await ctx.db
        .query('users')
        .withIndex('by_email', (q) => q.eq('email', 'mock@example.com'))
        .first();
      if (mockUser) {
        userIdAsId = mockUser._id;
      }
    }
    
    const project = await ctx.db.get(args.id);
    
    if (!project || project.createdBy !== userIdAsId) {
      throw new Error('Project not found or access denied');
    }
    
    const updates: Partial<typeof project> = {};
    
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.repoUrl !== undefined) updates.repoUrl = args.repoUrl;
    if (args.lastOpenedAt !== undefined) updates.lastOpenedAt = args.lastOpenedAt;
    if (args.agentPolicy !== undefined) updates.agentPolicy = args.agentPolicy;
    
    await ctx.db.patch(args.id, updates);
    
    return args.id;
  },
});

// remove (mutation) - delete project and cascade delete related files/chats
export const remove = mutation({
  args: { id: v.id('projects') },
  handler: async (ctx, args) => {
    const userId = getCurrentUserId();
    let userIdAsId = ctx.db.normalizeId('users', userId);
    
    // If normalizeId fails, try to find by mock email
    if (!userIdAsId) {
      const mockUser = await ctx.db
        .query('users')
        .withIndex('by_email', (q) => q.eq('email', 'mock@example.com'))
        .first();
      if (mockUser) {
        userIdAsId = mockUser._id;
      }
    }
    
    const project = await ctx.db.get(args.id);
    
    if (!project || project.createdBy !== userIdAsId) {
      throw new Error('Project not found or access denied');
    }
    
    // Delete all files associated with this project
    const files = await ctx.db
      .query('files')
      .withIndex('by_project', (q) => q.eq('projectId', args.id))
      .collect();
    
    for (const file of files) {
      // Delete file snapshots
      const snapshots = await ctx.db
        .query('fileSnapshots')
        .withIndex('by_file', (q) => q.eq('fileId', file._id))
        .collect();
      
      for (const snapshot of snapshots) {
        await ctx.db.delete(snapshot._id);
      }
      
      await ctx.db.delete(file._id);
    }
    
    // Delete all chats associated with this project
    const chats = await ctx.db
      .query('chats')
      .withIndex('by_project', (q) => q.eq('projectId', args.id))
      .collect();
    
    for (const chat of chats) {
      // Delete all messages for this chat
      const messages = await ctx.db
        .query('messages')
        .withIndex('by_chat', (q) => q.eq('chatId', chat._id))
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
      
      await ctx.db.delete(chat._id);
    }
    
    // Delete all jobs associated with this project
    const jobs = await ctx.db
      .query('jobs')
      .withIndex('by_project', (q) => q.eq('projectId', args.id))
      .collect();
    
    for (const job of jobs) {
      await ctx.db.delete(job._id);
    }
    
    // Finally, delete the project
    await ctx.db.delete(args.id);
    
    return args.id;
  },
});
