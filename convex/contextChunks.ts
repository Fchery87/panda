import { action, mutation, query } from './_generated/server'
import { api } from './_generated/api'
import type { MutationCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { v } from 'convex/values'
import { ContextChunkSourceType } from './schema'
import { requireProjectOwner } from './lib/authz'
import { resolveContent } from './lib/fileContentStore'

const MAX_CHUNK_CHARS = 2_400
const OVERLAP_CHARS = 240

const ContextChunkInput = v.object({
  sourceType: ContextChunkSourceType,
  sourceId: v.string(),
  chunkIndex: v.number(),
  content: v.string(),
  contentHash: v.string(),
  tokenCount: v.optional(v.number()),
  path: v.optional(v.string()),
  title: v.optional(v.string()),
  startLine: v.optional(v.number()),
  endLine: v.optional(v.number()),
  embedding: v.optional(v.array(v.float64())),
  embeddingModel: v.optional(v.string()),
})

type ContextChunkInputValue = typeof ContextChunkInput.type

type SourceToChunk = {
  sourceType: ContextChunkInputValue['sourceType']
  sourceId: string
  content?: string | null
  path?: string
  title?: string
  chatId?: string
  runId?: string
}

function normalizeContent(content: string): string {
  return content
    .replace(/\r\n/g, '\n')
    .replace(/[\t ]+$/gm, '')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()
}

function hashContent(content: string): string {
  let hash = 2166136261
  for (let index = 0; index < content.length; index += 1) {
    hash ^= content.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

function estimateTokens(content: string): number {
  const trimmed = content.trim()
  return trimmed ? Math.max(1, Math.ceil(trimmed.length / 4)) : 0
}

function chunkSource(source: SourceToChunk): ContextChunkInputValue[] {
  const content = normalizeContent(source.content ?? '')
  if (!content) return []

  const lines = content.split('\n')
  const chunks: ContextChunkInputValue[] = []
  let startLine = 0
  let chunkIndex = 0

  while (startLine < lines.length) {
    let endLine = startLine
    let charCount = 0
    while (endLine < lines.length) {
      const nextLength = lines[endLine].length + 1
      if (charCount > 0 && charCount + nextLength > MAX_CHUNK_CHARS) break
      charCount += nextLength
      endLine += 1
    }
    if (endLine === startLine) endLine += 1

    const chunkContent = lines.slice(startLine, endLine).join('\n').trim()
    if (chunkContent) {
      chunks.push({
        sourceType: source.sourceType,
        sourceId: source.sourceId,
        chunkIndex,
        content: chunkContent,
        contentHash: hashContent(chunkContent),
        tokenCount: estimateTokens(chunkContent),
        path: source.path,
        title: source.title,
        startLine: startLine + 1,
        endLine,
      })
      chunkIndex += 1
    }

    if (endLine >= lines.length) break
    let overlapLine = endLine
    let overlapCount = 0
    while (overlapLine > startLine && overlapCount < OVERLAP_CHARS) {
      overlapLine -= 1
      overlapCount += lines[overlapLine].length + 1
    }
    startLine = Math.max(overlapLine, startLine + 1)
  }

  return chunks
}

async function upsertChunkBatch(
  ctx: MutationCtx,
  args: {
    projectId: Id<'projects'>
    chatId?: Id<'chats'>
    runId?: Id<'agentRuns'>
    chunks: ContextChunkInputValue[]
  }
): Promise<number> {
  const now = Date.now()
  let written = 0
  for (const chunk of args.chunks) {
    const existing = await ctx.db
      .query('contextChunks')
      .withIndex('by_source_chunk', (q) =>
        q
          .eq('projectId', args.projectId)
          .eq('sourceType', chunk.sourceType)
          .eq('sourceId', chunk.sourceId)
          .eq('chunkIndex', chunk.chunkIndex)
      )
      .unique()
    const patch = {
      projectId: args.projectId,
      chatId: args.chatId,
      runId: args.runId,
      ...chunk,
      updatedAt: now,
    }
    if (existing) {
      const unchanged =
        existing.contentHash === chunk.contentHash &&
        existing.content === chunk.content &&
        existing.tokenCount === chunk.tokenCount &&
        existing.path === chunk.path &&
        existing.title === chunk.title &&
        existing.startLine === chunk.startLine &&
        existing.endLine === chunk.endLine &&
        existing.chatId === args.chatId &&
        existing.runId === args.runId
      if (unchanged) continue
      await ctx.db.patch(existing._id, patch)
    } else {
      await ctx.db.insert('contextChunks', patch)
    }
    written += 1
  }
  return written
}

export const upsertMany = mutation({
  args: {
    projectId: v.id('projects'),
    chatId: v.optional(v.id('chats')),
    runId: v.optional(v.id('agentRuns')),
    chunks: v.array(ContextChunkInput),
  },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    return await upsertChunkBatch(ctx, args)
  },
})

export const indexProjectFiles = mutation({
  args: { projectId: v.id('projects'), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    const files = await ctx.db
      .query('files')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .take(Math.min(Math.max(args.limit ?? 500, 1), 2000))
    const chunks = []
    for (const file of files) {
      chunks.push(
        ...chunkSource({
          sourceType: 'file',
          sourceId: String(file._id),
          path: file.path,
          title: file.path.split('/').pop() ?? file.path,
          content: file.isBinary
            ? ''
            : await resolveContent(ctx, {
                legacyContent: file.content,
                contentRef: file.contentRef,
              }),
        })
      )
    }
    return await upsertChunkBatch(ctx, { projectId: args.projectId, chunks })
  },
})

export const indexRunOutput = mutation({
  args: {
    projectId: v.id('projects'),
    chatId: v.optional(v.id('chats')),
    runId: v.optional(v.id('agentRuns')),
    sourceId: v.string(),
    title: v.optional(v.string()),
    path: v.optional(v.string()),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    const chunks = chunkSource({
      sourceType: 'run_event',
      sourceId: args.sourceId,
      title: args.title ?? 'Command output',
      path: args.path,
      content: args.content,
    })
    const written = await upsertChunkBatch(ctx, {
      projectId: args.projectId,
      chatId: args.chatId,
      runId: args.runId,
      chunks,
    })
    return {
      sourceType: 'run_event' as const,
      sourceId: args.sourceId,
      chunksWritten: written,
    }
  },
})

export const indexSessionSummaries = mutation({
  args: { projectId: v.id('projects'), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    const summaries = await ctx.db
      .query('sessionSummaries')
      .withIndex('by_project_created', (q) => q.eq('projectId', args.projectId))
      .order('desc')
      .take(Math.min(Math.max(args.limit ?? 50, 1), 500))
    let written = 0
    for (const summary of summaries) {
      written += await upsertChunkBatch(ctx, {
        projectId: args.projectId,
        chatId: summary.chatId,
        chunks: chunkSource({
          sourceType: 'summary',
          sourceId: String(summary._id),
          title: 'Session summary',
          content: summary.summary,
        }),
      })
    }
    return written
  },
})

export const indexMessages = mutation({
  args: {
    projectId: v.id('projects'),
    chatId: v.optional(v.id('chats')),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    const chats = args.chatId
      ? [await ctx.db.get(args.chatId)].filter((chat) => chat && chat.projectId === args.projectId)
      : await ctx.db
          .query('chats')
          .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
          .order('desc')
          .take(10)
    let written = 0
    for (const chat of chats) {
      if (!chat || chat.projectId !== args.projectId) continue
      const messages = await ctx.db
        .query('messages')
        .withIndex('by_created', (q) => q.eq('chatId', chat._id))
        .order('desc')
        .take(Math.min(Math.max(args.limit ?? 25, 1), 100))
      for (const message of messages) {
        if (message.role !== 'user' && message.role !== 'assistant') continue
        written += await upsertChunkBatch(ctx, {
          projectId: args.projectId,
          chatId: message.chatId,
          chunks: chunkSource({
            sourceType: 'message',
            sourceId: String(message._id),
            title: `${message.role} message`,
            content: message.content,
          }),
        })
      }
    }
    return written
  },
})

export const indexPlanningSessionPlans = mutation({
  args: {
    projectId: v.id('projects'),
    chatId: v.optional(v.id('chats')),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    const chats = args.chatId
      ? [await ctx.db.get(args.chatId)].filter((chat) => chat && chat.projectId === args.projectId)
      : await ctx.db
          .query('chats')
          .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
          .order('desc')
          .take(10)
    let written = 0
    for (const chat of chats) {
      if (!chat || chat.projectId !== args.projectId) continue
      const sessions = await ctx.db
        .query('planningSessions')
        .withIndex('by_updated', (q) => q.eq('chatId', chat._id))
        .order('desc')
        .take(Math.min(Math.max(args.limit ?? 5, 1), 25))
      for (const session of sessions) {
        const plan = session.generatedPlan
        if (!plan) continue
        const sections = [...plan.sections]
          .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
          .map((section) => `## ${section.title}\n${section.content}`)
          .join('\n\n')
        const content = [
          `# ${plan.title}`,
          plan.summary,
          plan.markdown,
          sections,
          plan.acceptanceChecks.length
            ? `## Acceptance Checks\n${plan.acceptanceChecks.map((check) => `- ${check}`).join('\n')}`
            : null,
        ]
          .filter(Boolean)
          .join('\n\n')
        written += await upsertChunkBatch(ctx, {
          projectId: args.projectId,
          chatId: chat._id,
          chunks: chunkSource({
            sourceType: 'plan',
            sourceId: String(session._id),
            title: plan.title,
            content,
          }),
        })
      }
    }
    return written
  },
})

export const indexSpecifications = mutation({
  args: { projectId: v.id('projects'), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    const specs = await ctx.db
      .query('specifications')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .take(Math.min(Math.max(args.limit ?? 100, 1), 500))
    let written = 0
    for (const spec of specs) {
      const content = [
        `Status: ${spec.status}`,
        `Tier: ${spec.tier}`,
        `Goal: ${spec.intent.goal}`,
        `Request: ${spec.intent.rawMessage}`,
        spec.intent.acceptanceCriteria.length
          ? `Acceptance Criteria:\n${spec.intent.acceptanceCriteria.map((item) => `- ${JSON.stringify(item)}`).join('\n')}`
          : null,
        spec.plan.steps.length
          ? `Plan Steps:\n${spec.plan.steps.map((item) => `- ${JSON.stringify(item)}`).join('\n')}`
          : null,
        spec.plan.risks.length
          ? `Risks:\n${spec.plan.risks.map((item) => `- ${JSON.stringify(item)}`).join('\n')}`
          : null,
      ]
        .filter(Boolean)
        .join('\n\n')
      written += await upsertChunkBatch(ctx, {
        projectId: args.projectId,
        chatId: spec.chatId,
        runId: spec.runId,
        chunks: chunkSource({
          sourceType: 'spec',
          sourceId: String(spec._id),
          title: spec.intent.goal,
          content,
        }),
      })
    }
    return written
  },
})

export const rebuildProject = mutation({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    let deleted = 0
    while (true) {
      const chunks = await ctx.db
        .query('contextChunks')
        .withIndex('by_project_updated', (q) => q.eq('projectId', args.projectId))
        .take(500)
      if (chunks.length === 0) break
      for (const chunk of chunks) {
        await ctx.db.delete(chunk._id)
        deleted += 1
      }
    }

    const files = await ctx.db
      .query('files')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .take(2000)
    const fileChunks = []
    for (const file of files) {
      fileChunks.push(
        ...chunkSource({
          sourceType: 'file',
          sourceId: String(file._id),
          path: file.path,
          title: file.path.split('/').pop() ?? file.path,
          content: file.isBinary
            ? ''
            : await resolveContent(ctx, {
                legacyContent: file.content,
                contentRef: file.contentRef,
              }),
        })
      )
    }
    const fileChunksWritten = await upsertChunkBatch(ctx, {
      projectId: args.projectId,
      chunks: fileChunks,
    })

    const summaries = await ctx.db
      .query('sessionSummaries')
      .withIndex('by_project_created', (q) => q.eq('projectId', args.projectId))
      .order('desc')
      .take(100)
    let summaryChunksWritten = 0
    for (const summary of summaries) {
      summaryChunksWritten += await upsertChunkBatch(ctx, {
        projectId: args.projectId,
        chatId: summary.chatId,
        chunks: chunkSource({
          sourceType: 'summary',
          sourceId: String(summary._id),
          title: 'Session summary',
          content: summary.summary,
        }),
      })
    }

    const specs = await ctx.db
      .query('specifications')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .take(100)
    let specChunksWritten = 0
    for (const spec of specs) {
      specChunksWritten += await upsertChunkBatch(ctx, {
        projectId: args.projectId,
        chatId: spec.chatId,
        runId: spec.runId,
        chunks: chunkSource({
          sourceType: 'spec',
          sourceId: String(spec._id),
          title: spec.intent.goal,
          content: `${spec.intent.goal}\n\n${spec.intent.rawMessage}`,
        }),
      })
    }

    return { deleted, fileChunksWritten, summaryChunksWritten, specChunksWritten }
  },
})

export const stats = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    const chunks = await ctx.db
      .query('contextChunks')
      .withIndex('by_project_updated', (q) => q.eq('projectId', args.projectId))
      .take(2000)
    const bySourceType: Record<string, number> = {}
    let tokenCount = 0
    for (const chunk of chunks) {
      bySourceType[chunk.sourceType] = (bySourceType[chunk.sourceType] ?? 0) + 1
      tokenCount += chunk.tokenCount ?? 0
    }
    return { chunkCount: chunks.length, tokenCount, bySourceType }
  },
})

