import { ConvexCheckpointStore } from './harness/convex-checkpoint-store'
import type { CheckpointStore as HarnessCheckpointStore } from './harness/checkpoint-store'
import type { PromptContext, ChatMode } from './prompt-library'
import type { RuntimeConfig } from './runtime'
import { buildPlanContext } from './context/plan-context'
import { resolveBackgroundExecutionPolicy } from '../chat/backgroundExecution'
import type { Id } from '@convex/_generated/dataModel'

interface ProjectFileContext {
  path: string
  content?: string
  updatedAt: number
}

interface CheckpointClient {
  query: (func: unknown, args: Record<string, unknown>) => Promise<unknown>
  mutation: (func: unknown, args: Record<string, unknown>) => Promise<unknown>
}

export function buildAgentPromptContext(args: {
  projectId: Id<'projects'>
  chatId: Id<'chats'>
  userId: Id<'users'>
  projectName?: string
  projectDescription?: string
  mode: ChatMode
  provider: string
  previousMessages: Array<{ role: 'user' | 'assistant'; content: string }>
  projectOverviewContent?: string | null
  projectFiles?: ProjectFileContext[]
  memoryBankContent?: string | null
  userContent: string
  contextFiles?: string[]
  architectBrainstormEnabled?: boolean
}): PromptContext {
  const projectOverview =
    args.mode === 'architect' && args.projectFiles
      ? [
          args.projectOverviewContent,
          buildPlanContext({
            files: args.projectFiles,
            userMessage: args.userContent,
          }),
        ]
          .filter((value): value is string => Boolean(value))
          .join('\n\n') || undefined
      : (args.projectOverviewContent ?? undefined)

  return {
    projectId: args.projectId,
    chatId: args.chatId,
    userId: args.userId,
    projectName: args.projectName,
    projectDescription: args.projectDescription,
    chatMode: args.mode,
    provider: args.provider,
    previousMessages: args.previousMessages,
    projectOverview,
    memoryBank: args.memoryBankContent ?? undefined,
    userMessage:
      args.contextFiles && args.contextFiles.length > 0
        ? `${args.userContent}\n\n[Context files referenced by user: ${args.contextFiles.map((file) => `@file:${file}`).join(', ')}. Read these files first when relevant to the request.]`
        : args.userContent,
    customInstructions: args.architectBrainstormEnabled
      ? 'Architect brainstorming protocol: enabled'
      : undefined,
  }
}

export function buildAgentRuntimeConfig(args: {
  runId: Id<'agentRuns'>
  mode: ChatMode
  harnessSessionID?: string
}): RuntimeConfig {
  return {
    maxIterations: 10,
    maxToolCallsPerIteration: 50,
    enableToolDeduplication: true,
    toolLoopThreshold: 3,
    harnessSessionID: args.harnessSessionID ?? `harness_run_${args.runId}`,
    harnessAutoResume: true,
    harnessSpecApprovalMode: resolveBackgroundExecutionPolicy(args.mode).harnessSpecApprovalMode,
  }
}

export function createAgentCheckpointStore(args: {
  client: CheckpointClient
  runId: Id<'agentRuns'>
  chatId: Id<'chats'>
  projectId: Id<'projects'>
  harnessSessionID?: string
}): HarnessCheckpointStore {
  if (args.harnessSessionID) {
    return {
      async save(checkpoint) {
        await new ConvexCheckpointStore(args.client, {
          runId: args.runId,
          chatId: args.chatId,
          projectId: args.projectId,
        }).save(checkpoint)
      },
      async load(sessionID) {
        return await new ConvexCheckpointStore(args.client, {
          chatId: args.chatId,
          projectId: args.projectId,
        }).load(sessionID)
      },
    }
  }

  return new ConvexCheckpointStore(args.client, {
    runId: args.runId,
    chatId: args.chatId,
    projectId: args.projectId,
  })
}
