import type { MutationCtx } from './_generated/server'
import { query, mutation, action } from './_generated/server'
import { v } from 'convex/values'
import { requireJobOwner, requireProjectOwner } from './lib/authz'

const DEFAULT_PREVIEW_PORT = 3000

const DEV_SERVER_PATTERNS = [
  /\bnext\s+dev\b/iu,
  /\bvite\b/iu,
  /\bbun\s+run\s+dev\b/iu,
  /\bnpm\s+run\s+dev\b/iu,
  /\bpnpm\s+dev\b/iu,
  /\byarn\s+dev\b/iu,
]

function parsePreviewPort(command: string): number {
  const patterns = [
    /\bPORT=(\d{2,5})\b/u,
    /--port(?:=|\s+)(\d{2,5})/u,
    /(?:^|\s)-p\s+(\d{2,5})(?:\s|$)/u,
  ]

  for (const pattern of patterns) {
    const value = command.match(pattern)?.[1]
    if (!value) continue
    const port = Number.parseInt(value, 10)
    if (Number.isInteger(port) && port > 0 && port <= 65_535) {
      return port
    }
  }

  return DEFAULT_PREVIEW_PORT
}

function getRuntimePreviewFromCommand(command: string) {
  const trimmed = command.trim()
  if (!trimmed) return null

  const isDevServer = DEV_SERVER_PATTERNS.some((pattern) => pattern.test(trimmed))
  if (!isDevServer) return null

  return {
    status: 'starting' as const,
    previewUrl: `http://localhost:${parsePreviewPort(trimmed)}`,
    activeCommand: trimmed,
    updatedAt: Date.now(),
  }
}

async function syncProjectRuntimePreview(
  ctx: MutationCtx,
  projectId: string,
  command: string,
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled',
  currentRuntimePreview:
    | {
        status: 'starting' | 'running'
        previewUrl: string
        activeCommand: string
        updatedAt: number
      }
    | null
    | undefined
) {
  const runtimePreview = getRuntimePreviewFromCommand(command)
  if (!runtimePreview) return

  if (status === 'queued') {
    await ctx.db.patch(projectId as never, {
      runtimePreview,
    })
    return
  }

  if (status === 'running') {
    await ctx.db.patch(projectId as never, {
      runtimePreview: {
        ...(currentRuntimePreview ?? runtimePreview),
        status: 'running',
        updatedAt: Date.now(),
      },
    })
    return
  }

  if (currentRuntimePreview?.activeCommand === command) {
    await ctx.db.patch(projectId as never, {
      runtimePreview: null,
    })
  }
}

// list (query) - list jobs by projectId
export const list = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
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
    await requireJobOwner(ctx, args.id)
    return await ctx.db.get(args.id)
  },
})

// streamLogs (query) - real-time log streaming subscription
export const streamLogs = query({
  args: { jobId: v.id('jobs') },
  handler: async (ctx, args) => {
    const { job } = await requireJobOwner(ctx, args.jobId)

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
    const { project } = await requireProjectOwner(ctx, args.projectId)
    const now = Date.now()

    const jobId = await ctx.db.insert('jobs', {
      projectId: args.projectId,
      type: args.type,
      status: 'queued',
      command: args.command,
      createdAt: now,
    })

    await syncProjectRuntimePreview(
      ctx,
      args.projectId,
      args.command,
      'queued',
      project.runtimePreview
    )

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
    const { project } = await requireProjectOwner(ctx, args.projectId)
    const now = Date.now()

    const jobId = await ctx.db.insert('jobs', {
      projectId: args.projectId,
      type: args.type,
      status: 'queued',
      command: args.command,
      createdAt: now,
    })

    await syncProjectRuntimePreview(
      ctx,
      args.projectId,
      args.command,
      'queued',
      project.runtimePreview
    )

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
    const { job, project } = await requireJobOwner(ctx, args.id)
    if (job.status === 'cancelled' && args.status !== 'cancelled') {
      return args.id
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
    await syncProjectRuntimePreview(
      ctx,
      job.projectId,
      job.command,
      args.status,
      project.runtimePreview
    )

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
    const { job, project } = await requireJobOwner(ctx, args.id)

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
    const { job, project } = await requireJobOwner(ctx, args.id)

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

    await syncProjectRuntimePreview(
      ctx,
      job.projectId,
      job.command,
      'cancelled',
      project.runtimePreview
    )

    return args.id
  },
})

// remove (mutation) - delete job
export const remove = mutation({
  args: { id: v.id('jobs') },
  handler: async (ctx, args) => {
    const { job, project } = await requireJobOwner(ctx, args.id)

    await syncProjectRuntimePreview(
      ctx,
      job.projectId,
      job.command,
      'cancelled',
      project.runtimePreview
    )

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
    await requireProjectOwner(ctx, args.projectId)
    const cutoffTime = Date.now() - args.olderThanDays * 24 * 60 * 60 * 1000

    const jobs = await ctx.db
      .query('jobs')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .filter((q) => q.lt(q.field('createdAt'), cutoffTime))
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
