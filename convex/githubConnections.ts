import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getCurrentUserId, requireAuth } from './lib/auth'
import { requireProjectOwner } from './lib/authz'

const GITHUB_APP_INSTALL_URL = 'https://github.com/apps'

export const getStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx)
    if (!userId) {
      return {
        connected: false,
        installUrl: getGitHubInstallUrl(),
      }
    }

    const connection = await ctx.db
      .query('githubConnections')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .first()

    if (!connection) {
      return {
        connected: false,
        installUrl: getGitHubInstallUrl(),
      }
    }

    return {
      connected: true,
      accountLogin: connection.accountLogin,
      accountType: connection.accountType,
      accountAvatarUrl: connection.accountAvatarUrl,
      repositorySelection: connection.repositorySelection,
      permissions: connection.permissions,
      connectedAt: connection.connectedAt,
      updatedAt: connection.updatedAt,
      suspendedAt: connection.suspendedAt,
      installUrl: getGitHubInstallUrl(),
    }
  },
})

export const getInstallUrl = query({
  args: {},
  handler: async () => getGitHubInstallUrl(),
})

export const disconnect = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx)
    const connection = await ctx.db
      .query('githubConnections')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .first()

    if (!connection) return false

    await ctx.db.delete(connection._id)
    return true
  },
})

export const listAuthorizedRepositories = query({
  args: {
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    if (!userId) {
      return {
        repositories: [],
        nextCursor: null,
        connected: false,
      }
    }

    const connection = await ctx.db
      .query('githubConnections')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .first()

    if (!connection) {
      return {
        repositories: [],
        nextCursor: null,
        connected: false,
      }
    }

    return {
      repositories: getConfiguredRepositoryFixtures(args.cursor, args.limit ?? 25).map(
        (repository) => ({
          ...repository,
          connectionId: connection._id,
        })
      ),
      nextCursor: null,
      connected: true,
    }
  },
})

