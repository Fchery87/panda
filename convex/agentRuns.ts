import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import {
  ChatMode,
  ExecutionReceipt,
  PersistedRunEvent,
  RuntimeCheckpointPayload,
  TokenUsage,
} from './schema'
import type { Doc, Id } from './_generated/dataModel'
import { requireAgentRunOwner, requireChatOwner, requireProjectOwner } from './lib/authz'
import { trackUserAnalytics } from './lib/userAnalytics'

type RuntimeCheckpointEnvelope = {
  version: number
  sessionID: string
  agentName: string
  reason: 'step' | 'complete' | 'error'
  savedAt: number
}

function parseRuntimeCheckpointEnvelope(checkpoint: unknown): RuntimeCheckpointEnvelope {
  if (!checkpoint || typeof checkpoint !== 'object') {
    throw new Error('Invalid runtime checkpoint payload')
  }

  const record = checkpoint as Record<string, unknown>
  const { version, sessionID, agentName, reason, savedAt } = record

  if (version !== 1) {
    throw new Error('Unsupported runtime checkpoint version')
  }
  if (typeof sessionID !== 'string' || sessionID.length === 0) {
    throw new Error('Runtime checkpoint sessionID is required')
  }
  if (typeof agentName !== 'string' || agentName.length === 0) {
    throw new Error('Runtime checkpoint agentName is required')
  }
  if (reason !== 'step' && reason !== 'complete' && reason !== 'error') {
    throw new Error('Invalid runtime checkpoint reason')
  }
  if (typeof savedAt !== 'number' || !Number.isFinite(savedAt)) {
    throw new Error('Runtime checkpoint savedAt must be a finite number')
  }

  const state = record.state
  if (!state || typeof state !== 'object') {
    throw new Error('Runtime checkpoint state is required')
  }
  const stateSessionID = (state as Record<string, unknown>).sessionID
  if (typeof stateSessionID !== 'string' || stateSessionID !== sessionID) {
    throw new Error('Runtime checkpoint state.sessionID must match sessionID')
  }
  if (typeof (state as Record<string, unknown>).step !== 'number') {
    throw new Error('Runtime checkpoint state.step must be a finite number')
  }
  if (typeof (state as Record<string, unknown>).isComplete !== 'boolean') {
    throw new Error('Runtime checkpoint state.isComplete is required')
  }
  if (typeof (state as Record<string, unknown>).isLastStep !== 'boolean') {
    throw new Error('Runtime checkpoint state.isLastStep is required')
  }

  return { version, sessionID, agentName, reason, savedAt }
}

function previewText(value: string | undefined): string | undefined {
  return value === undefined ? undefined : value.slice(0, 500)
}

function toRunEventSummary(event: Doc<'agentRunEvents'>) {
  return {
    _id: event._id,
    runId: event.runId,
    chatId: event.chatId,
    sequence: event.sequence,
    type: event.type,
    status: event.status,
    progressCategory: event.progressCategory,
    progressToolName: event.progressToolName,
    progressHasArtifactTarget: event.progressHasArtifactTarget,
    targetFilePaths: event.targetFilePaths,
    toolCallId: event.toolCallId,
    toolName: event.toolName,
    durationMs: event.durationMs,
    planStepIndex: event.planStepIndex,
    planStepTitle: event.planStepTitle,
    planTotalSteps: event.planTotalSteps,
    completedPlanStepIndexes: event.completedPlanStepIndexes,
    usage: event.usage,
    snapshot: event.snapshot,
    createdAt: event.createdAt,
    contentPreview: previewText(event.content),
    errorPreview: previewText(event.error),
  }
}

function toRuntimeCheckpointSummary(checkpoint: Doc<'harnessRuntimeCheckpoints'>) {
  return {
    _id: checkpoint._id,
    runId: checkpoint.runId,
    chatId: checkpoint.chatId,
    sessionID: checkpoint.sessionID,
    reason: checkpoint.reason,
    savedAt: checkpoint.savedAt,
    agentName: checkpoint.agentName,
    version: checkpoint.version,
  }
}

