/**
 * Specifications Convex Functions
 *
 * CRUD operations for the SpecNative formal specifications system.
 * Provides queries and mutations for managing specification lifecycle.
 *
 * @module convex/specifications
 */

import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import type { Doc } from './_generated/dataModel'

/**
 * SpecTier validator
 */
const SpecTierValidator = v.union(v.literal('instant'), v.literal('ambient'), v.literal('explicit'))

/**
 * SpecStatus validator
 */
const SpecStatusValidator = v.union(
  v.literal('draft'),
  v.literal('validated'),
  v.literal('approved'),
  v.literal('executing'),
  v.literal('verified'),
  v.literal('drifted'),
  v.literal('failed'),
  v.literal('archived')
)

/**
 * Constraint validator
 */
const ConstraintValidator = v.union(
  v.object({
    type: v.literal('structural'),
    rule: v.string(),
    target: v.string(),
  }),
  v.object({
    type: v.literal('behavioral'),
    rule: v.string(),
    assertion: v.string(),
  }),
  v.object({
    type: v.literal('performance'),
    metric: v.string(),
    threshold: v.number(),
    unit: v.string(),
  }),
  v.object({
    type: v.literal('compatibility'),
    requirement: v.string(),
    scope: v.string(),
  }),
  v.object({
    type: v.literal('security'),
    requirement: v.string(),
    standard: v.optional(v.string()),
  })
)

/**
 * AcceptanceCriterion validator
 */
const AcceptanceCriterionValidator = v.object({
  id: v.string(),
  trigger: v.string(),
  behavior: v.string(),
  verificationMethod: v.union(v.literal('automated'), v.literal('llm-judge'), v.literal('manual')),
  status: v.union(
    v.literal('pending'),
    v.literal('passed'),
    v.literal('failed'),
    v.literal('skipped')
  ),
})

/**
 * SpecStep validator
 */
const SpecStepValidator = v.object({
  id: v.string(),
  description: v.string(),
  tools: v.array(v.string()),
  targetFiles: v.array(v.string()),
  status: v.union(
    v.literal('pending'),
    v.literal('active'),
    v.literal('completed'),
    v.literal('failed')
  ),
  result: v.optional(v.string()),
})

/**
 * FileDependency validator
 */
const FileDependencyValidator = v.object({
  path: v.string(),
  access: v.union(v.literal('read'), v.literal('write'), v.literal('create'), v.literal('delete')),
  reason: v.string(),
})

/**
 * Risk validator
 */
const RiskValidator = v.object({
  description: v.string(),
  severity: v.union(v.literal('low'), v.literal('medium'), v.literal('high')),
  mitigation: v.string(),
})

/**
 * Condition validator
 */
const ConditionValidator = v.object({
  description: v.string(),
  check: v.string(),
  type: v.union(
    v.literal('file-exists'),
    v.literal('file-contains'),
    v.literal('command-passes'),
    v.literal('llm-assert')
  ),
})

/**
 * Invariant validator
 */
const InvariantValidator = v.object({
  description: v.string(),
  scope: v.string(),
  rule: v.string(),
})

/**
 * VerificationResult validator
 */
const VerificationResultValidator = v.object({
  criterionId: v.string(),
  passed: v.boolean(),
  message: v.optional(v.string()),
  details: v.optional(v.record(v.string(), v.any())),
})

/**
 * Create a new specification
 */
export const create = mutation({
  args: {
    projectId: v.id('projects'),
    chatId: v.id('chats'),
    runId: v.optional(v.id('agentRuns')),
    version: v.number(),
    tier: SpecTierValidator,
    status: SpecStatusValidator,
    intent: v.object({
      goal: v.string(),
      rawMessage: v.string(),
      constraints: v.array(ConstraintValidator),
      acceptanceCriteria: v.array(AcceptanceCriterionValidator),
    }),
    plan: v.object({
      steps: v.array(SpecStepValidator),
      dependencies: v.array(FileDependencyValidator),
      risks: v.array(RiskValidator),
      estimatedTools: v.array(v.string()),
    }),
    validation: v.object({
      preConditions: v.array(ConditionValidator),
      postConditions: v.array(ConditionValidator),
      invariants: v.array(InvariantValidator),
    }),
    provenance: v.object({
      model: v.string(),
      promptHash: v.string(),
      timestamp: v.number(),
      parentSpecId: v.optional(v.string()),
    }),
    verificationResults: v.optional(v.array(VerificationResultValidator)),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    const specId = await ctx.db.insert('specifications', {
      ...args,
      createdAt: now,
      updatedAt: now,
    })

    return specId
  },
})

/**
 * Get a specification by ID
 */
export const get = query({
  args: {
    specId: v.id('specifications'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.specId)
  },
})

/**
 * Update a specification
 */
