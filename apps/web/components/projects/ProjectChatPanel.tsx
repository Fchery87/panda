'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { AlertTriangle, History, RotateCcw } from 'lucide-react'
import { IconOverflow, IconNewChat } from '@/components/ui/icons'
import { OversightToggle } from '@/components/chat/OversightToggle'
import Link from 'next/link'
import { ChatActionBar } from '@/components/chat/ChatActionBar'
import { ChatInput } from '@/components/chat/ChatInput'
import { MessageList } from '@/components/chat/MessageList'
import type { AvailableModel } from '@/components/chat/ModelSelector'
import { ProjectChatInspector, type InspectorTab } from '@/components/projects/ProjectChatInspector'
import { SpecSurface, type SpecSurfaceMode } from '@/components/chat/SpecSurface'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { PersistedRunEventInfo, ToolCallInfo, Message } from '@/components/chat/types'
import type { LiveProgressStep } from '@/components/chat/live-run-utils'
import type { FormalSpecification } from '@/lib/agent/spec/types'
import type { ChatMode } from '@/lib/agent/prompt-library'
import type { PlanStatus } from '@/lib/chat/planDraft'
import type { TracePersistenceStatus } from '@/hooks/useRunEventBuffer'
import { getChatModeSurfacePresentation } from '@/lib/chat/chat-mode-surface'
import type { GeneratedPlanArtifact, PlanningAnswer, PlanningQuestion } from '@/lib/planning/types'

type PlanningSessionView = {
  sessionId: string
  status: string
  questions: PlanningQuestion[]
  answers: PlanningAnswer[]
  generatedPlan?: GeneratedPlanArtifact
} | null

// Removed ChatInspectorTab definition

type SnapshotEvent = {
  _id?: string
  type: string
  content?: string
  createdAt?: number
  snapshot?: {
    hash?: string
    step?: number
    files?: string[]
  }
}

interface InlineRateLimitError {
  title: string
  description: string
}