export const linkRepositoryToProject = mutation({
  args: {
    projectId: v.id('projects'),
    connectionId: v.id('githubConnections'),
    repository: v.object({
      repositoryId: v.string(),
      owner: v.string(),
      name: v.string(),
      fullName: v.string(),
      private: v.boolean(),
      defaultBranch: v.string(),
      htmlUrl: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireProjectOwner(ctx, args.projectId)
    const connection = await ctx.db.get(args.connectionId)

    if (!connection || connection.userId !== userId) {
      throw new Error('GitHub connection not found or access denied')
    }

    const now = Date.now()
    await ctx.db.patch(args.projectId, {
      repoUrl: args.repository.htmlUrl,
      githubRepository: {
        connectionId: args.connectionId,
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
        changedFiles: [],
        status: 'clean',
        updatedAt: now,
      },
    })

    return args.projectId
  },
})

export const getProjectSyncState = query({
  args: {
    projectId: v.id('projects'),
  },
  handler: async (ctx, args) => {
    const { project } = await requireProjectOwner(ctx, args.projectId)
    return {
      repository: project.githubRepository ?? null,
      syncState: project.githubSyncState ?? null,
    }
  },
})

export const recordSyncBaseline = mutation({
  args: {
    projectId: v.id('projects'),
    baseBranch: v.string(),
    baseCommitSha: v.string(),
    lastSyncedCommitSha: v.string(),
    changedFiles: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    const changedFiles = args.changedFiles ?? []
    await ctx.db.patch(args.projectId, {
      githubSyncState: {
        baseBranch: args.baseBranch,
        baseCommitSha: args.baseCommitSha,
        lastSyncedCommitSha: args.lastSyncedCommitSha,
        changedFiles,
        status: changedFiles.length > 0 ? 'dirty' : 'clean',
        updatedAt: Date.now(),
      },
    })
    return args.projectId
  },
})

export const detectRemoteChange = mutation({
  args: {
    projectId: v.id('projects'),
    remoteCommitSha: v.string(),
  },
  handler: async (ctx, args) => {
    const { project } = await requireProjectOwner(ctx, args.projectId)
    const syncState = project.githubSyncState
    if (!syncState) {
      throw new Error('GitHub sync state is not initialized')
    }

    const remoteChanged = args.remoteCommitSha !== syncState.lastSyncedCommitSha
    const status = remoteChanged
      ? syncState.changedFiles.length > 0
        ? 'conflict'
        : 'remote_changed'
      : syncState.changedFiles.length > 0
        ? 'dirty'
        : 'clean'

    await ctx.db.patch(args.projectId, {
      githubSyncState: {
        ...syncState,
        status,
        updatedAt: Date.now(),
      },
    })

    return {
      remoteChanged,
      status,
    }
  },
})

export const createTaskBranch = mutation({
  args: {
    projectId: v.id('projects'),
    label: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { project } = await requireProjectOwner(ctx, args.projectId)
    const syncState = project.githubSyncState
    if (!project.githubRepository || !syncState) {
      throw new Error('GitHub repository is not linked')
    }

    const workingBranch = buildTaskBranchName(args.label ?? project.name, Date.now())
    await ctx.db.patch(args.projectId, {
      githubSyncState: {
        ...syncState,
        workingBranch,
        updatedAt: Date.now(),
      },
    })

    return {
      workingBranch,
      baseBranch: syncState.baseBranch,
    }
  },
})

export const commitWorkingCopy = mutation({
  args: {
    projectId: v.id('projects'),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, project } = await requireProjectOwner(ctx, args.projectId)
    const syncState = project.githubSyncState
    if (!project.githubRepository || !syncState?.workingBranch) {
      throw new Error('Create a Panda branch before committing GitHub changes')
    }
    if (args.message.trim().length === 0) {
      throw new Error('Commit message is required')
    }

    const filesChanged = syncState.changedFiles
    if (filesChanged.length === 0) {
      throw new Error('No GitHub working-copy changes to commit')
    }

    const commitMessage = `${args.message.trim()}\n\nRequested by Panda user ${userId}`
    const now = Date.now()
    const commitId = await ctx.db.insert('githubCommits', {
      projectId: args.projectId,
      userId,
      branch: syncState.workingBranch,
      message: commitMessage,
      filesChanged,
      authorName: 'Panda GitHub App',
      requestedBy: userId,
      createdAt: now,
    })

    await ctx.db.patch(args.projectId, {
      githubSyncState: {
        ...syncState,
        changedFiles: [],
        status: 'clean',
        updatedAt: now,
      },
    })

    return {
      commitId,
      branch: syncState.workingBranch,
      filesChanged,
    }
  },
})

export const confirmPushBranch = mutation({
  args: {
    projectId: v.id('projects'),
    commitId: v.id('githubCommits'),
    confirmed: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (!args.confirmed) {
      throw new Error('Push requires explicit confirmation')
    }

    const { userId, project } = await requireProjectOwner(ctx, args.projectId)
    const commit = await ctx.db.get(args.commitId)
    if (!commit || commit.projectId !== args.projectId || commit.userId !== userId) {
      throw new Error('GitHub commit not found or access denied')
    }
    if (!project.githubSyncState?.workingBranch) {
      throw new Error('No Panda branch is ready to push')
    }

    const now = Date.now()
    await ctx.db.patch(args.commitId, {
      pushedAt: now,
    })

    return {
      branch: commit.branch,
      pushedAt: now,
      filesChanged: commit.filesChanged,
    }
  },
})

export const getLatestCommitForProject = query({
  args: {
    projectId: v.id('projects'),
  },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    const commit = await ctx.db
      .query('githubCommits')
      .withIndex('by_project_created', (q) => q.eq('projectId', args.projectId))
      .order('desc')
      .first()

    if (!commit) return null

    return {
      _id: commit._id,
      branch: commit.branch,
      message: commit.message,
      filesChanged: commit.filesChanged,
      authorName: commit.authorName,
      createdAt: commit.createdAt,
      pushedAt: commit.pushedAt,
    }
  },
})