export const update = mutation({
  args: {
    specId: v.id('specifications'),
    updates: v.object({
      status: v.optional(SpecStatusValidator),
      tier: v.optional(SpecTierValidator),
      runId: v.optional(v.id('agentRuns')),
      intent: v.optional(
        v.object({
          goal: v.string(),
          rawMessage: v.string(),
          constraints: v.array(ConstraintValidator),
          acceptanceCriteria: v.array(AcceptanceCriterionValidator),
        })
      ),
      plan: v.optional(
        v.object({
          steps: v.array(SpecStepValidator),
          dependencies: v.array(FileDependencyValidator),
          risks: v.array(RiskValidator),
          estimatedTools: v.array(v.string()),
        })
      ),
      validation: v.optional(
        v.object({
          preConditions: v.array(ConditionValidator),
          postConditions: v.array(ConditionValidator),
          invariants: v.array(InvariantValidator),
        })
      ),
      provenance: v.optional(
        v.object({
          model: v.string(),
          promptHash: v.string(),
          timestamp: v.number(),
          parentSpecId: v.optional(v.string()),
        })
      ),
      verificationResults: v.optional(v.array(VerificationResultValidator)),
    }),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.specId)
    if (!existing) {
      throw new Error(`Specification not found: ${args.specId}`)
    }

    await ctx.db.patch(args.specId, {
      ...args.updates,
      updatedAt: Date.now(),
    })

    return await ctx.db.get(args.specId)
  },
})

/**
 * List all specifications (paginated)
 */
export const list = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100

    const specs = await ctx.db.query('specifications').order('desc').take(limit)

    return {
      specs,
      hasMore: specs.length === limit,
      nextCursor: specs.length > 0 ? specs[specs.length - 1]._id : null,
    }
  },
})

/**
 * List specifications by project
 */
export const listByProject = query({
  args: {
    projectId: v.id('projects'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100

    return await ctx.db
      .query('specifications')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .order('desc')
      .take(limit)
  },
})

/**
 * List specifications by chat
 */
export const listByChat = query({
  args: {
    chatId: v.id('chats'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100

    return await ctx.db
      .query('specifications')
      .withIndex('by_chat', (q) => q.eq('chatId', args.chatId))
      .order('desc')
      .take(limit)
  },
})

/**
 * List specifications by status
 */
export const listByStatus = query({
  args: {
    projectId: v.id('projects'),
    status: SpecStatusValidator,
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100

    return await ctx.db
      .query('specifications')
      .withIndex('by_status', (q) => q.eq('projectId', args.projectId).eq('status', args.status))
      .order('desc')
      .take(limit)
  },
})

/**
 * List specifications by tier
 */
export const listByTier = query({
  args: {
    projectId: v.id('projects'),
    tier: SpecTierValidator,
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100

    return await ctx.db
      .query('specifications')
      .withIndex('by_tier', (q) => q.eq('projectId', args.projectId).eq('tier', args.tier))
      .order('desc')
      .take(limit)
  },
})

/**
 * Delete a specification
 */
export const remove = mutation({
  args: {
    specId: v.id('specifications'),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.specId)
    return { success: true }
  },
})

/**
 * Archive a specification (soft delete by status change)
 */
export const archive = mutation({
  args: {
    specId: v.id('specifications'),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.specId, {
      status: 'archived',
      updatedAt: Date.now(),
    })
    return { success: true }
  },
})

/**
 * Get the latest specification for a chat
 */
export const getLatestByChat = query({
  args: {
    chatId: v.id('chats'),
  },
  handler: async (ctx, args) => {
    const specs = await ctx.db
      .query('specifications')
      .withIndex('by_chat', (q) => q.eq('chatId', args.chatId))
      .order('desc')
      .take(1)

    return specs[0] ?? null
  },
})

/**
 * Create a new version of an existing specification
 * Archives the old version and creates a new one with incremented version number
 */
