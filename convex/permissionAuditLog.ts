import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import {
  HarnessCapability,
  HarnessCommandFamily,
  HarnessPermissionDecision,
  HarnessPolicyRuleSource,
  PermissionAuditTarget,
} from './schema'
import { requireAgentRunOwner, requireChatOwner, requireProjectOwner } from './lib/authz'

const MAX_AUDIT_LIMIT = 500

const HarnessPermissionDecisionArgs = {
  sessionID: v.string(),
  runId: v.optional(v.id('agentRuns')),
  chatId: v.optional(v.id('chats')),
  projectId: v.optional(v.id('projects')),
  agentId: v.string(),
  subagentChain: v.optional(v.array(v.string())),
  toolName: v.string(),
  capability: HarnessCapability,
  commandFamily: v.optional(HarnessCommandFamily),
  decision: HarnessPermissionDecision,
  ruleId: v.optional(v.string()),
  ruleSource: v.optional(HarnessPolicyRuleSource),
  reason: v.optional(v.string()),
  target: PermissionAuditTarget,
  unattended: v.boolean(),
  createdAt: v.optional(v.number()),
  metadata: v.optional(v.any()),
}

function clampLimit(limit: number | undefined): number {
  return Math.max(1, Math.min(limit ?? 100, MAX_AUDIT_LIMIT))
}

export const log = mutation({
  args: {
    sessionID: v.string(),
    tool: v.string(),
    pattern: v.string(),
    decision: v.string(),
    reason: v.optional(v.string()),
    metadata: v.optional(v.any()),
    timestamp: v.number(),
    projectId: v.optional(v.id('projects')),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('permissionAuditLog', args)
  },
})

export const logHarnessDecision = mutation({
  args: HarnessPermissionDecisionArgs,
  handler: async (ctx, args) => {
    const now = args.createdAt ?? Date.now()
    let projectId = args.projectId
    let chatId = args.chatId
    let userId = undefined

    if (args.runId) {
      const access = await requireAgentRunOwner(ctx, args.runId)
      projectId = access.run.projectId
      chatId = access.run.chatId
      userId = access.userId
    } else if (args.chatId) {
      const access = await requireChatOwner(ctx, args.chatId)
      projectId = access.project._id
      chatId = access.chat._id
      userId = access.userId
    } else if (args.projectId) {
      const access = await requireProjectOwner(ctx, args.projectId)
      projectId = access.project._id
      userId = access.userId
    } else {
      throw new Error('runId, chatId, or projectId is required to log a harness decision')
    }

    return await ctx.db.insert('permissionAuditLog', {
      sessionID: args.sessionID,
      tool: args.toolName,
      pattern: args.target.value,
      decision: args.decision,
      reason: args.reason,
      metadata: args.metadata,
      timestamp: now,
      projectId,
      version: 1,
      runId: args.runId,
      chatId,
      userId,
      agentId: args.agentId,
      subagentChain: args.subagentChain,
      capability: args.capability,
      commandFamily: args.commandFamily,
      ruleId: args.ruleId,
      ruleSource: args.ruleSource,
      target: args.target,
      unattended: args.unattended,
      createdAt: now,
    })
  },
})

export const listBySession = query({
  args: {
    sessionID: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = clampLimit(args.limit)
    return await ctx.db
      .query('permissionAuditLog')
      .withIndex('by_session', (q) => q.eq('sessionID', args.sessionID))
      .order('desc')
      .take(limit)
  },
})

export const listByProject = query({
  args: {
    projectId: v.id('projects'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    const limit = clampLimit(args.limit)
    return await ctx.db
      .query('permissionAuditLog')
      .withIndex('by_project_timestamp', (q) => q.eq('projectId', args.projectId))
      .order('desc')
      .take(limit)
  },
})

export const listByRun = query({
  args: {
    runId: v.id('agentRuns'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAgentRunOwner(ctx, args.runId)
    const limit = clampLimit(args.limit)
    return await ctx.db
      .query('permissionAuditLog')
      .withIndex('by_run_created', (q) => q.eq('runId', args.runId))
      .order('desc')
      .take(limit)
  },
})

export const listHarnessDecisionsByProject = query({
  args: {
    projectId: v.id('projects'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    const limit = clampLimit(args.limit)
    return await ctx.db
      .query('permissionAuditLog')
      .withIndex('by_project_created', (q) => q.eq('projectId', args.projectId))
      .order('desc')
      .take(limit)
  },
})
