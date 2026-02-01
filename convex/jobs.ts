import { query, mutation, action } from './_generated/server'
import { v } from 'convex/values'

// Helper to get current user ID - returns 'mock-user-id' for now
export function getCurrentUserId(): string {
  return 'mock-user-id'
}

// list (query) - list jobs by projectId
export const list = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('jobs')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .order('desc')
      .take(50)
  },
})

// get (query) - get job by id
export const get = query({
  args: { id: v.id('jobs') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

// streamLogs (query) - real-time log streaming subscription
export const streamLogs = query({
  args: { jobId: v.id('jobs') },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId)

    if (!job) {
      return null
    }

    // Return job data that updates in real-time
    return {
      id: job._id,
      status: job.status,
      logs: job.logs || [],
      output: job.output,
      error: job.error,
      command: job.command,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    }
  },
})

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
    const now = Date.now()

    const jobId = await ctx.db.insert('jobs', {
      projectId: args.projectId,
      type: args.type,
      status: 'queued',
      command: args.command,
      createdAt: now,
    })

    return jobId
  },
})

// createAndExecute (mutation + action trigger) - create job and trigger execution
export const createAndExecute = mutation({
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
    workingDirectory: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    const jobId = await ctx.db.insert('jobs', {
      projectId: args.projectId,
      type: args.type,
      status: 'queued',
      command: args.command,
      createdAt: now,
    })

    // Return the jobId so the client can trigger execution
    return { jobId, command: args.command, workingDirectory: args.workingDirectory }
  },
})

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
    const job = await ctx.db.get(args.id)

    if (!job) {
      throw new Error('Job not found')
    }

    const updates: Partial<typeof job> = {
      status: args.status,
    }

    if (args.logs !== undefined) updates.logs = args.logs
    if (args.output !== undefined) updates.output = args.output
    if (args.error !== undefined) updates.error = args.error
    if (args.startedAt !== undefined) updates.startedAt = args.startedAt
    if (args.completedAt !== undefined) updates.completedAt = args.completedAt

    await ctx.db.patch(args.id, updates)

    return args.id
  },
})

// appendLog (mutation) - append a single log line to job
export const appendLog = mutation({
  args: {
    id: v.id('jobs'),
    log: v.string(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.id)

    if (!job) {
      throw new Error('Job not found')
    }

    const currentLogs = job.logs || []

    // Keep only last 1000 logs
    const newLogs = [...currentLogs, args.log]
    if (newLogs.length > 1000) {
      newLogs.shift()
    }

    await ctx.db.patch(args.id, {
      logs: newLogs,
    })

    return args.id
  },
})

// cancel (mutation) - cancel a running job
export const cancel = mutation({
  args: { id: v.id('jobs') },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.id)

    if (!job) {
      throw new Error('Job not found')
    }

    if (job.status !== 'queued' && job.status !== 'running') {
      throw new Error('Can only cancel queued or running jobs')
    }

    const now = Date.now()
    const currentLogs = job.logs || []

    await ctx.db.patch(args.id, {
      status: 'cancelled',
      completedAt: now,
      logs: [...currentLogs, `[${new Date(now).toISOString()}] Job cancelled by user`],
    })

    return args.id
  },
})

// remove (mutation) - delete job
export const remove = mutation({
  args: { id: v.id('jobs') },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.id)

    if (!job) {
      throw new Error('Job not found')
    }

    await ctx.db.delete(args.id)

    return args.id
  },
})

// cleanupOldJobs (mutation) - remove completed jobs older than specified days
export const cleanupOldJobs = mutation({
  args: {
    projectId: v.id('projects'),
    olderThanDays: v.number(),
  },
  handler: async (ctx, args) => {
    const cutoffTime = Date.now() - args.olderThanDays * 24 * 60 * 60 * 1000

    const jobs = await ctx.db
      .query('jobs')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .filter((q) => q.lt(q.field('createdAt'), cutoffTime as any))
      .filter((q) =>
        q.or(q.eq('status', 'completed'), q.eq('status', 'failed'), q.eq('status', 'cancelled'))
      )
      .collect()

    let deletedCount = 0
    for (const job of jobs) {
      await ctx.db.delete(job._id)
      deletedCount++
    }

    return deletedCount
  },
})
