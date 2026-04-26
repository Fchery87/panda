'use client'

import { createContext, useContext } from 'react'
import type { Id } from '@convex/_generated/dataModel'
import type { Message, PersistedRunEventSummaryInfo, ToolCallInfo } from '@/components/chat/types'
import type { LiveProgressStep } from '@/components/chat/live-run-utils'
import type { AvailableModel } from '@/components/chat/ModelSelector'
import type { FormalSpecification } from '@/lib/agent/spec/types'
import type { ChatMode } from '@/lib/agent/prompt-library'
import type { PlanStatus } from '@/lib/chat/planDraft'
import type { TracePersistenceStatus } from '@/hooks/useRunEventBuffer'
import type { GeneratedPlanArtifact, PlanningAnswer, PlanningQuestion } from '@/lib/planning/types'
import type { PlanningSessionDebugSummary } from '@/components/plan/PlanningSessionDebugCard'
import type { SidebarSection } from '@/components/sidebar/SidebarRail'
import type { RightPanelTabId } from '@/components/panels/RightPanel'

export type PlanningSessionView = {
  sessionId: string
  status: string
  questions: PlanningQuestion[]
  answers: PlanningAnswer[]
  generatedPlan?: GeneratedPlanArtifact
} | null

export interface InlineRateLimitError {
  title: string
  description: string
}

export interface SnapshotEvent {
  _id?: string
  type: string
  content?: string
  createdAt?: number
  snapshot?: { hash?: string; step?: number; files?: string[] }
}

export interface WorkspaceRuntimeValue {
  // Identity
  projectId: Id<'projects'>
  projectName: string

  // Active chat (from Convex + session)
  activeChatId: Id<'chats'> | undefined
  activeChatTitle: string | undefined
  activeChatExists: boolean
  activeChatPlanStatus: PlanStatus | undefined
  activeChatPlanUpdatedAt: number | undefined
  activeChatPlanLastGeneratedAt: number | undefined

  // Chat messages + run state (from useWorkbenchChatState)
  chatMessages: Message[]
  runEvents: PersistedRunEventSummaryInfo[] | undefined
  liveSteps: LiveProgressStep[]
  snapshotEvents: SnapshotEvent[]
  subagentToolCalls: ToolCallInfo[]
  inlineRateLimitError: InlineRateLimitError | null
  lastUserPrompt: string | null
  lastAssistantReply: string | null

  // Agent state
  isStreaming: boolean
  currentSpec: FormalSpecification | null
  memoryBank: string | null | undefined
  tracePersistenceStatus: TracePersistenceStatus

  // Model / provider (from useProjectChatSession)
  model: string | undefined
  selectedModel: string
  availableModels: AvailableModel[]
  supportsReasoning: boolean
  hasProvider: boolean

  // Files
  filePaths: string[]
  filesForPalette: Array<{ path: string }>

  // Plan state (from useProjectPlanDraft + computed)
  planDraft: string
  isSavingPlanDraft: boolean
  planApproveDisabled: boolean
  planBuildDisabled: boolean
  showInlinePlanReview: boolean
  planStatus: PlanStatus | undefined
  canApprovePlan: boolean
  canBuildPlan: boolean
  lastSavedAt: number | undefined
  lastGeneratedAt: number | undefined
  planningDebug: PlanningSessionDebugSummary | null

  // Planning session (from useProjectPlanningSession)
  planningSession: PlanningSessionView
  planningCurrentQuestion: PlanningQuestion | null

  // Runtime / system
  isAnyJobRunning: boolean
  isRuntimeRunning: boolean
  isAgentRunning: boolean
  gitStatus: unknown
  healthStatus: 'ready' | 'issues' | 'error'
  healthDetail: string

  // Shell UI state (non-store — driven by useState in the provider)
  composerOpen: boolean
  shortcutHelpOpen: boolean
  isFlyoutOpen: boolean
  activeSection: SidebarSection

  // Resolved navigation helper (mobile-aware)
  openRightPanelTab: (tab: RightPanelTabId) => void

  // --- Callbacks ---

  // Message / mode
  onSendMessage: (
    content: string,
    mode: ChatMode,
    contextFiles?: string[],
    options?: {
      approvedPlanExecution?: boolean
      attachments?: Array<{
        storageId: Id<'_storage'>
        path: string
        filename: string
        kind: 'file' | 'image'
        contentType?: string
        size?: number
        url?: string
      }>
    }
  ) => Promise<void>
  onSuggestedAction: (prompt: string, targetMode?: ChatMode) => Promise<void>
  onModeChange: (mode: ChatMode) => void
  onStopStreaming: () => void
  onResumeRuntimeSession: (sessionID: string) => Promise<void>
  onRunEvalScenario: (scenario: {
    input?: unknown
    prompt?: string
    expected?: unknown
    mode?: string
    evalMode?: 'read_only' | 'full'
  }) => Promise<{
    output: string
    error?: string
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number }
  }>
  onSaveMemoryBank: (content: string) => Promise<void>

  // Plan actions
  onPlanApprove: () => void
  onBuildFromPlan: () => void
  onPlanDraftChange: (draft: string) => void
  onSavePlanDraft: () => void

  // Planning session actions
  onStartPlanningIntake: () => Promise<unknown>
  onAnswerPlanningQuestion: (input: {
    questionId: string
    selectedOptionId?: string
    freeformValue?: string
    source: 'suggestion' | 'freeform'
  }) => Promise<unknown>
  onClearPlanningIntake: () => Promise<unknown>

  // Navigation / workspace
  onOpenFile: (path: string) => void
  onResetWorkspace: () => void
  onNewChat: () => void
  onToggleInspector: () => void
  onOpenHistory: () => void
  onComposerSubmit: (prompt: string, contextFiles?: string[]) => void

  // Shell actions
  onToggleFlyout: () => void
  onToggleRightPanel: () => void
  onNewTask: () => void
  onStartRuntime: () => void
  onStopRuntime: () => void
  onRevealInExplorer: (folderPath: string) => void
  onOpenCommandPalette: () => void
  onSidebarSectionChange: (section: SidebarSection) => void
  onComposerOpenChange: (open: boolean) => void
  onShortcutHelpOpenChange: (open: boolean) => void
  writeFileToRuntime?: (path: string, content: string) => Promise<unknown>
}

const WorkspaceRuntimeContext = createContext<WorkspaceRuntimeValue | null>(null)

export const WorkspaceRuntimeProvider = WorkspaceRuntimeContext.Provider

export function useWorkspaceRuntime(): WorkspaceRuntimeValue {
  const ctx = useContext(WorkspaceRuntimeContext)
  if (!ctx) throw new Error('useWorkspaceRuntime must be used within WorkspaceRuntimeProvider')
  return ctx
}