function buildFocusedSnippet(content: string, terms: string[], maxChars = 1_200): string {
  const normalized = content.trim()
  if (normalized.length <= maxChars) return normalized
  if (terms.length === 0) return `${normalized.slice(0, maxChars).trim()}\n…`

  const lower = normalized.toLowerCase()
  const matchIndex = terms
    .map((term) => lower.indexOf(term))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0]

  if (matchIndex === undefined) return `${normalized.slice(0, maxChars).trim()}\n…`

  const halfWindow = Math.floor(maxChars / 2)
  const windowStart = Math.max(0, matchIndex - halfWindow)
  const windowEnd = Math.min(normalized.length, windowStart + maxChars)
  const lineStart = normalized.lastIndexOf('\n', windowStart)
  const lineEnd = normalized.indexOf('\n', windowEnd)
  const start = lineStart >= 0 ? lineStart + 1 : windowStart
  const end = lineEnd >= 0 ? lineEnd : windowEnd
  const prefix = start > 0 ? '…\n' : ''
  const suffix = end < normalized.length ? '\n…' : ''
  return `${prefix}${normalized.slice(start, end).trim()}${suffix}`
}

function matchedTerms(content: string, terms: string[]): string[] {
  const lower = content.toLowerCase()
  return terms.filter((term) => lower.includes(term))
}

