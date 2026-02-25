import type { MutationCtx, QueryCtx } from '../_generated/server'
import type { Doc, Id } from '../_generated/dataModel'
import { requireAuth } from './auth'

type AuthzCtx = QueryCtx | MutationCtx

export async function requireProjectOwner(
  ctx: AuthzCtx,
  projectId: Id<'projects'>
): Promise<{ userId: Id<'users'>; project: Doc<'projects'> }> {
  const userId = await requireAuth(ctx)
  const project = await ctx.db.get(projectId)

  if (!project || project.createdBy !== userId) {
    throw new Error('Access denied')
  }

  return { userId, project }
}

export async function requireChatOwner(
  ctx: AuthzCtx,
  chatId: Id<'chats'>
): Promise<{ userId: Id<'users'>; project: Doc<'projects'>; chat: Doc<'chats'> }> {
  const chat = await ctx.db.get(chatId)
  if (!chat) {
    throw new Error('Chat not found')
  }

  const access = await requireProjectOwner(ctx, chat.projectId)
  return { ...access, chat }
}

export async function requireMessageOwner(
  ctx: AuthzCtx,
  messageId: Id<'messages'>
): Promise<{
  userId: Id<'users'>
  project: Doc<'projects'>
  chat: Doc<'chats'>
  message: Doc<'messages'>
}> {
  const message = await ctx.db.get(messageId)
  if (!message) {
    throw new Error('Message not found')
  }

  const access = await requireChatOwner(ctx, message.chatId)
  return { ...access, message }
}

export async function requireArtifactOwner(
  ctx: AuthzCtx,
  artifactId: Id<'artifacts'>
): Promise<{
  userId: Id<'users'>
  project: Doc<'projects'>
  chat: Doc<'chats'>
  artifact: Doc<'artifacts'>
}> {
  const artifact = await ctx.db.get(artifactId)
  if (!artifact) {
    throw new Error('Artifact not found')
  }

  const access = await requireChatOwner(ctx, artifact.chatId)
  return { ...access, artifact }
}

export async function requireFileOwner(
  ctx: AuthzCtx,
  fileId: Id<'files'>
): Promise<{ userId: Id<'users'>; project: Doc<'projects'>; file: Doc<'files'> }> {
  const file = await ctx.db.get(fileId)
  if (!file) {
    throw new Error('File not found')
  }

  const access = await requireProjectOwner(ctx, file.projectId)
  return { ...access, file }
}

export async function requireJobOwner(
  ctx: AuthzCtx,
  jobId: Id<'jobs'>
): Promise<{ userId: Id<'users'>; project: Doc<'projects'>; job: Doc<'jobs'> }> {
  const job = await ctx.db.get(jobId)
  if (!job) {
    throw new Error('Job not found')
  }

  const access = await requireProjectOwner(ctx, job.projectId)
  return { ...access, job }
}

export async function requireCheckpointOwner(
  ctx: AuthzCtx,
  checkpointId: Id<'checkpoints'>
): Promise<{
  userId: Id<'users'>
  project: Doc<'projects'>
  checkpoint: Doc<'checkpoints'>
}> {
  const checkpoint = await ctx.db.get(checkpointId)
  if (!checkpoint) {
    throw new Error('Checkpoint not found')
  }

  const access = await requireProjectOwner(ctx, checkpoint.projectId)
  return { ...access, checkpoint }
}

export async function requireSnapshotOwner(
  ctx: AuthzCtx,
  snapshotId: Id<'fileSnapshots'>
): Promise<{
  userId: Id<'users'>
  project: Doc<'projects'>
  file: Doc<'files'>
  snapshot: Doc<'fileSnapshots'>
}> {
  const snapshot = await ctx.db.get(snapshotId)
  if (!snapshot) {
    throw new Error('Snapshot not found')
  }

  const access = await requireFileOwner(ctx, snapshot.fileId)
  return { ...access, snapshot }
}

export async function requireAgentRunOwner(
  ctx: AuthzCtx,
  runId: Id<'agentRuns'>
): Promise<{ userId: Id<'users'>; project: Doc<'projects'>; run: Doc<'agentRuns'> }> {
  const run = await ctx.db.get(runId)
  if (!run) {
    throw new Error('Run not found')
  }

  const access = await requireProjectOwner(ctx, run.projectId)
  return { ...access, run }
}