export const createPullRequestDraft = mutation({
  args: {
    projectId: v.id('projects'),
    commitId: v.id('githubCommits'),
    prompt: v.optional(v.string()),
    validationSummary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, project } = await requireProjectOwner(ctx, args.projectId)
    const commit = await ctx.db.get(args.commitId)
    if (!project.githubRepository || !commit || commit.projectId !== args.projectId) {
      throw new Error('Pushed GitHub commit is required before drafting a PR')
    }
    if (!commit.pushedAt) {
      throw new Error('Push the Panda branch before drafting a PR')
    }

    const title = `Panda: ${commit.message.split('\n')[0]}`
    const body = buildPullRequestBody({
      repository: project.githubRepository.fullName,
      branch: commit.branch,
      filesChanged: commit.filesChanged,
      prompt: args.prompt,
      validationSummary: args.validationSummary,
      requestedBy: userId,
    })

    return await ctx.db.insert('githubPullRequests', {
      projectId: args.projectId,
      commitId: args.commitId,
      branch: commit.branch,
      title,
      body,
      status: 'draft',
      createdBy: userId,
      createdAt: Date.now(),
    })
  },
})

export const confirmCreatePullRequest = mutation({
  args: {
    projectId: v.id('projects'),
    pullRequestId: v.id('githubPullRequests'),
    confirmed: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (!args.confirmed) {
      throw new Error('Pull request creation requires explicit confirmation')
    }

    const { project } = await requireProjectOwner(ctx, args.projectId)
    const pullRequest = await ctx.db.get(args.pullRequestId)
    if (!project.githubRepository || !pullRequest || pullRequest.projectId !== args.projectId) {
      throw new Error('Pull request draft not found or access denied')
    }

    const now = Date.now()
    const url = `${project.githubRepository.htmlUrl}/pull/new/${encodeURIComponent(pullRequest.branch)}`
    await ctx.db.patch(args.pullRequestId, {
      status: 'created',
      url,
      confirmedAt: now,
    })

    return {
      url,
      status: 'created' as const,
    }
  },
})

export const getLatestPullRequestForProject = query({
  args: {
    projectId: v.id('projects'),
  },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId)
    return await ctx.db
      .query('githubPullRequests')
      .withIndex('by_project_created', (q) => q.eq('projectId', args.projectId))
      .order('desc')
      .first()
  },
})

export const getProjectShellSummary = query({
  args: {
    projectId: v.id('projects'),
  },
  handler: async (ctx, args) => {
    const { project } = await requireProjectOwner(ctx, args.projectId)
    if (!project.githubRepository) return null

    const pullRequest = await ctx.db
      .query('githubPullRequests')
      .withIndex('by_project_created', (q) => q.eq('projectId', args.projectId))
      .order('desc')
      .first()

    return {
      repositoryFullName: project.githubRepository.fullName,
      branch:
        project.githubSyncState?.workingBranch ??
        project.githubSyncState?.baseBranch ??
        project.githubRepository.defaultBranch,
      syncStatus: project.githubSyncState?.status ?? 'clean',
      pendingChanges: project.githubSyncState?.changedFiles.length ?? 0,
      pullRequestStatus: pullRequest?.status ?? null,
      pullRequestUrl: pullRequest?.url ?? null,
    }
  },
})

