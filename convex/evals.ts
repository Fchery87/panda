import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'
import { requireProjectOwner, requireChatOwner } from './lib/authz'

const EvalSuiteStatus = v.union(v.literal('draft'), v.literal('active'), v.literal('archived'))
const EvalRunStatus = v.union(
  v.literal('running'),
  v.literal('completed'),
  v.literal('failed'),
  v.literal('cancelled')
)
const EvalResultStatus = v.union(v.literal('passed'), v.literal('failed'), v.literal('error'))

const EvalResultInput = v.object({
  scenarioId: v.string(),
  scenarioName: v.string(),
  sequence: v.number(),
  status: EvalResultStatus,
  score: v.number(),
  input: v.any(),
  expected: v.optional(v.any()),
  output: v.optional(v.any()),
  reason: v.optional(v.string()),
  error: v.optional(v.string()),
  tags: v.array(v.string()),
  durationMs: v.number(),
  metadata: v.optional(v.record(v.string(), v.any())),
})

type AuthzCtx = QueryCtx | MutationCtx

async function requireEvalSuiteOwner(ctx: AuthzCtx, suiteId: Id<'evalSuites'>) {
  const suite = await ctx.db.get(suiteId)
  if (!suite) throw new Error('Eval suite not found')
  const access = await requireProjectOwner(ctx, suite.projectId)
  return { ...access, suite }
}

async function requireEvalRunOwner(ctx: AuthzCtx, runId: Id<'evalRuns'>) {
  const run = await ctx.db.get(runId)
  if (!run) throw new Error('Eval run not found')
  const access = await requireProjectOwner(ctx, run.projectId)
  return { ...access, run }
}

