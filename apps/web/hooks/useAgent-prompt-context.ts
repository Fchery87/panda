import type { Id } from '@convex/_generated/dataModel'
import type { LLMProvider, ProviderType } from '@/lib/llm/types'
import type { ChatMode } from '@/lib/agent/prompt-library'
import type { PromptContext } from '@/lib/agent/prompt-library'
import type { AgentContextPack } from '@/lib/agent/context/context-pack'
import { buildAgentPromptContext } from '@/lib/agent/session-controller'
import {
  buildPromptMessagesWithModeSummary,
  type ChatMessage,
  type PromptHistoryMessage,
} from '@/lib/agent/context/session-summary'
import type { GeneratedPlanArtifact } from '@/lib/planning/types'
import type { FormalSpecification } from '@/lib/agent/spec/types'
import type { ContextAuditRecord } from '@/lib/agent/receipt'
import type { ProjectRulePromptContext } from '@/lib/agent/project-rules'
import { resolveModeHandoff, type UnresolvedModeHandoff } from '@/lib/agent/context/mode-handoff'

interface ProjectFileMetadata {
  path: string
  updatedAt: number
}

export interface BuildAgentPromptBundleArgs {
  projectId: Id<'projects'>
  chatId: Id<'chats'>
  userId: Id<'users'>
  projectName?: string
  projectDescription?: string
  mode: ChatMode
  provider?: LLMProvider | null
  messages: ChatMessage[]
  projectOverviewContent?: string | null
  projectFiles?: ProjectFileMetadata[]
  memoryBankContent?: string | null
  projectRules?: ProjectRulePromptContext[]
  userContent: string
  contextFiles?: string[]
  architectBrainstormEnabled?: boolean
  planDraft?: string
  approvedPlanExecutionContext?: {
    sessionId: string
    plan: GeneratedPlanArtifact
  }
  activeSpec?: FormalSpecification | null
  previousMode?: ChatMode | null
  agentContextPack?: AgentContextPack
}

export interface AgentPromptBundle {
  providerType: ProviderType
  previousMessagesSnapshot: PromptHistoryMessage[]
  promptContext: PromptContext
  contextAudit: ContextAuditRecord
  unresolvedModeHandoff?: UnresolvedModeHandoff
}

export function buildAgentPreviousMessagesSnapshot(args: {
  mode: ChatMode
  messages: ChatMessage[]
}): PromptHistoryMessage[] {
  return buildPromptMessagesWithModeSummary({
    currentMode: args.mode,
    messages: args.messages,
  })
}

function toPromptContextMessage(message: PromptHistoryMessage) {
  return {
    role: message.role === 'assistant' ? 'assistant' : 'user',
    content: message.content,
  } as const
}

function toPromptContextFile(file: ProjectFileMetadata) {
  return {
    path: file.path,
    content: '',
    updatedAt: file.updatedAt,
  }
}

export function buildAgentPromptBundle(args: BuildAgentPromptBundleArgs): AgentPromptBundle {
  const providerType = (args.provider?.config?.provider || 'openai') as ProviderType
  const previousMessagesSnapshot = buildAgentPreviousMessagesSnapshot({
    mode: args.mode,
    messages: args.messages,
  })
  const modeHandoffResolution = resolveModeHandoff({
    targetMode: args.mode,
    userContent: args.userContent,
    messages: args.messages,
    approvedPlanExecutionContext: args.approvedPlanExecutionContext,
  })
  const modeHandoff = modeHandoffResolution.unresolved ? undefined : modeHandoffResolution.packet

  const promptContext = buildAgentPromptContext({
    projectId: args.projectId,
    chatId: args.chatId,
    userId: args.userId,
    projectName: args.projectName,
    projectDescription: args.projectDescription,
    mode: args.mode,
    provider: providerType,
    previousMessages: previousMessagesSnapshot.map(toPromptContextMessage),
    projectOverviewContent: args.projectOverviewContent,
    projectFiles: args.projectFiles?.map(toPromptContextFile),
    memoryBankContent: args.memoryBankContent,
    projectRules: args.projectRules,
    userContent: args.userContent,
    contextFiles: args.contextFiles,
    architectBrainstormEnabled: args.architectBrainstormEnabled,
    planDraft: args.planDraft,
    approvedPlanExecutionContext: args.approvedPlanExecutionContext,
    activeSpec: args.activeSpec ?? undefined,
    previousMode: args.previousMode ?? null,
    agentContextPack: args.agentContextPack,
    modeHandoff,
  })

  const contextAudit: ContextAuditRecord = {
    filesConsidered:
      args.projectFiles?.map((file) => ({
        path: file.path,
        relevanceScore: 0,
      })) ?? [],
    filesLoaded: [],
    filesExcluded: [],
    memoryBankIncluded: Boolean(args.memoryBankContent),
    specIncluded: Boolean(args.activeSpec),
    planIncluded: Boolean(
      args.planDraft ||
      args.approvedPlanExecutionContext ||
      modeHandoff?.kind === 'latest_plan' ||
      modeHandoff?.kind === 'approved_plan'
    ),
    sessionSummaryIncluded: Boolean(promptContext.sessionSummary),
    compactionOccurred: false,
    truncated: false,
  }

  return {
    providerType,
    previousMessagesSnapshot,
    promptContext,
    contextAudit,
    unresolvedModeHandoff: modeHandoffResolution.unresolved ? modeHandoffResolution : undefined,
  }
}