export const create = mutation({
  args: {
    projectId: v.id('projects'),
    chatId: v.id('chats'),
    userId: v.id('users'),
    mode: ChatMode,
    provider: v.optional(v.string()),
    model: v.optional(v.string()),
    userMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireProjectOwner(ctx, args.projectId)
    const { chat } = await requireChatOwner(ctx, args.chatId)
    if (chat.projectId !== args.projectId) {
      throw new Error('Chat does not belong to the specified project')
    }

    const startedAt = Date.now()
    const runId = await ctx.db.insert('agentRuns', {
      projectId: args.projectId,
      chatId: args.chatId,
      userId,
      mode: args.mode,
      provider: args.provider,
      model: args.model,
      userMessage: args.userMessage,
      status: 'running',
      startedAt,
    })

    await trackUserAnalytics(ctx, userId, {
      provider: args.provider,
    })

    return runId
  },
})

export const appendEvents = mutation({
  args: {
    runId: v.id('agentRuns'),
    events: v.array(PersistedRunEvent),
  },
  handler: async (ctx, args) => {
    const { run } = await requireAgentRunOwner(ctx, args.runId)

    const normalizedEvents = [...args.events].sort((a, b) => a.sequence - b.sequence)
    const createdAt = Date.now()
    for (const [index, event] of normalizedEvents.entries()) {
      await ctx.db.insert('agentRunEvents', {
        runId: args.runId,
        chatId: run.chatId,
        sequence: event.sequence,
        type: event.type,
        content: event.content,
        status: event.status,
        progressCategory: event.progressCategory,
        progressToolName: event.progressToolName,
        progressHasArtifactTarget: event.progressHasArtifactTarget,
        targetFilePaths: event.targetFilePaths,
        toolCallId: event.toolCallId,
        toolName: event.toolName,
        args: event.args,
        output: event.output,
        error: event.error,
        durationMs: event.durationMs,
        planStepIndex: event.planStepIndex,
        planStepTitle: event.planStepTitle,
        planTotalSteps: event.planTotalSteps,
        completedPlanStepIndexes: event.completedPlanStepIndexes,
        usage: event.usage,
        snapshot: event.snapshot,
        createdAt: createdAt + index,
      })
    }

    return normalizedEvents.length
  },
})

export const complete = mutation({
  args: {
    runId: v.id('agentRuns'),
    summary: v.optional(v.string()),
    usage: v.optional(TokenUsage),
    receipt: v.optional(ExecutionReceipt),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAgentRunOwner(ctx, args.runId)

    const completedAt = Date.now()
    await ctx.db.patch(args.runId, {
      status: 'completed',
      summary: args.summary,
      usage: args.usage,
      receipt: args.receipt,
      completedAt,
    })

    await trackUserAnalytics(ctx, userId, {
      totalTokensUsed: args.usage?.totalTokens ?? 0,
    })

    return args.runId
  },
})

export const fail = mutation({
  args: {
    runId: v.id('agentRuns'),
    error: v.string(),
    receipt: v.optional(ExecutionReceipt),
  },
  handler: async (ctx, args) => {
    await requireAgentRunOwner(ctx, args.runId)

    await ctx.db.patch(args.runId, {
      status: 'failed',
      error: args.error,
      receipt: args.receipt,
      completedAt: Date.now(),
    })

    return args.runId
  },
})

export const stop = mutation({
  args: {
    runId: v.id('agentRuns'),
    receipt: v.optional(ExecutionReceipt),
  },
  handler: async (ctx, args) => {
    const { run } = await requireAgentRunOwner(ctx, args.runId)
    if (run.status !== 'running') return args.runId

    await ctx.db.patch(args.runId, {
      status: 'stopped',
      receipt: args.receipt,
      completedAt: Date.now(),
    })

    return args.runId
  },
})

