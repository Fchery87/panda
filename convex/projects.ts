import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import type { MutationCtx } from './_generated/server'
import { requireAuth, getCurrentUserId } from './lib/auth'
import { trackUserAnalytics } from './lib/userAnalytics'

const MAX_INITIAL_GITHUB_FILES = 100

type IndexQueryBuilder = {
  eq: (fieldName: string, value: unknown) => IndexQueryBuilder
}

async function deleteByIndex<TableName extends Parameters<MutationCtx['db']['query']>[0]>(
  ctx: MutationCtx,
  table: TableName,
  indexName: string,
  buildQuery: (q: IndexQueryBuilder) => unknown
): Promise<number> {
  const rows = await ctx.db
    .query(table)
    .withIndex(indexName as never, buildQuery as never)
    .take(1000)

  for (const row of rows) {
    await ctx.db.delete(row._id)
  }

  return rows.length
}

async function deleteFileWithSnapshots(ctx: MutationCtx, fileId: Id<'files'>): Promise<void> {
  await deleteByIndex(ctx, 'fileSnapshots', 'by_file', (q) => q.eq('fileId', fileId))
  await ctx.db.delete(fileId)
}

async function assertProjectLimitAvailable(ctx: MutationCtx, userId: Id<'users'>): Promise<void> {
  const adminSettings = await ctx.db.query('adminSettings').order('desc').first()
  const maxProjects = adminSettings?.maxProjectsPerUser ?? DEFAULT_MAX_PROJECTS_PER_USER

  const existingProjects = await ctx.db
    .query('projects')
    .withIndex('by_creator', (q) => q.eq('createdBy', userId))
    .take(1000)

  if (existingProjects.length >= maxProjects) {
    throw new Error(
      `Project limit reached. You have ${existingProjects.length} projects (maximum: ${maxProjects}). Please delete an existing project before creating a new one.`
    )
  }
}

async function deleteChatChildren(ctx: MutationCtx, chatId: Id<'chats'>): Promise<number> {
  const messages = await ctx.db
    .query('messages')
    .withIndex('by_chat', (q) => q.eq('chatId', chatId))
    .take(1000)

  for (const message of messages) {
    await deleteByIndex(ctx, 'chatAttachments', 'by_message', (q) => q.eq('messageId', message._id))
    await deleteByIndex(ctx, 'artifacts', 'by_message', (q) => q.eq('messageId', message._id))
    await ctx.db.delete(message._id)
  }

  await deleteByIndex(ctx, 'artifacts', 'by_chat', (q) => q.eq('chatId', chatId))
  await deleteByIndex(ctx, 'planningSessions', 'by_chat', (q) => q.eq('chatId', chatId))
  await deleteByIndex(ctx, 'checkpoints', 'by_chat', (q) => q.eq('chatId', chatId))
  await deleteByIndex(ctx, 'sharedChats', 'by_chat', (q) => q.eq('chatId', chatId))
  await deleteByIndex(ctx, 'agentRunEvents', 'by_chat_created', (q) => q.eq('chatId', chatId))
  await deleteByIndex(ctx, 'harnessRuntimeCheckpoints', 'by_chat_saved', (q) =>
    q.eq('chatId', chatId)
  )
  await deleteByIndex(ctx, 'sessionSummaries', 'by_chat', (q) => q.eq('chatId', chatId))
  await deleteByIndex(ctx, 'specifications', 'by_chat', (q) => q.eq('chatId', chatId))

  return messages.length
}

// list (query) - list all projects for current user
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx)
    if (!userId) return []

    return await ctx.db
      .query('projects')
      .withIndex('by_creator', (q) => q.eq('createdBy', userId as Id<'users'>))
      .take(200)
  },
})

// get (query) - get single project by id
export const get = query({
  args: { id: v.id('projects') },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    if (!userId) return null

    const project = await ctx.db.get(args.id)

    if (!project || project.createdBy !== (userId as Id<'users'>)) {
      return null
    }

    return project
  },
})

