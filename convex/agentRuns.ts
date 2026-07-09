import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from './_generated/server'
import { paginationOptsValidator } from 'convex/server'
import { v } from 'convex/values'
import {
  AgentRunKind,
  ChatMode,
  ExecutionReceipt,
  PersistedRunEvent,
  RuntimeCheckpointPayload,
  SubagentContextMode,
  SubagentIsolationMode,
  TerminationReason,
  TokenUsage,
} from './schema'
import type { Doc, Id } from './_generated/dataModel'
import { requireAgentRunOwner, requireChatOwner, requireProjectOwner } from './lib/authz'
import { deleteRunEventWithBody, insertRunEvent } from './lib/runEvents'
import { trackRunStartAnalytics, trackRunTerminalAnalytics } from './lib/runTelemetry'

type RuntimeCheckpointEnvelope = {
  version: number
  sessionID: string
  agentName: string
  reason: 'step' | 'complete' | 'error'
  savedAt: number
}

type AgentRunStatus = Doc<'agentRuns'>['status']

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

function stableHash(value: unknown): string {
  const text = JSON.stringify(value)
  let hash = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

type RuntimeCheckpointSummaryFields = {
  checkpointHash: string
  messageCount?: number
  step?: number
  inputTokens?: number
  outputTokens?: number
  reasoningTokens?: number
}

function summarizeRuntimeCheckpoint(checkpoint: unknown): RuntimeCheckpointSummaryFields {
  const state = (checkpoint as { state?: unknown }).state as Record<string, unknown>
  const messages = Array.isArray(state.messages) ? state.messages : undefined
  const tokens = state.tokens as Record<string, unknown> | undefined
  const inputTokens = typeof tokens?.input === 'number' ? tokens.input : undefined
  const outputTokens = typeof tokens?.output === 'number' ? tokens.output : undefined
  const reasoningTokens = typeof tokens?.reasoning === 'number' ? tokens.reasoning : undefined

  return {
    checkpointHash: stableHash(checkpoint),
    ...(messages ? { messageCount: messages.length } : {}),
    ...(typeof state.step === 'number' ? { step: state.step } : {}),
    ...(inputTokens !== undefined ? { inputTokens } : {}),
    ...(outputTokens !== undefined ? { outputTokens } : {}),
    ...(reasoningTokens !== undefined ? { reasoningTokens } : {}),
  }
}

async function loadRuntimeCheckpointBody(
  ctx: QueryCtx | MutationCtx,
  checkpoint: Doc<'harnessRuntimeCheckpoints'>
): Promise<unknown | undefined> {
  const body = await ctx.db
    .query('harnessRuntimeCheckpointBodies')
    .withIndex('by_checkpoint', (q) => q.eq('checkpointId', checkpoint._id))
    .first()

  return body?.checkpoint ?? checkpoint.checkpoint
}

async function deleteRuntimeCheckpointWithBody(
  ctx: MutationCtx,
  checkpointId: Id<'harnessRuntimeCheckpoints'>
): Promise<void> {
  const bodies = await ctx.db
    .query('harnessRuntimeCheckpointBodies')
    .withIndex('by_checkpoint', (q) => q.eq('checkpointId', checkpointId))
    .take(10)
  for (const body of bodies) {
    await ctx.db.delete(body._id)
  }
  await ctx.db.delete(checkpointId)
}

function assertAgentRunTransition(from: AgentRunStatus, to: AgentRunStatus): void {
  if (from === to) return
  if (from !== 'running') {
    throw new Error(`Cannot transition agent run from ${from} to ${to}`)
  }
}

async function hydrateRunEventBody(ctx: QueryCtx, event: Doc<'agentRunEvents'>) {
  if (!event.hasBody) return event

  const body = await ctx.db
    .query('agentRunEventBodies')
    .withIndex('by_event', (q) => q.eq('eventId', event._id))
    .first()

  if (!body) return event

  return {
    ...event,
    content: body.content ?? event.content,
    output: body.output ?? event.output,
    error: body.error ?? event.error,
    args: body.args ?? event.args,
    snapshot: body.snapshot ?? event.snapshot,
  }
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
    // Raw snapshots are cold proof/debug data. Keep them out of hot run-event
    // summaries to reduce live-query payload churn.
    appliedSkills: event.appliedSkills,
    subagentSummary: event.subagentSummary,
    createdAt: event.createdAt,
    contentPreview: event.contentPreview ?? previewText(event.content),
    outputPreview: event.outputPreview ?? previewText(event.output),
    errorPreview: event.errorPreview ?? previewText(event.error),
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
    checkpointHash: checkpoint.checkpointHash,
    messageCount: checkpoint.messageCount,
    step: checkpoint.step,
    inputTokens: checkpoint.inputTokens,
    outputTokens: checkpoint.outputTokens,
    reasoningTokens: checkpoint.reasoningTokens,
    hasBody: checkpoint.hasBody,
  }
}

