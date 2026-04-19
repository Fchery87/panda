'use client'

import type { Id } from '@convex/_generated/dataModel'
import type { PersistedRunEventInfo, ToolCallInfo, Message } from '@/components/chat/types'
import type { LiveProgressStep } from '@/components/chat/live-run-utils'
import type { AvailableModel } from '@/components/chat/ModelSelector'
import type { InspectorTab } from '@/components/projects/ProjectChatInspector'
import type { SpecSurfaceMode } from '@/components/chat/SpecSurface'
import type { FormalSpecification } from '@/lib/agent/spec/types'
import type { ChatMode } from '@/lib/agent/prompt-library'
import type { PlanStatus } from '@/lib/chat/planDraft'
import type { TracePersistenceStatus } from '@/hooks/useRunEventBuffer'
import type { GeneratedPlanArtifact, PlanningAnswer, PlanningQuestion } from '@/lib/planning/types'
import type { PlanningSessionDebugSummary } from '@/components/plan/PlanningSessionDebugCard'
import type { RightPanelTabId } from '@/components/panels/RightPanel'
import type { InspectorTabDef } from '@/components/panels/RightPanel'
import { RightPanel } from '@/components/panels/RightPanel'
import { ProjectChatPanel } from '@/components/projects/ProjectChatPanel'
import {
  InspectorPlanContent,
  InspectorRunContent,
  InspectorMemoryContent,
  InspectorEvalsContent,
} from '@/components/projects/ProjectChatInspector'
import { ArtifactPanel } from '@/components/artifacts/ArtifactPanel'

type PlanningSessionView = {
  sessionId: string
  status: string
  questions: PlanningQuestion[]
  answers: PlanningAnswer[]
  generatedPlan?: GeneratedPlanArtifact
} | null

interface InlineRateLimitError {
  title: string
  description: string
}

export interface WorkbenchRightPanelProps {
  projectId: Id<'projects'>
  activeTab: RightPanelTabId
  onTabChange: (tab: RightPanelTabId) => void

  // Chat props
  activeChatId?: Id<'chats'>
  activeChatPlanStatus?: PlanStatus
  activeChatPlanUpdatedAt?: number
  activeChatPlanLastGeneratedAt?: number
  chatMessages: Message[]
  runEvents?: PersistedRunEventInfo[]
  chatMode: ChatMode
  architectBrainstormEnabled: boolean
  onArchitectBrainstormEnabledChange: (enabled: boolean) => void
  onModeChange: (mode: ChatMode) => void
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
  isStreaming: boolean
  onStopStreaming: () => void
  filePaths: string[]
  model?: string
  onModelChange: (model: string) => void
  availableModels: AvailableModel[]
  variant: string
  onVariantChange: (variant: string) => void
  supportsReasoning: boolean
  inlineRateLimitError: InlineRateLimitError | null
  hasProvider: boolean
  oversightLevel: 'review' | 'autopilot'
  onOversightLevelChange: (level: 'review' | 'autopilot') => void
  isMobileLayout: boolean
  isInspectorOpen: boolean
  inspectorTab: InspectorTab
  planningSession: PlanningSessionView
  planningCurrentQuestion: PlanningQuestion | null
  onStartPlanningIntake: () => Promise<unknown>
  onAnswerPlanningQuestion: (input: {
    questionId: string
    selectedOptionId?: string
    freeformValue?: string
    source: 'suggestion' | 'freeform'
  }) => Promise<unknown>
  onClearPlanningIntake: () => Promise<unknown>
  onInspectorOpenChange: (open: boolean) => void
  onInspectorTabChange: (tab: InspectorTab) => void
  liveSteps: LiveProgressStep[]
  tracePersistenceStatus: TracePersistenceStatus
  onOpenFile: (path: string) => void
  onOpenArtifacts: () => void
  currentSpec: FormalSpecification | null
  onSpecClick: () => void
  onPlanClick: () => void
  onResumeRuntimeSession: (sessionID: string) => Promise<void>
  snapshotEvents: Array<{
    _id?: string
    type: string
    content?: string
    createdAt?: number
    snapshot?: { hash?: string; step?: number; files?: string[] }
  }>
  subagentToolCalls: ToolCallInfo[]
  planDraft: string
  onPlanDraftChange: (draft: string) => void
  onSavePlanDraft: () => void
  isSavingPlanDraft: boolean
  memoryBank: string | null | undefined
  onSaveMemoryBank: (content: string) => Promise<void>
  lastUserPrompt: string | null
  lastAssistantReply: string | null
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
  contextualPrompt: string | null
  onContextualPromptHandled: () => void
  onToggleInspector: () => void
  onOpenHistory: () => void
  onOpenShare: () => void
  onOpenPreview: () => void
  onResetWorkspace: () => void
  onNewChat: () => void
  onPlanReview: () => void
  onPlanApprove: () => void
  onBuildFromPlan: () => void
  planApproveDisabled: boolean
  planBuildDisabled: boolean
  showInlinePlanReview: boolean
  pendingSpec: FormalSpecification | null
  onSpecApprove: (spec?: FormalSpecification) => void
  onSpecEdit: () => void
  onSpecCancel: () => void
  showInlineSpecReview: boolean
  specSurfaceMode: SpecSurfaceMode
  onCloseSpecSurface: () => void
  onEditPendingSpec: (spec: FormalSpecification) => void
  onExecutePendingSpec: (spec: FormalSpecification) => void
  openSpecApproval: () => void
  openSpecInspect: () => void