// Default limits if not configured
const DEFAULT_MAX_PROJECTS_PER_USER = 100

// create (mutation) - create new project
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    repoUrl: v.optional(v.string()),
    githubRepository: v.optional(
      v.object({
        connectionId: v.id('githubConnections'),
        repositoryId: v.string(),
        owner: v.string(),
        name: v.string(),
        fullName: v.string(),
        private: v.boolean(),
        defaultBranch: v.string(),
        htmlUrl: v.string(),
        linkedAt: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx)

    await assertProjectLimitAvailable(ctx, userId)

    const now = Date.now()

    const projectId = await ctx.db.insert('projects', {
      name: args.name,
      description: args.description,
      createdBy: userId,
      createdAt: now,
      lastOpenedAt: now,
      repoUrl: args.repoUrl,
      githubRepository: args.githubRepository,
      githubSyncState: args.githubRepository
        ? {
            baseBranch: args.githubRepository.defaultBranch,
            baseCommitSha: 'unknown',
            lastSyncedCommitSha: 'unknown',
            changedFiles: [],
            status: 'clean',
            updatedAt: now,
          }
        : undefined,
      agentPolicy: null,
    })

    await trackUserAnalytics(ctx, userId, {
      totalProjects: 1,
    })

    return projectId
  },
})

export const createFromGitHubRepository = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    repository: v.object({
      connectionId: v.id('githubConnections'),
      repositoryId: v.string(),
      owner: v.string(),
      name: v.string(),
      fullName: v.string(),
      private: v.boolean(),
      defaultBranch: v.string(),
      htmlUrl: v.string(),
    }),
    initialFiles: v.optional(
      v.array(
        v.object({
          path: v.string(),
          content: v.optional(v.string()),
          isBinary: v.optional(v.boolean()),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx)
    await assertProjectLimitAvailable(ctx, userId)

    const connection = await ctx.db.get(args.repository.connectionId)
    if (!connection || connection.userId !== userId) {
      throw new Error('GitHub connection not found or access denied')
    }

    const initialFiles = args.initialFiles ?? []
    if (initialFiles.length > MAX_INITIAL_GITHUB_FILES) {
      throw new Error(`Initial GitHub import is limited to ${MAX_INITIAL_GITHUB_FILES} files`)
    }

    const now = Date.now()
    const projectId = await ctx.db.insert('projects', {
      name: args.name,
      description: args.description,
      createdBy: userId,
      createdAt: now,
      lastOpenedAt: now,
      repoUrl: args.repository.htmlUrl,
      githubRepository: {
        connectionId: args.repository.connectionId,
        repositoryId: args.repository.repositoryId,
        owner: args.repository.owner,
        name: args.repository.name,
        fullName: args.repository.fullName,
        private: args.repository.private,
        defaultBranch: args.repository.defaultBranch,
        htmlUrl: args.repository.htmlUrl,
        linkedAt: now,
      },
      githubSyncState: {
        baseBranch: args.repository.defaultBranch,
        baseCommitSha: 'unknown',
        lastSyncedCommitSha: 'unknown',
        changedFiles: initialFiles.map((file) => file.path),
        status: initialFiles.length > 0 ? 'dirty' : 'clean',
        updatedAt: now,
      },
      agentPolicy: null,
    })

    for (const file of initialFiles) {
      await ctx.db.insert('files', {
        projectId,
        path: file.path,
        content: file.content,
        isBinary: file.isBinary ?? false,
        updatedAt: now,
      })
    }

    await trackUserAnalytics(ctx, userId, {
      totalProjects: 1,
    })

    return projectId
  },
})