export const listByChat = query({
  args: {
    chatId: v.id('chats'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireChatOwner(ctx, args.chatId)
    const limit = Math.max(1, Math.min(args.limit ?? 20, 200))
    return await ctx.db
      .query('agentRuns')
      .withIndex('by_chat_started', (q) => q.eq('chatId', args.chatId))
      .order('desc')
      .take(limit)
  },
})

export const getLatestReceiptByChat = query({
  args: {
    chatId: v.id('chats'),
  },
  handler: async (ctx, args) => {
    await requireChatOwner(ctx, args.chatId)
    const runs = await ctx.db
      .query('agentRuns')
      .withIndex('by_chat_started', (q) => q.eq('chatId', args.chatId))
      .order('desc')
      .take(1)
    const run = runs[0]

    if (!run) return null

    return {
      runId: run._id,
      status: run.status,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      receipt: run.receipt ?? null,
    }
  },
})

export const listRecentByProject = query({
  args: {
    projectId: v.id('projects'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { project } = await requireProjectOwner(ctx, args.projectId)
    const limit = Math.max(1, Math.min(args.limit ?? 5, 50))
    return await ctx.db
      .query('agentRuns')
      .withIndex('by_project_started', (q) => q.eq('projectId', args.projectId))
      .order('desc')
      .take(limit)
  },
})

export const usageByChatMode = query({
  args: {
    chatId: v.id('chats'),
    mode: v.optional(ChatMode),
  },
  handler: async (ctx, args) => {
    await requireChatOwner(ctx, args.chatId)
    // Recent estimate only; this keeps the reactive query bounded on chat mount.
    const runs = await ctx.db
      .query('agentRuns')
      .withIndex('by_chat_started', (q) => q.eq('chatId', args.chatId))
      .order('desc')
      .take(50)

    const usage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      runCount: 0,
    }

    for (const run of runs) {
      if (args.mode && run.mode !== args.mode) continue
      if (run.status !== 'completed' || !run.usage) continue

      const promptTokens = Number(run.usage.promptTokens ?? 0)
      const completionTokens = Number(run.usage.completionTokens ?? 0)
      const totalTokens = Number(run.usage.totalTokens ?? promptTokens + completionTokens)

      usage.promptTokens += Number.isFinite(promptTokens) ? promptTokens : 0
      usage.completionTokens += Number.isFinite(completionTokens) ? completionTokens : 0
      usage.totalTokens += Number.isFinite(totalTokens) ? totalTokens : 0
      usage.runCount += 1
    }

    return usage
  },
})

export const listEventsByChat = query({
  args: {
    chatId: v.id('chats'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireChatOwner(ctx, args.chatId)
    const limit = Math.max(1, Math.min(args.limit ?? 100, 500))
    const events = await ctx.db
      .query('agentRunEvents')
      .withIndex('by_chat_created', (q) => q.eq('chatId', args.chatId))
      .order('desc')
      .take(limit)

    return events.reverse()
  },
})

export const listEventSummariesByChat = query({
  args: {
    chatId: v.id('chats'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireChatOwner(ctx, args.chatId)
    const limit = Math.max(1, Math.min(args.limit ?? 60, 200))
    const events = await ctx.db
      .query('agentRunEvents')
      .withIndex('by_chat_created', (q) => q.eq('chatId', args.chatId))
      .order('desc')
      .take(limit)

    return events.reverse().map(toRunEventSummary)
  },
})

export const saveRuntimeCheckpoint = mutation({
  args: {
    runId: v.optional(v.id('agentRuns')),
    chatId: v.optional(v.id('chats')),
    checkpoint: RuntimeCheckpointPayload,
  },
  handler: async (ctx, args) => {
    let projectId: Id<'projects'>
    let chatId: Id<'chats'>

    if (args.runId) {
      const { run } = await requireAgentRunOwner(ctx, args.runId)
      projectId = run.projectId
      chatId = run.chatId
      if (args.chatId && args.chatId !== run.chatId) {
        throw new Error('chatId does not match runId')
      }
    } else if (args.chatId) {
      const { chat } = await requireChatOwner(ctx, args.chatId)
      projectId = chat.projectId
      chatId = chat._id
    } else {
      throw new Error('runId or chatId is required to save a runtime checkpoint')
    }

    const envelope = parseRuntimeCheckpointEnvelope(args.checkpoint)

    return await ctx.db.insert('harnessRuntimeCheckpoints', {
      projectId,
      chatId,
      runId: args.runId,
      sessionID: envelope.sessionID,
      version: envelope.version,
      agentName: envelope.agentName,
      reason: envelope.reason,
      savedAt: envelope.savedAt,
      checkpoint: args.checkpoint,
    })
  },
})

export const getLatestRuntimeCheckpoint = query({
  args: {
    sessionID: v.string(),
    runId: v.optional(v.id('agentRuns')),
    chatId: v.optional(v.id('chats')),
    projectId: v.optional(v.id('projects')),
  },
  handler: async (ctx, args) => {
    if (args.runId) {
      await requireAgentRunOwner(ctx, args.runId)
      const rows = await ctx.db
        .query('harnessRuntimeCheckpoints')
        .withIndex('by_run_session_saved', (q) =>
          q.eq('runId', args.runId).eq('sessionID', args.sessionID)
        )
        .order('desc')
        .take(1)

      return (rows[0]?.checkpoint as unknown) ?? null
    }

    if (args.chatId) {
      const chatId = args.chatId
      await requireChatOwner(ctx, args.chatId)
      const rows = await ctx.db
        .query('harnessRuntimeCheckpoints')
        .withIndex('by_chat_session_saved', (q) =>
          q.eq('chatId', chatId).eq('sessionID', args.sessionID)
        )
        .order('desc')
        .take(1)

      return (rows[0]?.checkpoint as unknown) ?? null
    }

    if (args.projectId) {
      const projectId = args.projectId
      await requireProjectOwner(ctx, args.projectId)
      const rows = await ctx.db
        .query('harnessRuntimeCheckpoints')
        .withIndex('by_project_session_saved', (q) =>
          q.eq('projectId', projectId).eq('sessionID', args.sessionID)
        )
        .order('desc')
        .take(1)

      return (rows[0]?.checkpoint as unknown) ?? null
    }

    throw new Error('runId, chatId, or projectId is required to load a runtime checkpoint')
  },
})

export const listRuntimeCheckpoints = query({
  args: {
    runId: v.optional(v.id('agentRuns')),
    chatId: v.optional(v.id('chats')),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 20, 200))

    if (args.runId) {
      await requireAgentRunOwner(ctx, args.runId)
      return await ctx.db
        .query('harnessRuntimeCheckpoints')
        .withIndex('by_run_saved', (q) => q.eq('runId', args.runId))
        .order('desc')
        .take(limit)
    }

    if (args.chatId) {
      const chatId = args.chatId
      await requireChatOwner(ctx, args.chatId)
      return await ctx.db
        .query('harnessRuntimeCheckpoints')
        .withIndex('by_chat_saved', (q) => q.eq('chatId', chatId))
        .order('desc')
        .take(limit)
    }

    throw new Error('runId or chatId is required to list runtime checkpoints')
  },
})

export const listRuntimeCheckpointSummaries = query({
  args: {
    runId: v.optional(v.id('agentRuns')),
    chatId: v.optional(v.id('chats')),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 20, 200))

    if (args.runId) {
      await requireAgentRunOwner(ctx, args.runId)
      const checkpoints = await ctx.db
        .query('harnessRuntimeCheckpoints')
        .withIndex('by_run_saved', (q) => q.eq('runId', args.runId))
        .order('desc')
        .take(limit)

      return checkpoints.map(toRuntimeCheckpointSummary)
    }

    if (args.chatId) {
      const chatId = args.chatId
      await requireChatOwner(ctx, args.chatId)
      const checkpoints = await ctx.db
        .query('harnessRuntimeCheckpoints')
        .withIndex('by_chat_saved', (q) => q.eq('chatId', chatId))
        .order('desc')
        .take(limit)

      return checkpoints.map(toRuntimeCheckpointSummary)
    }

    throw new Error('runId or chatId is required to list runtime checkpoint summaries')
  },
})