  // Plan content
  planStatus?: PlanStatus
  canApprovePlan: boolean
  canBuildPlan: boolean
  lastSavedAt?: number
  lastGeneratedAt?: number

  // Inspector data
  planningDebug: PlanningSessionDebugSummary | null
}

export function WorkbenchRightPanel({
  projectId,
  activeTab,
  onTabChange,
  activeChatId,
  activeChatPlanStatus,
  activeChatPlanUpdatedAt,
  activeChatPlanLastGeneratedAt,
  chatMessages,
  runEvents,
  chatMode,
  architectBrainstormEnabled,
  onArchitectBrainstormEnabledChange,
  onModeChange,
  onSendMessage,
  onSuggestedAction,
  isStreaming,
  onStopStreaming,
  filePaths,
  model,
  onModelChange,
  availableModels,
  variant,
  onVariantChange,
  supportsReasoning,
  inlineRateLimitError,
  hasProvider,
  oversightLevel,
  onOversightLevelChange,
  isMobileLayout,
  isInspectorOpen,
  inspectorTab,
  planningSession,
  planningCurrentQuestion,
  onStartPlanningIntake,
  onAnswerPlanningQuestion,
  onClearPlanningIntake,
  onInspectorOpenChange,
  onInspectorTabChange,
  liveSteps,
  tracePersistenceStatus,
  onOpenFile,
  onOpenArtifacts,
  currentSpec,
  onSpecClick,
  onPlanClick,
  onResumeRuntimeSession,
  snapshotEvents,
  subagentToolCalls,
  planDraft,
  onPlanDraftChange,
  onSavePlanDraft,
  isSavingPlanDraft,
  memoryBank,
  onSaveMemoryBank,
  lastUserPrompt,
  lastAssistantReply,
  onRunEvalScenario,
  contextualPrompt,
  onContextualPromptHandled,
  onToggleInspector,
  onOpenHistory,
  onOpenShare,
  onOpenPreview,
  onResetWorkspace,
  onNewChat,
  onPlanReview,
  onPlanApprove,
  onBuildFromPlan,
  planApproveDisabled,
  planBuildDisabled,
  showInlinePlanReview,
  pendingSpec,
  onSpecApprove,
  onSpecEdit,
  onSpecCancel,
  showInlineSpecReview,
  specSurfaceMode,
  onCloseSpecSurface,
  onEditPendingSpec,
  onExecutePendingSpec,
  openSpecApproval: _openSpecApproval,
  openSpecInspect: _openSpecInspect,
  planStatus,
  canApprovePlan: _canApprovePlan,
  canBuildPlan: _canBuildPlan,
  lastSavedAt,
  lastGeneratedAt,
  planningDebug,
}: WorkbenchRightPanelProps) {
  const isDrawerOpen = activeTab !== 'chat'
  const activeInspectorTab = isDrawerOpen ? activeTab : undefined

  const inspectorTabs: InspectorTabDef[] = [
    { id: 'plan', label: 'Plan' },
    { id: 'review', label: 'Review' },
    { id: 'run', label: 'Run' },
    { id: 'comments', label: 'Notes' },
  ]

  const getInspectorContent = () => {
    switch (activeTab) {
      case 'plan':
        return (
          <InspectorPlanContent
            planDraft={planDraft}
            planStatus={planStatus}
            onPlanDraftChange={onPlanDraftChange}
            onSavePlanDraft={onSavePlanDraft}
            onApprovePlan={onPlanApprove}
            onBuildFromPlan={onBuildFromPlan}
            isSavingPlanDraft={isSavingPlanDraft}
            lastSavedAt={lastSavedAt}
            lastGeneratedAt={lastGeneratedAt}
            approveDisabled={planApproveDisabled}
            buildDisabled={planBuildDisabled}
          />
        )
      case 'review':
        return <ArtifactPanel projectId={projectId} chatId={activeChatId} position="right" />
      case 'run':
        return (
          <InspectorRunContent
            chatId={activeChatId}
            liveSteps={liveSteps}
            isStreaming={isStreaming}
            tracePersistenceStatus={tracePersistenceStatus}
            onOpenFile={onOpenFile}
            onOpenArtifacts={onOpenArtifacts}
            currentSpec={currentSpec}
            planStatus={planStatus}
            planDraft={planDraft}
            onSpecClick={onSpecClick}
            onPlanClick={onPlanClick}
            onResumeRuntimeSession={onResumeRuntimeSession}
            planningDebug={planningDebug}
            snapshotEvents={snapshotEvents}
            subagentToolCalls={subagentToolCalls}
          />
        )
      case 'comments':
        return (
          <div className="flex h-full flex-col overflow-hidden">
            <div className="surface-1 border-b border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Notes — memory, evals
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              <InspectorMemoryContent memoryBank={memoryBank} onSaveMemoryBank={onSaveMemoryBank} />
              <InspectorEvalsContent
                projectId={projectId}
                chatId={activeChatId}
                lastUserPrompt={lastUserPrompt}
                lastAssistantReply={lastAssistantReply}
                onRunEvalScenario={onRunEvalScenario}
              />
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <RightPanel
      chatContent={
        <ProjectChatPanel
          projectId={projectId}
          oversightLevel={oversightLevel}
          onOversightLevelChange={onOversightLevelChange}
          activeChatId={activeChatId}
          activeChatPlanStatus={activeChatPlanStatus}
          activeChatPlanUpdatedAt={activeChatPlanUpdatedAt}
          activeChatPlanLastGeneratedAt={activeChatPlanLastGeneratedAt}
          activeChatExists={Boolean(activeChatId)}
          chatMessages={chatMessages}
          runEvents={runEvents}
          runHistoryCount={(runEvents ?? []).length}
          chatMode={chatMode}
          architectBrainstormEnabled={architectBrainstormEnabled}
          onArchitectBrainstormEnabledChange={onArchitectBrainstormEnabledChange}
          onModeChange={onModeChange}
          onSendMessage={onSendMessage}
          onSuggestedAction={onSuggestedAction}
          isStreaming={isStreaming}
          onStopStreaming={onStopStreaming}
          filePaths={filePaths}
          model={model}
          onModelChange={onModelChange}
          availableModels={availableModels}
          variant={variant}
          onVariantChange={onVariantChange}
          supportsReasoning={supportsReasoning}
          attachmentsEnabled={true}
          inlineRateLimitError={inlineRateLimitError}
          hasProvider={hasProvider}
          onToggleInspector={onToggleInspector}
          onOpenHistory={onOpenHistory}
          onOpenShare={onOpenShare}
          onOpenPreview={onOpenPreview}
          onResetWorkspace={onResetWorkspace}
          resetWorkspaceLabel="Clear Local Workspace"
          onNewChat={onNewChat}
          planDraft={planDraft}
          onPlanReview={onPlanReview}
          onPlanApprove={onPlanApprove}
          onBuildFromPlan={onBuildFromPlan}
          planApproveDisabled={planApproveDisabled}
          planBuildDisabled={planBuildDisabled}
          showInlinePlanReview={showInlinePlanReview}
          pendingSpec={pendingSpec}
          onSpecApprove={onSpecApprove}
          onSpecEdit={onSpecEdit}
          onSpecCancel={onSpecCancel}
          showInlineSpecReview={showInlineSpecReview}
          specSurfaceMode={specSurfaceMode}
          onCloseSpecSurface={onCloseSpecSurface}
          onEditPendingSpec={onEditPendingSpec}
          onExecutePendingSpec={onExecutePendingSpec}
          isMobileLayout={isMobileLayout}
          isInspectorOpen={isInspectorOpen}
          inspectorTab={inspectorTab}
          planningSession={planningSession}
          planningCurrentQuestion={planningCurrentQuestion}
          onStartPlanningIntake={onStartPlanningIntake}
          onAnswerPlanningQuestion={onAnswerPlanningQuestion}
          onClearPlanningIntake={onClearPlanningIntake}
          onInspectorOpenChange={onInspectorOpenChange}
          onInspectorTabChange={onInspectorTabChange}
          liveSteps={liveSteps}
          tracePersistenceStatus={tracePersistenceStatus}
          onOpenFile={onOpenFile}
          onOpenArtifacts={onOpenArtifacts}
          currentSpec={currentSpec}
          onSpecClick={onSpecClick}
          onPlanClick={onPlanClick}
          onResumeRuntimeSession={onResumeRuntimeSession}
          snapshotEvents={snapshotEvents}
          subagentToolCalls={subagentToolCalls}
          onPlanDraftChange={onPlanDraftChange}
          onSavePlanDraft={onSavePlanDraft}
          isSavingPlanDraft={isSavingPlanDraft}
          memoryBank={memoryBank}
          onSaveMemoryBank={onSaveMemoryBank}
          lastUserPrompt={lastUserPrompt}
          onRunEvalScenario={onRunEvalScenario}
          renderInspectorInline={false}
          contextualPrompt={contextualPrompt}
          onContextualPromptHandled={onContextualPromptHandled}
        />
      }
      inspectorContent={getInspectorContent()}
      inspectorTabs={inspectorTabs}
      activeInspectorTab={activeInspectorTab}
      onInspectorTabChange={(tab) => onTabChange(tab as RightPanelTabId)}
      isInspectorOpen={isDrawerOpen}
      onInspectorToggle={() => onTabChange('chat')}
    />
  )
}