const MAX_RUN_TREE_CHILD_LIMIT = 500
const MAX_RUN_EVENT_APPEND_BATCH = 100
const MAX_RETENTION_DELETE_BATCH = 500
const DEFAULT_CHILD_RUN_EVENT_RETENTION = 200
const DEFAULT_CHECKPOINT_RETENTION = 20
const DEFAULT_HOT_CHECKPOINT_RETENTION = 8

function toProjectRunSummary(run: Doc<'agentRuns'>) {
  const changedFiles = run.receipt?.webcontainer.filesWritten.length ?? 0
  const commandCount = run.receipt?.webcontainer.commandsRun.length ?? 0
  const approvalCount = run.receipt?.nativeExecution.approvalsRequested.length ?? 0

  return {
    _id: run._id,
    chatId: run.chatId,
    mode: run.mode,
    provider: run.provider,
    model: run.model,
    runKind: run.runKind ?? 'primary',
    parentRunId: run.parentRunId,
    rootRunId: run.rootRunId,
    subagentName: run.subagentName,
    subagentDepth: run.subagentDepth,
    contextMode: run.contextMode,
    isolationMode: run.isolationMode,
    delegatedTaskSummary: previewText(run.delegatedTaskSummary),
    lastActivityAt: run.lastActivityAt,
    artifactCount: run.artifactCount,
    status: run.status,
    userMessage: previewText(run.userMessage),
    summary: previewText(run.summary),
    error: previewText(run.error),
    changedFiles,
    commandCount,
    approvalCount,
    resultStatus: run.receipt?.resultStatus,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
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
    analyticsPendingMessageId: v.optional(v.id('messages')),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireProjectOwner(ctx, args.projectId)
    const { chat } = await requireChatOwner(ctx, args.chatId)
    if (chat.projectId !== args.projectId) {
      throw new Error('Chat does not belong to the specified project')
    }

    if (args.analyticsPendingMessageId) {
      const pendingMessage = await ctx.db.get(args.analyticsPendingMessageId)
      if (
        !pendingMessage ||
        pendingMessage.chatId !== args.chatId ||
        pendingMessage.role !== 'user'
      ) {
        throw new Error('Invalid pending analytics message for run')
      }
    }

    const startedAt = Date.now()
    const runId = await ctx.db.insert('agentRuns', {
      projectId: args.projectId,
      chatId: args.chatId,
      userId,
      mode: args.mode,
      runKind: 'primary',
      provider: args.provider,
      model: args.model,
      userMessage: args.userMessage,
      status: 'running',
      analyticsPendingMessageId: args.analyticsPendingMessageId,
      startedAt,
    })

    await trackRunStartAnalytics(ctx, userId, {
      provider: args.provider,
      analyticsPendingMessageId: args.analyticsPendingMessageId,
    })

    return runId
  },
})

export const createChild = mutation({
  args: {
    parentRunId: v.id('agentRuns'),
    parentSubagentId: v.optional(v.string()),
    subagentName: v.string(),
    delegatedTaskSummary: v.string(),
    contextMode: v.optional(SubagentContextMode),
    isolationMode: v.optional(SubagentIsolationMode),
    provider: v.optional(v.string()),
    model: v.optional(v.string()),
    outputMode: v.optional(v.union(v.literal('inline'), v.literal('file-only'))),
  },
  handler: async (ctx, args) => {
    const { run: parentRun, userId } = await requireAgentRunOwner(ctx, args.parentRunId)
    const startedAt = Date.now()
    return await ctx.db.insert('agentRuns', {
      projectId: parentRun.projectId,
      chatId: parentRun.chatId,
      userId,
      mode: parentRun.mode,
      provider: args.provider ?? parentRun.provider,
      model: args.model ?? parentRun.model,
      status: 'running',
      userMessage: args.delegatedTaskSummary,
      runKind: 'subagent',
      parentRunId: args.parentRunId,
      parentSubagentId: args.parentSubagentId,
      rootRunId: parentRun.rootRunId ?? parentRun._id,
      subagentName: args.subagentName,
      subagentDepth: (parentRun.subagentDepth ?? 0) + 1,
      contextMode: args.contextMode ?? 'fresh',
      isolationMode: args.isolationMode ?? 'shared-readonly',
      delegatedTaskSummary: previewText(args.delegatedTaskSummary),
      outputMode: args.outputMode ?? 'inline',
      artifactCount: 0,
      lastActivityAt: startedAt,
      startedAt,
    })
  },
})

