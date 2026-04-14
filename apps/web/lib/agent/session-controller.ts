import { ConvexCheckpointStore } from './harness/convex-checkpoint-store'
import type { CheckpointStore as HarnessCheckpointStore } from './harness/checkpoint-store'
import type { PromptContext, ChatMode } from './prompt-library'
import type { RuntimeConfig } from './runtime'
import { buildPlanContext } from './context/plan-context'
import type { Id } from '@convex/_generated/dataModel'
import type { GeneratedPlanArtifact } from '../planning/types'
import type { FormalSpecification } from './spec/types'

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
  planDraft?: string
  approvedPlanExecutionContext?: {
    sessionId: string
    plan: GeneratedPlanArtifact
  }
  activeSpec?: FormalSpecification
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
        ? `${args.userContent}\n\n[Context assets referenced by user: ${args.contextFiles
            .map((asset) => {
              if (asset.startsWith('folder:')) return `Folder: ${asset.replace('folder:', '')}`
              if (/^https?:\/\//i.test(asset)) return `URL: ${asset}`
              return `File: ${asset}`
            })
            .join(', ')}. Reference these assets first when relevant to the request.]`
        : args.userContent,
    customInstructions: args.architectBrainstormEnabled
      ? 'Architect brainstorming protocol: enabled'
      : undefined,
    planningSession:
      args.mode === 'architect'
        ? {
            hasActiveSession: args.architectBrainstormEnabled || Boolean(args.planDraft?.trim()),
            phase: args.architectBrainstormEnabled
              ? 'discovery'
              : args.planDraft?.trim()
                ? 'validated_plan'
                : undefined,
            hasDraftPlan: Boolean(args.planDraft?.trim()),
          }
        : undefined,
    approvedPlanExecution: args.mode === 'build' ? args.approvedPlanExecutionContext : undefined,
    activeSpec: args.activeSpec,
  }
}

export function buildAgentRuntimeConfig(args: {
  runId: string
  mode: ChatMode
  harnessSessionID?: string
  specApprovalMode?: 'interactive' | 'auto_approve'
}): RuntimeConfig {
  return {
    maxIterations: 10,
    maxToolCallsPerIteration: 50,
    enableToolDeduplication: true,
    toolLoopThreshold: 3,
    harnessSessionID: args.harnessSessionID ?? `harness_run_${args.runId}`,
    harnessAutoResume: true,
    harnessSpecApprovalMode: args.specApprovalMode ?? 'interactive',
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