export const createSuite = mutation({
  args: {
    projectId: v.id('projects'),
    chatId: v.optional(v.id('chats')),
    name: v.string(),
    description: v.optional(v.string()),
    scenarios: v.array(v.any()),
    tags: v.optional(v.array(v.string())),
    status: v.optional(EvalSuiteStatus),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireProjectOwner(ctx, args.projectId)
    if (args.chatId) {
      const { chat } = await requireChatOwner(ctx, args.chatId)
      if (chat.projectId !== args.projectId) {
        throw new Error('Chat does not belong to project')
      }
    }

    const now = Date.now()
    return await ctx.db.insert('evalSuites', {
      projectId: args.projectId,
      userId,
      chatId: args.chatId,
      name: args.name,
      description: args.description,
      scenarios: args.scenarios,
      tags: args.tags,
      status: args.status ?? 'draft',
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const updateSuite = mutation({
  args: {
    suiteId: v.id('evalSuites'),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    scenarios: v.optional(v.array(v.any())),
    tags: v.optional(v.array(v.string())),
    status: v.optional(EvalSuiteStatus),
  },
  handler: async (ctx, args) => {
    await requireEvalSuiteOwner(ctx, args.suiteId)
    await ctx.db.patch(args.suiteId, {
      ...(args.name !== undefined ? { name: args.name } : {}),
      ...(args.description !== undefined ? { description: args.description } : {}),
      ...(args.scenarios !== undefined ? { scenarios: args.scenarios } : {}),
      ...(args.tags !== undefined ? { tags: args.tags } : {}),
      ...(args.status !== undefined ? { status: args.status } : {}),
      updatedAt: Date.now(),
    })
    return args.suiteId
  },
})

export const listSuitesByProject = query({
  args: {
    projectId: v.id('projects'),
    status: v.optional(EvalSuiteStatus),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    const limit = Math.max(1, Math.min(args.limit ?? 50, 200))
    const suites = await ctx.db
      .query('evalSuites')
      .withIndex('by_project_updated', (q) => q.eq('projectId', args.projectId))
      .order('desc')
      .take(limit)

    return args.status ? suites.filter((s) => s.status === args.status) : suites
  },
})

export const getSuite = query({
  args: { suiteId: v.id('evalSuites') },
  handler: async (ctx, args) => {
    const { suite } = await requireEvalSuiteOwner(ctx, args.suiteId)
    return suite
  },
})

export const startRun = mutation({
  args: {
    suiteId: v.id('evalSuites'),
    runner: v.string(),
    chatId: v.optional(v.id('chats')),
    mode: v.optional(v.union(v.literal('read_only'), v.literal('full'))),
    policy: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { userId, suite } = await requireEvalSuiteOwner(ctx, args.suiteId)
    if (args.chatId) {
      const { chat } = await requireChatOwner(ctx, args.chatId)
      if (chat.projectId !== suite.projectId) {
        throw new Error('Chat does not belong to project')
      }
    }

    const now = Date.now()
    const runId = await ctx.db.insert('evalRuns', {
      projectId: suite.projectId,
      suiteId: suite._id,
      userId,
      chatId: args.chatId ?? suite.chatId,
      status: 'running',
      runner: args.runner,
      mode: args.mode,
      policy: args.policy,
      startedAt: now,
    })

    await ctx.db.patch(suite._id, { lastRunAt: now, updatedAt: now })
    return runId
  },
})

export const appendRunResults = mutation({
  args: {
    runId: v.id('evalRuns'),
    results: v.array(EvalResultInput),
  },
  handler: async (ctx, args) => {
    const { run } = await requireEvalRunOwner(ctx, args.runId)
    if (run.status !== 'running') {
      throw new Error('Eval run is not running')
    }

    const createdAt = Date.now()
    const inserted: Id<'evalRunResults'>[] = []
    for (const result of args.results) {
      const id = await ctx.db.insert('evalRunResults', {
        runId: run._id,
        suiteId: run.suiteId,
        projectId: run.projectId,
        scenarioId: result.scenarioId,
        scenarioName: result.scenarioName,
        sequence: result.sequence,
        status: result.status,
        score: result.score,
        input: result.input,
        expected: result.expected,
        output: result.output,
        reason: result.reason,
        error: result.error,
        tags: result.tags,
        durationMs: result.durationMs,
        metadata: result.metadata,
        createdAt,
      })
      inserted.push(id)
    }
    return inserted
  },
})

export const completeRun = mutation({
  args: {
    runId: v.id('evalRuns'),
    scorecard: v.optional(v.any()),
    summary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireEvalRunOwner(ctx, args.runId)
    await ctx.db.patch(args.runId, {
      status: 'completed',
      scorecard: args.scorecard,
      summary: args.summary,
      completedAt: Date.now(),
    })
    return args.runId
  },
})

export const failRun = mutation({
  args: {
    runId: v.id('evalRuns'),
    error: v.string(),
    scorecard: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await requireEvalRunOwner(ctx, args.runId)
    await ctx.db.patch(args.runId, {
      status: 'failed',
      error: args.error,
      scorecard: args.scorecard,
      completedAt: Date.now(),
    })
    return args.runId
  },
})

export const listRunsBySuite = query({
  args: {
    suiteId: v.id('evalSuites'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireEvalSuiteOwner(ctx, args.suiteId)
    const limit = Math.max(1, Math.min(args.limit ?? 20, 200))
    return await ctx.db
      .query('evalRuns')
      .withIndex('by_suite_started', (q) => q.eq('suiteId', args.suiteId))
      .order('desc')
      .take(limit)
  },
})

export const getSuiteTrend = query({
  args: {
    suiteId: v.id('evalSuites'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireEvalSuiteOwner(ctx, args.suiteId)
    const limit = Math.max(2, Math.min(args.limit ?? 10, 50))
    const runs = await ctx.db
      .query('evalRuns')
      .withIndex('by_suite_started', (q) => q.eq('suiteId', args.suiteId))
      .order('desc')
      .take(limit)

    const completed = runs.filter((run) => run.status === 'completed' && !!run.scorecard)
    const points = completed.map((run) => {
      const scorecard = (run.scorecard ?? {}) as Record<string, unknown>
      const passRate = Number(scorecard.passRate ?? 0)
      const averageScore = Number(scorecard.averageScore ?? 0)
      return {
        runId: run._id,
        startedAt: run.startedAt,
        completedAt: run.completedAt ?? null,
        passRate: Number.isFinite(passRate) ? passRate : 0,
        averageScore: Number.isFinite(averageScore) ? averageScore : 0,
        total: Number(scorecard.total ?? 0) || 0,
        passed: Number(scorecard.passed ?? 0) || 0,
        failed: (Number(scorecard.failed ?? 0) || 0) + (Number(scorecard.errored ?? 0) || 0),
      }
    })

    const latest = points[0] ?? null
    const previous = points[1] ?? null
    const passRateDelta = latest && previous ? latest.passRate - previous.passRate : null
    const averageScoreDelta =
      latest && previous ? latest.averageScore - previous.averageScore : null

    return {
      latest,
      previous,
      passRateDelta,
      averageScoreDelta,
      points,
      trendDirection:
        passRateDelta === null
          ? 'flat'
          : passRateDelta > 0
            ? 'up'
            : passRateDelta < 0
              ? 'down'
              : 'flat',
    }
  },
})

export const getRun = query({
  args: { runId: v.id('evalRuns') },
  handler: async (ctx, args) => {
    const { run } = await requireEvalRunOwner(ctx, args.runId)
    return run
  },
})

export const listRunResults = query({
  args: {
    runId: v.id('evalRuns'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireEvalRunOwner(ctx, args.runId)
    const limit = Math.max(1, Math.min(args.limit ?? 500, 2000))
    return await ctx.db
      .query('evalRunResults')
      .withIndex('by_run_sequence', (q) => q.eq('runId', args.runId))
      .order('asc')
      .take(limit)
  },
})

export const getRunWithResults = query({
  args: { runId: v.id('evalRuns') },
  handler: async (ctx, args) => {
    const { run } = await requireEvalRunOwner(ctx, args.runId)
    const results = await ctx.db
      .query('evalRunResults')
      .withIndex('by_run_sequence', (q) => q.eq('runId', args.runId))
      .order('asc')
      .collect()
    return { run, results }
  },
})