interface ProjectChatPanelProps {
  projectId: Id<'projects'>
  activeChatId?: Id<'chats'>
  activeChatPlanStatus?: PlanStatus
  activeChatPlanUpdatedAt?: number
  activeChatPlanLastGeneratedAt?: number
  activeChatExists: boolean
  chatMessages: Message[]
  runEvents?: PersistedRunEventInfo[]
  runHistoryCount?: number
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
  attachmentsEnabled?: boolean
  inlineRateLimitError: InlineRateLimitError | null
  onToggleInspector: () => void
  onOpenHistory: () => void
  onOpenShare: () => void
  onOpenPreview?: () => void
  onResetWorkspace: () => void
  resetWorkspaceLabel?: string
  onNewChat?: () => void
  planDraft: string
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
  oversightLevel: 'review' | 'autopilot'
  onOversightLevelChange: (level: 'review' | 'autopilot') => void
  isMobileLayout: boolean
  isInspectorOpen: boolean
  inspectorTab: InspectorTab
  planningSession: PlanningSessionView
  planningCurrentQuestion: PlanningQuestion | null
  onStartPlanningIntake: () => Promise<unknown> | unknown
  onAnswerPlanningQuestion: (input: {
    questionId: string
    selectedOptionId?: string
    freeformValue?: string
    source: 'suggestion' | 'freeform'
  }) => Promise<unknown> | unknown
  onClearPlanningIntake: () => Promise<unknown> | unknown
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
  snapshotEvents: SnapshotEvent[]
  subagentToolCalls: ToolCallInfo[]
  onPlanDraftChange: (value: string) => void
  onSavePlanDraft: () => void
  isSavingPlanDraft: boolean
  memoryBank: string | null | undefined
  onSaveMemoryBank: (content: string) => Promise<void>
  lastUserPrompt?: string | null
  lastAssistantReply?: string | null
  onRunEvalScenario?: (scenario: {
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
  renderInspectorInline?: boolean
  contextualPrompt?: string | null
  onContextualPromptHandled?: () => void
}

export function ProjectChatPanel({
  projectId,
  activeChatId,
  activeChatPlanStatus,
  activeChatPlanUpdatedAt,
  activeChatPlanLastGeneratedAt,
  activeChatExists,
  chatMessages,
  runEvents,
  runHistoryCount = 0,
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
  attachmentsEnabled = false,
  inlineRateLimitError,
  onToggleInspector,
  onOpenHistory,
  onOpenShare,
  onOpenPreview,
  onResetWorkspace,
  resetWorkspaceLabel = 'Reset Workspace',
  onNewChat,
  planDraft,
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
  onPlanDraftChange,
  onSavePlanDraft,
  isSavingPlanDraft,
  memoryBank,
  onSaveMemoryBank,
  lastUserPrompt,
  lastAssistantReply,
  onRunEvalScenario,
  renderInspectorInline = true,
  contextualPrompt,
  onContextualPromptHandled,
}: ProjectChatPanelProps) {
  const runtimeCheckpoints = useQuery(
    api.agentRuns.listRuntimeCheckpoints,
    activeChatId ? { chatId: activeChatId, limit: 6 } : 'skip'
  ) as
    | Array<{
        _id: string
        reason?: 'step' | 'complete' | 'error'
        savedAt?: number
        sessionID?: string
      }>
    | undefined

  const latestRecoverableCheckpoint = (runtimeCheckpoints ?? []).find(
    (checkpoint) => checkpoint.reason !== 'complete' && typeof checkpoint.sessionID === 'string'
  )

  const inspectorPanel = (
    <ProjectChatInspector
      projectId={projectId}
      chatId={activeChatId}
      isMobileLayout={isMobileLayout}
      isOpen={isInspectorOpen}
      tab={inspectorTab}
      planningSession={planningSession}
      planningCurrentQuestion={planningCurrentQuestion}
      onStartPlanningIntake={onStartPlanningIntake}
      onAnswerPlanningQuestion={onAnswerPlanningQuestion}
      onClearPlanningIntake={onClearPlanningIntake}
      onOpenChange={onInspectorOpenChange}
      onTabChange={onInspectorTabChange}
      liveSteps={liveSteps}
      isStreaming={isStreaming}
      tracePersistenceStatus={tracePersistenceStatus}
      onOpenFile={onOpenFile}
      onOpenArtifacts={onOpenArtifacts}
      currentSpec={currentSpec}
      planStatus={activeChatPlanStatus}
      planDraft={planDraft}
      onSpecClick={onSpecClick}
      onPlanClick={onPlanClick}
      onResumeRuntimeSession={onResumeRuntimeSession}
      snapshotEvents={snapshotEvents}
      subagentToolCalls={subagentToolCalls}
      onPlanDraftChange={onPlanDraftChange}
      onSavePlanDraft={onSavePlanDraft}
      onApprovePlan={onPlanApprove}
      onBuildFromPlan={onBuildFromPlan}
      isSavingPlanDraft={isSavingPlanDraft}
      lastSavedAt={activeChatPlanUpdatedAt ?? null}
      lastGeneratedAt={activeChatPlanLastGeneratedAt ?? null}
      approveDisabled={planApproveDisabled}
      buildDisabled={planBuildDisabled}
      memoryBank={memoryBank}
      onSaveMemoryBank={onSaveMemoryBank}
      lastUserPrompt={lastUserPrompt}
      lastAssistantReply={lastAssistantReply}
      onRunEvalScenario={onRunEvalScenario}
    />
  )
  const activeRole = getChatModeSurfacePresentation(chatMode)

  return (
    <div
      className={cn(
        'surface-1 relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden border-border',
        isMobileLayout ? 'border-t' : 'border-l'
      )}
    >
      <div className="relative flex shrink-0 items-center justify-between border-b border-border bg-muted/30 px-3 py-2">
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.24em] text-foreground">
          Panda · {activeRole.label}
        </span>

        <div className="flex items-center gap-1.5">
          <OversightToggle
            level={oversightLevel}
            onChange={onOversightLevelChange}
            disabled={isStreaming}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 rounded-none p-0"
                aria-label="Chat actions"
              >
                <IconOverflow className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-none border-border font-mono">
              {onNewChat && (
                <DropdownMenuItem
                  onClick={onNewChat}
                  className="rounded-none text-xs uppercase tracking-wide"
                >
                  <IconNewChat className="mr-2 h-3.5 w-3.5" />
                  New Chat
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={onToggleInspector}
                className="rounded-none text-xs uppercase tracking-wide"
              >
                Review
              </DropdownMenuItem>
              {onOpenPreview && (
                <DropdownMenuItem
                  onClick={onOpenPreview}
                  className="rounded-none text-xs uppercase tracking-wide"
                >
                  Preview
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={onOpenShare}
                className="rounded-none text-xs uppercase tracking-wide"
              >
                Share
              </DropdownMenuItem>
              {activeChatExists && (
                <DropdownMenuItem
                  onClick={onOpenHistory}
                  className="rounded-none text-xs uppercase tracking-wide"
                >
                  Run History ({runHistoryCount})
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={onResetWorkspace}
                className="rounded-none text-xs uppercase tracking-wide"
              >
                {resetWorkspaceLabel}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Streaming accent line */}
        {isStreaming && (
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            className="absolute bottom-0 left-0 right-0 h-0.5 origin-left bg-primary"
            style={{
              background: 'linear-gradient(90deg, transparent, hsl(var(--primary)), transparent)',
              animation: 'streaming-pulse 1.5s ease-in-out infinite',
            }}
          />
        )}
      </div>

      <style jsx>{`
        @keyframes streaming-pulse {
          0%,
          100% {
            opacity: 0.5;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>

      {activeChatExists && latestRecoverableCheckpoint?.sessionID && !isStreaming ? (
        <div className="border-b border-border bg-primary/5 px-3 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0 space-y-0.5 font-mono text-[11px]">
              <div className="flex items-center gap-1.5 uppercase tracking-wide text-primary">
                <History className="h-3.5 w-3.5" />
                <span>Resume Available</span>
              </div>
              <div className="text-muted-foreground [overflow-wrap:anywhere]">
                {latestRecoverableCheckpoint.savedAt
                  ? `Recover the latest paused run from ${new Date(
                      latestRecoverableCheckpoint.savedAt
                    ).toLocaleString()}.`
                  : 'Recover the latest paused run for this chat.'}
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onResumeRuntimeSession(latestRecoverableCheckpoint.sessionID!)}
              className="h-7 rounded-none border-primary/40 px-2 font-mono text-[10px] uppercase tracking-wide"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Recover Run
            </Button>
          </div>
        </div>
      ) : null}

      {inlineRateLimitError ? (
        <div className="px-3 pb-2">
          <Alert
            variant="destructive"
            className="rounded-none border-destructive/70 bg-destructive/5"
          >
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="font-mono text-xs uppercase tracking-wide">
              {inlineRateLimitError.title}
            </AlertTitle>
            <AlertDescription className="space-y-2 font-mono text-xs">
              <p>{inlineRateLimitError.description}</p>
              <div className="flex items-center gap-2">
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-none font-mono text-xs"
                >
                  <Link href="/settings">Open LLM Settings</Link>
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <MessageList
          messages={chatMessages}
          isStreaming={isStreaming}
          onSuggestedAction={onSuggestedAction}
          liveSteps={liveSteps}
          runEvents={runEvents}
          currentSpec={currentSpec}
          pendingSpec={pendingSpec}
          planStatus={activeChatPlanStatus}
          chatMode={chatMode}
        />
      </div>

      <ChatActionBar
        planStatus={activeChatPlanStatus}
        planDraft={planDraft}
        onPlanReview={onPlanReview}
        onPlanApprove={onPlanApprove}
        onBuildFromPlan={onBuildFromPlan}
        planApproveDisabled={planApproveDisabled}
        planBuildDisabled={planBuildDisabled}
        showPlanReview={showInlinePlanReview}
        pendingSpec={pendingSpec}
        onSpecApprove={onSpecApprove}
        onSpecEdit={() => pendingSpec && onSpecEdit()}
        onSpecCancel={onSpecCancel}
        showSpecReview={showInlineSpecReview}
      />
      <ChatInput
        projectId={projectId}
        chatId={activeChatId}
        mode={chatMode}
        onModeChange={onModeChange}
        architectBrainstormEnabled={architectBrainstormEnabled}
        onArchitectBrainstormEnabledChange={onArchitectBrainstormEnabledChange}
        onSendMessage={onSendMessage}
        isStreaming={isStreaming}
        onStopStreaming={onStopStreaming}
        filePaths={filePaths}
        model={model}
        onModelChange={onModelChange}
        availableModels={availableModels}
        variant={variant}
        onVariantChange={onVariantChange}
        supportsReasoning={supportsReasoning}
        attachmentsEnabled={attachmentsEnabled}
        contextualPrompt={contextualPrompt}
        onContextualPromptHandled={onContextualPromptHandled}
      />

      <SpecSurface
        mode={pendingSpec ? specSurfaceMode : 'closed'}
        spec={pendingSpec}
        onApprove={onExecutePendingSpec}
        onEdit={onEditPendingSpec}
        onCancel={onSpecCancel}
        onClose={onCloseSpecSurface}
      />

      <AnimatePresence>{renderInspectorInline ? inspectorPanel : null}</AnimatePresence>

      {!renderInspectorInline ? inspectorPanel : null}
    </div>
  )
}
