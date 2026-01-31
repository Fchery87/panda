import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

// Helper to get current user ID - returns 'mock-user-id' for now
export function getCurrentUserId(): string {
  return 'mock-user-id';
}

// list (query) - list jobs by projectId
export const list = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('jobs')
      .withIndex('by_created', (q) => q.eq('projectId', args.projectId))
      .order('desc')
      .collect();
  },
});

// get (query) - get job by id
export const get = query({
  args: { id: v.id('jobs') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// create (mutation) - create new job
export const create = mutation({
  args: {
    projectId: v.id('projects'),
    type: v.union(
      v.literal('cli'),
      v.literal('build'),
      v.literal('test'),
      v.literal('deploy'),
      v.literal('lint'),
      v.literal('format')
    ),
    command: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const jobId = await ctx.db.insert('jobs', {
      projectId: args.projectId,
      type: args.type,
      status: 'queued',
      command: args.command,
      createdAt: now,
    });
    
    return jobId;
  },
});

// updateStatus (mutation) - update job status, logs, output, error
export const updateStatus = mutation({
  args: {
    id: v.id('jobs'),
    status: v.union(
      v.literal('queued'),
      v.literal('running'),
      v.literal('completed'),
      v.literal('failed'),
      v.literal('cancelled')
    ),
    logs: v.optional(v.array(v.string())),
    output: v.optional(v.string()),
    error: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.id);
    
    if (!job) {
      throw new Error('Job not found');
    }
    
    const updates: Partial<typeof job> = {
      status: args.status,
    };
    
    if (args.logs !== undefined) updates.logs = args.logs;
    if (args.output !== undefined) updates.output = args.output;
    if (args.error !== undefined) updates.error = args.error;
    if (args.startedAt !== undefined) updates.startedAt = args.startedAt;
    if (args.completedAt !== undefined) updates.completedAt = args.completedAt;
    
    await ctx.db.patch(args.id, updates);
    
    return args.id;
  },
});

// remove (mutation) - delete job
export const remove = mutation({
  args: { id: v.id('jobs') },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.id);
    
    if (!job) {
      throw new Error('Job not found');
    }
    
    await ctx.db.delete(args.id);
    
    return args.id;
  },
});