export const searchRunOutput = query({
  args: {
    projectId: v.id('projects'),
    sourceId: v.string(),
    query: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    const limit = Math.min(Math.max(args.limit ?? 8, 1), 25)
    const terms = (args.query ?? '').trim().toLowerCase().split(/\s+/).filter(Boolean).slice(0, 8)

    const chunks = await ctx.db
      .query('contextChunks')
      .withIndex('by_source', (q) =>
        q
          .eq('projectId', args.projectId)
          .eq('sourceType', 'run_event')
          .eq('sourceId', args.sourceId)
      )
      .take(200)

    const scored = chunks
      .map((chunk) => {
        const lower = chunk.content.toLowerCase()
        const score = terms.length
          ? terms.reduce((sum, term) => sum + (lower.includes(term) ? 1 : 0), 0)
          : 1
        return { chunk, score }
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.chunk.chunkIndex - b.chunk.chunkIndex)
      .slice(0, limit)

    return scored.map(({ chunk, score }) => {
      const matches = matchedTerms(chunk.content, terms)
      const content = buildFocusedSnippet(chunk.content, terms)
      return {
        chunkId: chunk._id,
        sourceType: chunk.sourceType,
        sourceId: chunk.sourceId,
        chunkIndex: chunk.chunkIndex,
        title: chunk.title,
        path: chunk.path,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        content,
        matchedTerms: matches,
        score,
        truncated: content !== chunk.content.trim(),
      }
    })
  },
})

export const search = query({
  args: {
    projectId: v.id('projects'),
    query: v.string(),
    sourceType: v.optional(ContextChunkSourceType),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    const limit = Math.min(Math.max(args.limit ?? 12, 1), 50)
    const normalizedQuery = args.query.trim().split(/\s+/).slice(0, 16).join(' ')
    if (!normalizedQuery) return []
    return await ctx.db
      .query('contextChunks')
      .withSearchIndex('search_content', (q) => {
        const scoped = q.search('content', normalizedQuery).eq('projectId', args.projectId)
        return args.sourceType ? scoped.eq('sourceType', args.sourceType) : scoped
      })
      .take(limit)
  },
})

export const listByProject = query({
  args: {
    projectId: v.id('projects'),
    sourceType: v.optional(ContextChunkSourceType),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    const limit = Math.min(Math.max(args.limit ?? 100, 1), 500)
    if (args.sourceType) {
      return await ctx.db
        .query('contextChunks')
        .withIndex('by_project_source_updated', (q) =>
          q.eq('projectId', args.projectId).eq('sourceType', args.sourceType!)
        )
        .order('desc')
        .take(limit)
    }
    return await ctx.db
      .query('contextChunks')
      .withIndex('by_project_updated', (q) => q.eq('projectId', args.projectId))
      .order('desc')
      .take(limit)
  },
})

export const removeRunOutputBySource = mutation({
  args: { projectId: v.id('projects'), sourceId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    const limit = Math.min(Math.max(args.limit ?? 500, 1), 1000)
    const chunks = await ctx.db
      .query('contextChunks')
      .withIndex('by_source', (q) =>
        q
          .eq('projectId', args.projectId)
          .eq('sourceType', 'run_event')
          .eq('sourceId', args.sourceId)
      )
      .take(limit)
    for (const chunk of chunks) await ctx.db.delete(chunk._id)
    return {
      sourceType: 'run_event' as const,
      sourceId: args.sourceId,
      deleted: chunks.length,
      hasMore: chunks.length === limit,
    }
  },
})

export const removeRunOutputByRun = mutation({
  args: { projectId: v.id('projects'), runId: v.id('agentRuns'), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    const limit = Math.min(Math.max(args.limit ?? 500, 1), 1000)
    const chunks = await ctx.db
      .query('contextChunks')
      .withIndex('by_run_updated', (q) => q.eq('runId', args.runId))
      .take(limit)
    const runOutputChunks = chunks.filter(
      (chunk) => chunk.projectId === args.projectId && chunk.sourceType === 'run_event'
    )
    for (const chunk of runOutputChunks) await ctx.db.delete(chunk._id)
    return {
      sourceType: 'run_event' as const,
      runId: args.runId,
      deleted: runOutputChunks.length,
      hasMore: chunks.length === limit,
    }
  },
})

export const purgeRunOutputs = mutation({
  args: { projectId: v.id('projects'), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    const limit = Math.min(Math.max(args.limit ?? 500, 1), 1000)
    const chunks = await ctx.db
      .query('contextChunks')
      .withIndex('by_project_source_updated', (q) =>
        q.eq('projectId', args.projectId).eq('sourceType', 'run_event')
      )
      .take(limit)
    for (const chunk of chunks) await ctx.db.delete(chunk._id)
    return {
      sourceType: 'run_event' as const,
      deleted: chunks.length,
      hasMore: chunks.length === limit,
    }
  },
})

export const removeBySource = mutation({
  args: { projectId: v.id('projects'), sourceType: ContextChunkSourceType, sourceId: v.string() },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    const chunks = await ctx.db
      .query('contextChunks')
      .withIndex('by_source', (q) =>
        q
          .eq('projectId', args.projectId)
          .eq('sourceType', args.sourceType)
          .eq('sourceId', args.sourceId)
      )
      .take(500)
    for (const chunk of chunks) await ctx.db.delete(chunk._id)
    return chunks.length
  },
})