export const touchActivity = mutation({
  args: {
    runId: v.id('agentRuns'),
    artifactCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAgentRunOwner(ctx, args.runId)
    await ctx.db.patch(args.runId, {
      lastActivityAt: Date.now(),
      ...(args.artifactCount !== undefined ? { artifactCount: args.artifactCount } : {}),
    })
    return args.runId
  },
})

export const appendEvents = mutation({
  args: {
    runId: v.id('agentRuns'),
    events: v.array(PersistedRunEvent),
  },
  handler: async (ctx, args) => {
    const { run } = await requireAgentRunOwner(ctx, args.runId)
    if (args.events.length > MAX_RUN_EVENT_APPEND_BATCH) {
      throw new Error(`Cannot append more than ${MAX_RUN_EVENT_APPEND_BATCH} run events at once`)
    }

    const normalizedEvents = [...args.events].sort((a, b) => a.sequence - b.sequence)
    const createdAt = Date.now()
    for (const [index, event] of normalizedEvents.entries()) {
      await insertRunEvent(ctx, {
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
        appliedSkills: event.appliedSkills,
        subagentSummary: event.subagentSummary,
        createdAt: createdAt + index,
      })
    }

    return normalizedEvents.length
  },
})

export const backfillRunEventBodies = internalMutation({
  args: {
    runId: v.id('agentRuns'),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query('agentRunEvents')
      .withIndex('by_run_sequence', (q) => q.eq('runId', args.runId))
      .order('asc')
      .paginate({
        ...args.paginationOpts,
        numItems: Math.max(1, Math.min(args.paginationOpts.numItems, 500)),
        maximumRowsRead: 500,
      })
    const events = page.page

    let written = 0
    let skipped = 0
    let patched = 0

    for (const event of events) {
      const hasInlineBody =
        event.content !== undefined ||
        event.output !== undefined ||
        event.error !== undefined ||
        event.args !== undefined ||
        event.snapshot !== undefined
      const existingBody = await ctx.db
        .query('agentRunEventBodies')
        .withIndex('by_event', (q) => q.eq('eventId', event._id))
        .first()

      if (hasInlineBody && !existingBody) {
        await ctx.db.insert('agentRunEventBodies', {
          eventId: event._id,
          runId: event.runId,
          chatId: event.chatId,
          sequence: event.sequence,
          content: event.content,
          output: event.output,
          error: event.error,
          args: event.args,
          snapshot: event.snapshot,
          createdAt: event.createdAt,
        })
        written += 1
      } else {
        skipped += 1
      }

      const patch: Partial<Omit<Doc<'agentRunEvents'>, '_id' | '_creationTime'>> = {}
      const hasBody = hasInlineBody || Boolean(existingBody)
      const hasArgs = event.args !== undefined || existingBody?.args !== undefined
      const hasSnapshot = event.snapshot !== undefined || existingBody?.snapshot !== undefined
      const contentPreview =
        event.contentPreview ?? previewText(event.content ?? existingBody?.content)
      const outputPreview = event.outputPreview ?? previewText(event.output ?? existingBody?.output)
      const errorPreview = event.errorPreview ?? previewText(event.error ?? existingBody?.error)

      if (event.hasBody !== hasBody) patch.hasBody = hasBody
      if (event.hasArgs !== hasArgs) patch.hasArgs = hasArgs
      if (event.hasSnapshot !== hasSnapshot) patch.hasSnapshot = hasSnapshot
      if (event.contentPreview !== contentPreview) patch.contentPreview = contentPreview
      if (event.outputPreview !== outputPreview) patch.outputPreview = outputPreview
      if (event.errorPreview !== errorPreview) patch.errorPreview = errorPreview

      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(event._id, patch)
        patched += 1
      }
    }

    return {
      processed: events.length,
      written,
      skipped,
      patched,
      isDone: page.isDone,
      continueCursor: page.continueCursor,
    }
  },
})