export const createVersion = mutation({
  args: {
    parentSpecId: v.id('specifications'),
    updates: v.optional(
      v.object({
        intent: v.optional(
          v.object({
            goal: v.string(),
            rawMessage: v.string(),
            constraints: v.array(ConstraintValidator),
            acceptanceCriteria: v.array(AcceptanceCriterionValidator),
          })
        ),
        plan: v.optional(
          v.object({
            steps: v.array(SpecStepValidator),
            dependencies: v.array(FileDependencyValidator),
            risks: v.array(RiskValidator),
            estimatedTools: v.array(v.string()),
          })
        ),
        validation: v.optional(
          v.object({
            preConditions: v.array(ConditionValidator),
            postConditions: v.array(ConditionValidator),
            invariants: v.array(InvariantValidator),
          })
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    const parentSpec = await ctx.db.get(args.parentSpecId)
    if (!parentSpec) {
      throw new Error(`Parent specification not found: ${args.parentSpecId}`)
    }

    const now = Date.now()

    // Archive the parent spec
    await ctx.db.patch(args.parentSpecId, {
      status: 'archived',
      updatedAt: now,
    })

    // Create new version
    const newSpecId = await ctx.db.insert('specifications', {
      projectId: parentSpec.projectId,
      chatId: parentSpec.chatId,
      runId: parentSpec.runId,
      version: parentSpec.version + 1,
      tier: parentSpec.tier,
      status: 'draft',
      intent: args.updates?.intent ?? parentSpec.intent,
      plan: args.updates?.plan ?? parentSpec.plan,
      validation: args.updates?.validation ?? parentSpec.validation,
      provenance: {
        model: parentSpec.provenance.model,
        promptHash: parentSpec.provenance.promptHash,
        timestamp: now,
        parentSpecId: parentSpec._id,
      },
      verificationResults: undefined,
      createdAt: now,
      updatedAt: now,
    })

    return {
      newSpecId,
      parentSpecId: args.parentSpecId,
      version: parentSpec.version + 1,
    }
  },
})

/**
 * Get the version chain for a specification
 * Returns all versions from root to the given spec
 */
export const getVersionChain = query({
  args: {
    specId: v.id('specifications'),
  },
  handler: async (ctx, args) => {
    const chain: Array<{
      _id: string
      version: number
      status: string
      createdAt: number
      parentSpecId?: string
    }> = []
    const visited = new Set<string>()

    // First, walk backwards to find root
    let currentId: string | null = args.specId
    const path: string[] = []

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId)
      path.push(currentId)

      const currentSpec: Doc<'specifications'> | null = await ctx.db.get(
        currentId as Id<'specifications'>
      )
      if (!currentSpec) break

      currentId = currentSpec.provenance.parentSpecId ?? null
    }

    // Now walk forward from root to build chain
    visited.clear()
    for (let i = path.length - 1; i >= 0; i--) {
      const id = path[i]
      if (visited.has(id)) continue
      visited.add(id)

      const chainSpec: Doc<'specifications'> | null = await ctx.db.get(id as Id<'specifications'>)
      if (!chainSpec) continue

      chain.push({
        _id: chainSpec._id,
        version: chainSpec.version,
        status: chainSpec.status,
        createdAt: chainSpec.createdAt,
        parentSpecId: chainSpec.provenance.parentSpecId,
      })
    }

    return chain
  },
})

/**
 * List all versions of a specification by root spec ID
 * Finds the root and returns all descendants
 */
export const listVersions = query({
  args: {
    rootSpecId: v.id('specifications'),
  },
  handler: async (ctx, args) => {
    // First get the root spec to find its chatId
    const rootSpec = await ctx.db.get(args.rootSpecId)
    if (!rootSpec) {
      return []
    }

    // Get all specs for this chat
    const chain = await ctx.db
      .query('specifications')
      .withIndex('by_chat', (q) => q.eq('chatId', rootSpec.chatId))
      .order('desc')
      .take(100)

    // Build a map of specs by parent
    const specsByParent = new Map<string, Doc<'specifications'>[]>()
    const allSpecs = new Map<string, Doc<'specifications'>>()

    for (const spec of chain) {
      allSpecs.set(spec._id as string, spec)
      const parentId = spec.provenance.parentSpecId
      if (parentId) {
        const siblings = specsByParent.get(parentId) || []
        siblings.push(spec)
        specsByParent.set(parentId, siblings)
      }
    }

    // Find root (the one that is either the given spec or has no parent in our set)
    let rootId: string = args.rootSpecId as string
    let current = allSpecs.get(rootId)

    while (current?.provenance.parentSpecId && allSpecs.has(current.provenance.parentSpecId)) {
      rootId = current.provenance.parentSpecId as string
      current = allSpecs.get(rootId)
    }

    // Collect all versions from root
    const versions: Array<{
      _id: string
      version: number
      status: string
      tier: string
      createdAt: number
      parentSpecId?: string
      intentGoal: string
    }> = []
    const toProcess: string[] = [rootId as string]
    const processed = new Set<string>()

    while (toProcess.length > 0) {
      const id = toProcess.shift()!
      if (processed.has(id)) continue
      processed.add(id)

      const spec = allSpecs.get(id)
      if (!spec) continue

      versions.push({
        _id: spec._id as string,
        version: spec.version,
        status: spec.status,
        tier: spec.tier,
        createdAt: spec.createdAt,
        parentSpecId: spec.provenance.parentSpecId,
        intentGoal: spec.intent.goal,
      })

      // Add children to process
      const children = specsByParent.get(id) || []
      for (const child of children) {
        if (!processed.has(child._id as string)) {
          toProcess.push(child._id as string)
        }
      }
    }

    // Sort by version
    return versions.sort((a, b) => a.version - b.version)
  },
})

/**
 * Mark a specification as drifted
 */
export const markDrifted = mutation({
  args: {
    specId: v.id('specifications'),
    driftDetails: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.specId)
    if (!existing) {
      throw new Error(`Specification not found: ${args.specId}`)
    }

    await ctx.db.patch(args.specId, {
      status: 'drifted',
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})

/**
 * Get specifications by run ID
 */
export const listByRun = query({
  args: {
    runId: v.id('agentRuns'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100

    return await ctx.db
      .query('specifications')
      .withIndex('by_run', (q) => q.eq('runId', args.runId))
      .order('desc')
      .take(limit)
  },
})