export const purgeProject = mutation({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    let deleted = 0
    while (true) {
      const chunks = await ctx.db
        .query('contextChunks')
        .withIndex('by_project_updated', (q) => q.eq('projectId', args.projectId))
        .take(500)
      if (chunks.length === 0) break
      for (const chunk of chunks) {
        await ctx.db.delete(chunk._id)
        deleted += 1
      }
    }
    return deleted
  },
})

export const getByIds = query({
  args: { projectId: v.id('projects'), ids: v.array(v.id('contextChunks')) },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    const chunks = []
    for (const id of args.ids) {
      const chunk = await ctx.db.get(id)
      if (chunk && chunk.projectId === args.projectId) chunks.push(chunk)
    }
    return chunks
  },
})

export const semanticSearch = action({
  args: {
    projectId: v.id('projects'),
    vector: v.array(v.float64()),
    sourceType: v.optional(ContextChunkSourceType),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args): Promise<Array<Record<string, unknown>>> => {
    await ctx.runQuery(api.projects.get, { id: args.projectId })
    const limit = Math.min(Math.max(args.limit ?? 12, 1), 50)
    const results = await ctx.vectorSearch('contextChunks', 'by_embedding', {
      vector: args.vector,
      limit,
      filter: (q) => q.eq('projectId', args.projectId),
    })
    const chunks: Array<
      Record<string, unknown> & { _id: Id<'contextChunks'>; sourceType?: string }
    > = await ctx.runQuery(api.contextChunks.getByIds, {
      projectId: args.projectId,
      ids: results.map((result) => result._id),
    })
    const scores = new Map(results.map((result) => [result._id, result._score]))
    return chunks
      .filter((chunk) => !args.sourceType || chunk.sourceType === args.sourceType)
      .map((chunk) => ({ ...chunk, vectorScore: scores.get(chunk._id) ?? 0 }))
  },
})