export const pruneRunRetention = mutation({
  args: {
    runId: v.id('agentRuns'),
    keepEvents: v.optional(v.number()),
    keepCheckpoints: v.optional(v.number()),
    deleteBatchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAgentRunOwner(ctx, args.runId)
    const keepEvents = Math.max(
      0,
      Math.min(args.keepEvents ?? DEFAULT_CHILD_RUN_EVENT_RETENTION, 1000)
    )
    const keepCheckpoints = Math.max(
      0,
      Math.min(args.keepCheckpoints ?? DEFAULT_CHECKPOINT_RETENTION, 200)
    )
    const deleteBatchSize = Math.max(
      1,
      Math.min(args.deleteBatchSize ?? MAX_RETENTION_DELETE_BATCH, MAX_RETENTION_DELETE_BATCH)
    )

    const events = await ctx.db
      .query('agentRunEvents')
      .withIndex('by_run_sequence', (q) => q.eq('runId', args.runId))
      .order('desc')
      .take(keepEvents + deleteBatchSize)
    const eventIdsToDelete = events.slice(keepEvents).map((event) => event._id)
    for (const eventId of eventIdsToDelete) {
      await deleteRunEventWithBody(ctx, eventId)
    }

    const checkpoints = await ctx.db
      .query('harnessRuntimeCheckpoints')
      .withIndex('by_run_saved', (q) => q.eq('runId', args.runId))
      .order('desc')
      .take(keepCheckpoints + deleteBatchSize)
    const checkpointIdsToDelete = checkpoints
      .slice(keepCheckpoints)
      .map((checkpoint) => checkpoint._id)
    for (const checkpointId of checkpointIdsToDelete) {
      await deleteRuntimeCheckpointWithBody(ctx, checkpointId)
    }

    return {
      deletedEvents: eventIdsToDelete.length,
      deletedCheckpoints: checkpointIdsToDelete.length,
      hasMore:
        eventIdsToDelete.length === deleteBatchSize ||
        checkpointIdsToDelete.length === deleteBatchSize,
    }
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
    const { run, userId } = await requireAgentRunOwner(ctx, args.runId)
    assertAgentRunTransition(run.status, 'completed')

    const completedAt = Date.now()
    await ctx.db.patch(args.runId, {
      status: 'completed',
      summary: args.summary,
      usage: args.usage,
      receipt: args.receipt,
      lastActivityAt: completedAt,
      completedAt,
    })

    await trackRunTerminalAnalytics(ctx, userId, run, {
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
    terminationReason: v.optional(TerminationReason),
  },
  handler: async (ctx, args) => {
    const { run, userId } = await requireAgentRunOwner(ctx, args.runId)
    assertAgentRunTransition(run.status, 'failed')

    const completedAt = Date.now()
    await ctx.db.patch(args.runId, {
      status: 'failed',
      error: args.error,
      receipt: args.receipt,
      terminationReason: args.terminationReason,
      lastActivityAt: completedAt,
      completedAt,
    })

    await trackRunTerminalAnalytics(ctx, userId, run)

    return args.runId
  },
})

export const stop = mutation({
  args: {
    runId: v.id('agentRuns'),
    receipt: v.optional(ExecutionReceipt),
    terminationReason: v.optional(TerminationReason),
  },
  handler: async (ctx, args) => {
    const { run, userId } = await requireAgentRunOwner(ctx, args.runId)
    assertAgentRunTransition(run.status, 'stopped')

    const completedAt = Date.now()
    await ctx.db.patch(args.runId, {
      status: 'stopped',
      receipt: args.receipt,
      terminationReason: args.terminationReason,
      lastActivityAt: completedAt,
      completedAt,
    })

    await trackRunTerminalAnalytics(ctx, userId, run)

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
    await requireProjectOwner(ctx, args.projectId)
    const limit = Math.max(1, Math.min(args.limit ?? 5, 50))
    return await ctx.db
      .query('agentRuns')
      .withIndex('by_project_started', (q) => q.eq('projectId', args.projectId))
      .order('desc')
      .take(limit)
  },
})

export const listRunTree = query({
  args: {
    runId: v.id('agentRuns'),
    childLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { run } = await requireAgentRunOwner(ctx, args.runId)
    const rootRunId = run.runKind === 'subagent' && run.rootRunId ? run.rootRunId : run._id
    const rootRun = rootRunId === run._id ? run : await ctx.db.get(rootRunId)
    if (!rootRun) {
      throw new Error('Root run not found')
    }
    const childLimit = Math.max(1, Math.min(args.childLimit ?? 100, MAX_RUN_TREE_CHILD_LIMIT))
    const children = await ctx.db
      .query('agentRuns')
      .withIndex('by_root_started', (q) => q.eq('rootRunId', rootRunId))
      .order('asc')
      .take(childLimit)

    return {
      root: toProjectRunSummary(rootRun),
      children: children.map(toProjectRunSummary),
    }
  },
})

export const listRecentSummariesByProject = query({
  args: {
    projectId: v.id('projects'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    const limit = Math.max(1, Math.min(args.limit ?? 12, 40))
    const runs = await ctx.db
      .query('agentRuns')
      .withIndex('by_project_started', (q) => q.eq('projectId', args.projectId))
      .order('desc')
      .take(limit)

    return runs.map(toProjectRunSummary)
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

    return await Promise.all(events.reverse().map((event) => hydrateRunEventBody(ctx, event)))
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
    const summary = summarizeRuntimeCheckpoint(args.checkpoint)

    const latestRows = args.runId
      ? await ctx.db
          .query('harnessRuntimeCheckpoints')
          .withIndex('by_run_session_saved', (q) =>
            q.eq('runId', args.runId).eq('sessionID', envelope.sessionID)
          )
          .order('desc')
          .take(1)
      : await ctx.db
          .query('harnessRuntimeCheckpoints')
          .withIndex('by_chat_session_saved', (q) =>
            q.eq('chatId', chatId).eq('sessionID', envelope.sessionID)
          )
          .order('desc')
          .take(1)

    const latest = latestRows[0]
    if (latest && latest.reason === envelope.reason) {
      const latestHash =
        latest.checkpointHash ?? stableHash((await loadRuntimeCheckpointBody(ctx, latest)) ?? null)
      if (latestHash === summary.checkpointHash) {
        return latest._id
      }
    }

    const checkpointId = await ctx.db.insert('harnessRuntimeCheckpoints', {
      projectId,
      chatId,
      runId: args.runId,
      sessionID: envelope.sessionID,
      version: envelope.version,
      agentName: envelope.agentName,
      reason: envelope.reason,
      savedAt: envelope.savedAt,
      checkpointHash: summary.checkpointHash,
      messageCount: summary.messageCount,
      step: summary.step,
      inputTokens: summary.inputTokens,
      outputTokens: summary.outputTokens,
      reasoningTokens: summary.reasoningTokens,
      hasBody: true,
    })

    await ctx.db.insert('harnessRuntimeCheckpointBodies', {
      checkpointId,
      projectId,
      chatId,
      runId: args.runId,
      sessionID: envelope.sessionID,
      checkpoint: args.checkpoint,
      checkpointHash: summary.checkpointHash,
      createdAt: envelope.savedAt,
    })

    const retainedRows = args.runId
      ? await ctx.db
          .query('harnessRuntimeCheckpoints')
          .withIndex('by_run_session_saved', (q) =>
            q.eq('runId', args.runId).eq('sessionID', envelope.sessionID)
          )
          .order('desc')
          .take(DEFAULT_HOT_CHECKPOINT_RETENTION + 25)
      : await ctx.db
          .query('harnessRuntimeCheckpoints')
          .withIndex('by_chat_session_saved', (q) =>
            q.eq('chatId', chatId).eq('sessionID', envelope.sessionID)
          )
          .order('desc')
          .take(DEFAULT_HOT_CHECKPOINT_RETENTION + 25)
    for (const stale of retainedRows.slice(DEFAULT_HOT_CHECKPOINT_RETENTION)) {
      await deleteRuntimeCheckpointWithBody(ctx, stale._id)
    }

    return checkpointId
  },
})

export const backfillRuntimeCheckpointBodies = internalMutation({
  args: {
    runId: v.optional(v.id('agentRuns')),
    chatId: v.optional(v.id('chats')),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    if (args.runId && args.chatId) {
      throw new Error('Provide runId or chatId, not both')
    }
    if (!args.runId && !args.chatId) {
      throw new Error('runId or chatId is required to backfill runtime checkpoint bodies')
    }

    const page = args.runId
      ? await (async () => {
          const runId = args.runId as Id<'agentRuns'>
          return await ctx.db
            .query('harnessRuntimeCheckpoints')
            .withIndex('by_run_saved', (q) => q.eq('runId', runId))
            .order('asc')
            .paginate({
              ...args.paginationOpts,
              numItems: Math.max(1, Math.min(args.paginationOpts.numItems, 200)),
              maximumRowsRead: 200,
            })
        })()
      : await (async () => {
          const chatId = args.chatId as Id<'chats'>
          return await ctx.db
            .query('harnessRuntimeCheckpoints')
            .withIndex('by_chat_saved', (q) => q.eq('chatId', chatId))
            .order('asc')
            .paginate({
              ...args.paginationOpts,
              numItems: Math.max(1, Math.min(args.paginationOpts.numItems, 200)),
              maximumRowsRead: 200,
            })
        })()

    let written = 0
    let skipped = 0
    let patched = 0

    for (const checkpoint of page.page) {
      const existingBody = await ctx.db
        .query('harnessRuntimeCheckpointBodies')
        .withIndex('by_checkpoint', (q) => q.eq('checkpointId', checkpoint._id))
        .first()
      const inlinePayload = checkpoint.checkpoint
      const payload = inlinePayload ?? existingBody?.checkpoint

      if (inlinePayload && !existingBody) {
        const summary = summarizeRuntimeCheckpoint(inlinePayload)
        await ctx.db.insert('harnessRuntimeCheckpointBodies', {
          checkpointId: checkpoint._id,
          projectId: checkpoint.projectId,
          chatId: checkpoint.chatId,
          runId: checkpoint.runId,
          sessionID: checkpoint.sessionID,
          checkpoint: inlinePayload,
          checkpointHash: summary.checkpointHash,
          createdAt: checkpoint.savedAt,
        })
        written += 1
      } else {
        skipped += 1
      }

      const patch: Partial<Omit<Doc<'harnessRuntimeCheckpoints'>, '_id' | '_creationTime'>> = {}
      if (payload) {
        const summary = summarizeRuntimeCheckpoint(payload)
        if (checkpoint.checkpointHash !== summary.checkpointHash) {
          patch.checkpointHash = summary.checkpointHash
        }
        if (checkpoint.messageCount !== summary.messageCount)
          patch.messageCount = summary.messageCount
        if (checkpoint.step !== summary.step) patch.step = summary.step
        if (checkpoint.inputTokens !== summary.inputTokens) patch.inputTokens = summary.inputTokens
        if (checkpoint.outputTokens !== summary.outputTokens)
          patch.outputTokens = summary.outputTokens
        if (checkpoint.reasoningTokens !== summary.reasoningTokens) {
          patch.reasoningTokens = summary.reasoningTokens
        }
      }
      const hasBody = Boolean(existingBody || inlinePayload)
      if (checkpoint.hasBody !== hasBody) patch.hasBody = hasBody

      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(checkpoint._id, patch)
        patched += 1
      }
    }

    return {
      processed: page.page.length,
      written,
      skipped,
      patched,
      isDone: page.isDone,
      continueCursor: page.continueCursor,
    }
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

      return rows[0] ? (((await loadRuntimeCheckpointBody(ctx, rows[0])) as unknown) ?? null) : null
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

      return rows[0] ? (((await loadRuntimeCheckpointBody(ctx, rows[0])) as unknown) ?? null) : null
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

      return rows[0] ? (((await loadRuntimeCheckpointBody(ctx, rows[0])) as unknown) ?? null) : null
    }

    throw new Error('runId, chatId, or projectId is required to load a runtime checkpoint')
  },
})

/**
 * @deprecated Legacy compatibility query. Returns full runtime checkpoint payloads,
 * which are cold recovery data. Keep off hot UI paths; use
 * listRuntimeCheckpointSummaries for UI and getLatestRuntimeCheckpoint only for
 * explicit restore flows.
 */
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
      const checkpoints = await ctx.db
        .query('harnessRuntimeCheckpoints')
        .withIndex('by_run_saved', (q) => q.eq('runId', args.runId))
        .order('desc')
        .take(limit)

      return await Promise.all(
        checkpoints.map(async (checkpoint) => ({
          ...checkpoint,
          checkpoint: await loadRuntimeCheckpointBody(ctx, checkpoint),
        }))
      )
    }

    if (args.chatId) {
      const chatId = args.chatId
      await requireChatOwner(ctx, args.chatId)
      const checkpoints = await ctx.db
        .query('harnessRuntimeCheckpoints')
        .withIndex('by_chat_saved', (q) => q.eq('chatId', chatId))
        .order('desc')
        .take(limit)

      return await Promise.all(
        checkpoints.map(async (checkpoint) => ({
          ...checkpoint,
          checkpoint: await loadRuntimeCheckpointBody(ctx, checkpoint),
        }))
      )
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