// update (mutation) - update project name/description
export const update = mutation({
  args: {
    id: v.id('projects'),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    repoUrl: v.optional(v.string()),
    githubRepository: v.optional(
      v.object({
        connectionId: v.id('githubConnections'),
        repositoryId: v.string(),
        owner: v.string(),
        name: v.string(),
        fullName: v.string(),
        private: v.boolean(),
        defaultBranch: v.string(),
        htmlUrl: v.string(),
        linkedAt: v.number(),
      })
    ),
    lastOpenedAt: v.optional(v.number()),
    agentPolicy: v.optional(
      v.union(
        v.null(),
        v.object({
          autoApplyFiles: v.boolean(),
          autoRunCommands: v.boolean(),
          allowedCommandPrefixes: v.array(v.string()),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx)

    const project = await ctx.db.get(args.id)

    if (!project || project.createdBy !== userId) {
      throw new Error('Project not found or access denied')
    }

    const updates: Partial<typeof project> = {}

    if (args.name !== undefined) updates.name = args.name
    if (args.description !== undefined) updates.description = args.description
    if (args.repoUrl !== undefined) updates.repoUrl = args.repoUrl
    if (args.githubRepository !== undefined) updates.githubRepository = args.githubRepository
    if (args.lastOpenedAt !== undefined) updates.lastOpenedAt = args.lastOpenedAt
    if (args.agentPolicy !== undefined) updates.agentPolicy = args.agentPolicy

    await ctx.db.patch(args.id, updates)

    return args.id
  },
})

// remove (mutation) - delete project and cascade delete related files/chats
export const remove = mutation({
  args: { id: v.id('projects') },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx)

    const project = await ctx.db.get(args.id)

    if (!project || project.createdBy !== userId) {
      throw new Error('Project not found or access denied')
    }

    const files = await ctx.db
      .query('files')
      .withIndex('by_project', (q) => q.eq('projectId', args.id))
      .take(1000)

    for (const file of files) {
      await deleteFileWithSnapshots(ctx, file._id)
    }

    const chats = await ctx.db
      .query('chats')
      .withIndex('by_project', (q) => q.eq('projectId', args.id))
      .take(1000)

    let deletedMessageCount = 0

    for (const chat of chats) {
      deletedMessageCount += await deleteChatChildren(ctx, chat._id)
      await ctx.db.delete(chat._id)
    }

    await deleteByIndex(ctx, 'jobs', 'by_project', (q) => q.eq('projectId', args.id))
    await deleteByIndex(ctx, 'agentRuns', 'by_project_started', (q) => q.eq('projectId', args.id))
    await deleteByIndex(ctx, 'harnessRuntimeCheckpoints', 'by_project_session_saved', (q) =>
      q.eq('projectId', args.id)
    )
    await deleteByIndex(ctx, 'sessionSummaries', 'by_project', (q) => q.eq('projectId', args.id))
    await deleteByIndex(ctx, 'checkpoints', 'by_project', (q) => q.eq('projectId', args.id))
    await deleteByIndex(ctx, 'specifications', 'by_project', (q) => q.eq('projectId', args.id))
    await deleteByIndex(ctx, 'chatAttachments', 'by_project_created', (q) =>
      q.eq('projectId', args.id)
    )

    const evalRuns = await ctx.db
      .query('evalRuns')
      .withIndex('by_project_started', (q) => q.eq('projectId', args.id))
      .take(1000)

    for (const evalRun of evalRuns) {
      await deleteByIndex(ctx, 'evalRunResults', 'by_run_sequence', (q) =>
        q.eq('runId', evalRun._id)
      )
      await ctx.db.delete(evalRun._id)
    }

    await deleteByIndex(ctx, 'evalRunResults', 'by_project_created', (q) =>
      q.eq('projectId', args.id)
    )
    await deleteByIndex(ctx, 'evalSuites', 'by_project_updated', (q) => q.eq('projectId', args.id))

    await ctx.db.delete(args.id)

    await trackUserAnalytics(ctx, userId, {
      totalProjects: -1,
      totalChats: -chats.length,
      totalMessages: -deletedMessageCount,
    })

    return args.id
  },
})