export const syncFromGitHub = mutation({
  args: {
    projectId: v.id('projects'),
    remoteCommitSha: v.string(),
    files: v.optional(
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
    const { project } = await requireProjectOwner(ctx, args.projectId)
    const syncState = project.githubSyncState
    if (!project.githubRepository || !syncState) {
      throw new Error('GitHub sync state is not initialized')
    }

    if (syncState.changedFiles.length > 0) {
      await ctx.db.patch(args.projectId, {
        githubSyncState: {
          ...syncState,
          status: 'conflict',
          updatedAt: Date.now(),
        },
      })
      return {
        applied: false,
        status: 'conflict' as const,
      }
    }

    const now = Date.now()
    for (const file of args.files ?? []) {
      const existing = await ctx.db
        .query('files')
        .withIndex('by_path', (q) => q.eq('projectId', args.projectId).eq('path', file.path))
        .unique()

      if (existing) {
        await ctx.db.patch(existing._id, {
          content: file.content,
          isBinary: file.isBinary ?? false,
          updatedAt: now,
        })
      } else {
        await ctx.db.insert('files', {
          projectId: args.projectId,
          path: file.path,
          content: file.content,
          isBinary: file.isBinary ?? false,
          updatedAt: now,
        })
      }
    }

    await ctx.db.patch(args.projectId, {
      githubSyncState: {
        ...syncState,
        baseCommitSha: args.remoteCommitSha,
        lastSyncedCommitSha: args.remoteCommitSha,
        changedFiles: [],
        status: 'clean',
        updatedAt: now,
      },
    })

    return {
      applied: true,
      status: 'clean' as const,
      filesSynced: args.files?.length ?? 0,
    }
  },
})

export const upsertConnectionForInstallation = mutation({
  args: {
    installationId: v.string(),
    accountLogin: v.string(),
    accountType: v.union(v.literal('User'), v.literal('Organization')),
    accountAvatarUrl: v.optional(v.string()),
    repositorySelection: v.union(v.literal('all'), v.literal('selected')),
    permissions: v.record(v.string(), v.string()),
    suspendedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx)
    const now = Date.now()
    const existing = await ctx.db
      .query('githubConnections')
      .withIndex('by_user_installation', (q) =>
        q.eq('userId', userId).eq('installationId', args.installationId)
      )
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        accountLogin: args.accountLogin,
        accountType: args.accountType,
        accountAvatarUrl: args.accountAvatarUrl,
        repositorySelection: args.repositorySelection,
        permissions: args.permissions,
        suspendedAt: args.suspendedAt,
        updatedAt: now,
      })
      return existing._id
    }

    return await ctx.db.insert('githubConnections', {
      userId,
      installationId: args.installationId,
      accountLogin: args.accountLogin,
      accountType: args.accountType,
      accountAvatarUrl: args.accountAvatarUrl,
      repositorySelection: args.repositorySelection,
      permissions: args.permissions,
      connectedAt: now,
      updatedAt: now,
      suspendedAt: args.suspendedAt,
    })
  },
})

function getGitHubInstallUrl(): string {
  const appSlug = process.env.GITHUB_APP_SLUG
  if (!appSlug) return GITHUB_APP_INSTALL_URL
  return `${GITHUB_APP_INSTALL_URL}/${appSlug}/installations/new`
}

function buildTaskBranchName(label: string, timestamp: number): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return `panda/${slug || 'task'}-${timestamp}`
}

function buildPullRequestBody({
  repository,
  branch,
  filesChanged,
  prompt,
  validationSummary,
  requestedBy,
}: {
  repository: string
  branch: string
  filesChanged: string[]
  prompt: string | undefined
  validationSummary: string | undefined
  requestedBy: string
}): string {
  const fileList = filesChanged.map((file) => `- ${file}`).join('\n') || '- No files recorded'
  return [
    `## Summary`,
    `Panda prepared changes for ${repository} on branch ${branch}.`,
    prompt ? `\n## Original Request\n${prompt}` : null,
    `\n## Changed Files\n${fileList}`,
    validationSummary ? `\n## Validation\n${validationSummary}` : null,
    `\n## Attribution\nRequested by Panda user ${requestedBy}. Authored by Panda GitHub App.`,
  ]
    .filter(Boolean)
    .join('\n')
}

function getConfiguredRepositoryFixtures(cursor: string | undefined, limit: number) {
  void cursor
  const cappedLimit = Math.min(Math.max(limit, 1), 50)
  const fixture = process.env.GITHUB_REPOSITORY_FIXTURES
  if (!fixture) return []

  try {
    const parsed = JSON.parse(fixture) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.slice(0, cappedLimit).filter(isRepositoryFixture)
  } catch {
    return []
  }
}

function isRepositoryFixture(value: unknown): value is {
  repositoryId: string
  owner: string
  name: string
  fullName: string
  private: boolean
  defaultBranch: string
  htmlUrl: string
} {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.repositoryId === 'string' &&
    typeof candidate.owner === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.fullName === 'string' &&
    typeof candidate.private === 'boolean' &&
    typeof candidate.defaultBranch === 'string' &&
    typeof candidate.htmlUrl === 'string'
  )
}
