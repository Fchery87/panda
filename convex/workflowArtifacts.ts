import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { WorkflowArtifactKind, WorkflowArtifactStatus, WorkflowStage } from './schema'
import { requireChatOwner, requireProjectOwner } from './lib/authz'

export const listByChat = query({
  args: { chatId: v.id('chats') },
  handler: async (ctx, args) => {
    await requireChatOwner(ctx, args.chatId)
    return await ctx.db
      .query('workflowArtifacts')
      .withIndex('by_chat_created', (q) => q.eq('chatId', args.chatId))
      .order('desc')
      .take(200)
  },
})

export const listByProject = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    return await ctx.db
      .query('workflowArtifacts')
      .withIndex('by_project_created', (q) => q.eq('projectId', args.projectId))
      .order('desc')
      .take(200)
  },
})

export const create = mutation({
  args: {
    projectId: v.id('projects'),
    chatId: v.id('chats'),
    runId: v.optional(v.id('agentRuns')),
    parentRunId: v.optional(v.id('agentRuns')),
    kind: WorkflowArtifactKind,
    title: v.string(),
    content: v.string(),
    status: WorkflowArtifactStatus,
    sourceStage: WorkflowStage,
    receiptIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    await requireChatOwner(ctx, args.chatId)
    const now = Date.now()
    const artifactId = await ctx.db.insert('workflowArtifacts', {
      ...args,
      title: args.title.trim(),
      content: args.content.trim(),
      createdAt: now,
      updatedAt: now,
    })

    const activeChains = await ctx.db
      .query('workflowChains')
      .withIndex('by_status', (q) => q.eq('chatId', args.chatId).eq('status', 'running'))
      .take(20)

    for (const chain of activeChains) {
      let advanced = false
      const steps = chain.steps.map((step) => {
        if (advanced) return step
        if (step.stage !== args.sourceStage) return step
        if (step.status !== 'pending' && step.status !== 'running') return step
        advanced = true
        return {
          ...step,
          status: 'completed' as const,
          artifactId,
          startedAt: step.startedAt ?? now,
          completedAt: now,
        }
      })
      if (!advanced) continue
      const next = steps.find((step) => step.status === 'pending')
      const allDone = steps.every(
        (step) => step.status === 'completed' || step.status === 'skipped'
      )
      await ctx.db.patch(chain._id, {
        steps,
        currentStepId: next?.id,
        status: allDone ? 'completed' : chain.status,
        updatedAt: now,
        ...(allDone ? { completedAt: now } : {}),
      })
    }

    return artifactId
  },
})

export const updateStatus = mutation({
  args: {
    id: v.id('workflowArtifacts'),
    status: WorkflowArtifactStatus,
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id)
    if (!existing) throw new Error('Workflow artifact not found')
    await requireChatOwner(ctx, existing.chatId)
    await ctx.db.patch(args.id, { status: args.status, updatedAt: Date.now() })
    return args.id
  },
})

export const supersedeForRun = mutation({
  args: {
    runId: v.id('agentRuns'),
    kind: WorkflowArtifactKind,
  },
  handler: async (ctx, args) => {
    const artifacts = await ctx.db
      .query('workflowArtifacts')
      .withIndex('by_run', (q) => q.eq('runId', args.runId))
      .collect()

    let count = 0
    for (const artifact of artifacts) {
      if (artifact.kind !== args.kind || artifact.status === 'superseded') continue
      await requireChatOwner(ctx, artifact.chatId)
      await ctx.db.patch(artifact._id, { status: 'superseded', updatedAt: Date.now() })
      count += 1
    }
    return { count }
  },
})
