import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { WorkflowChainStatus, WorkflowChainStepState } from './schema'
import { requireChatOwner, requireProjectOwner } from './lib/authz'

export const listByChat = query({
  args: { chatId: v.id('chats') },
  handler: async (ctx, args) => {
    await requireChatOwner(ctx, args.chatId)
    return await ctx.db
      .query('workflowChains')
      .withIndex('by_chat_created', (q) => q.eq('chatId', args.chatId))
      .order('desc')
      .take(100)
  },
})

export const create = mutation({
  args: {
    projectId: v.id('projects'),
    chatId: v.id('chats'),
    chainId: v.string(),
    label: v.string(),
    userGoal: v.string(),
    currentStepId: v.optional(v.string()),
    steps: v.array(WorkflowChainStepState),
  },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    await requireChatOwner(ctx, args.chatId)
    const now = Date.now()
    return await ctx.db.insert('workflowChains', {
      ...args,
      status: 'running',
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const updateStep = mutation({
  args: {
    id: v.id('workflowChains'),
    stepId: v.string(),
    status: WorkflowChainStepState.fields.status,
    artifactId: v.optional(v.id('workflowArtifacts')),
    runId: v.optional(v.id('agentRuns')),
  },
  handler: async (ctx, args) => {
    const chain = await ctx.db.get(args.id)
    if (!chain) throw new Error('Workflow chain not found')
    await requireChatOwner(ctx, chain.chatId)
    const now = Date.now()
    const steps = chain.steps.map((step) =>
      step.id === args.stepId
        ? {
            ...step,
            status: args.status,
            ...(args.artifactId ? { artifactId: args.artifactId } : {}),
            ...(args.runId ? { runId: args.runId } : {}),
            ...(args.status === 'running' ? { startedAt: step.startedAt ?? now } : {}),
            ...(args.status === 'completed' || args.status === 'failed'
              ? { completedAt: now }
              : {}),
          }
        : step
    )
    const next = steps.find((step) => step.status === 'pending')
    const allDone = steps.every((step) => step.status === 'completed' || step.status === 'skipped')
    await ctx.db.patch(args.id, {
      steps,
      currentStepId: next?.id,
      status: allDone ? 'completed' : args.status === 'failed' ? 'failed' : chain.status,
      updatedAt: now,
      ...(allDone ? { completedAt: now } : {}),
    })
    return args.id
  },
})

export const updateStatus = mutation({
  args: {
    id: v.id('workflowChains'),
    status: WorkflowChainStatus,
  },
  handler: async (ctx, args) => {
    const chain = await ctx.db.get(args.id)
    if (!chain) throw new Error('Workflow chain not found')
    await requireChatOwner(ctx, chain.chatId)
    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
      ...(args.status === 'completed' ? { completedAt: Date.now() } : {}),
    })
    return args.id
  },
})
