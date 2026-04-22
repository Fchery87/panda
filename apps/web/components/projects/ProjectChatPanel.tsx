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
import { ProjectChatInspector } from '@/components/projects/ProjectChatInspector'
import type { InspectorTab } from '@/components/projects/ProjectChatInspector'
import { PlanVerificationDrawer } from '@/components/chat/PlanVerificationDrawer'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useChatSessionStore } from '@/stores/chatSessionStore'
import { useWorkspaceUiStore } from '@/stores/workspaceUiStore'
import { useWorkspaceRuntime } from '@/contexts/WorkspaceRuntimeContext'
import { derivePlanApprovalState } from '@/hooks/usePlanApproval'
import { getChatModeSurfacePresentation } from '@/lib/chat/chat-mode-surface'

interface ProjectChatPanelProps {
  projectId: Id<'projects'>
}

export function ProjectChatPanel({ projectId }: ProjectChatPanelProps) {
  const {
    activeChatId,
    activeChatExists,
    activeChatPlanUpdatedAt,
    activeChatPlanLastGeneratedAt,
    chatMessages,
    runEvents,
    liveSteps,
    snapshotEvents,
    subagentToolCalls,
    inlineRateLimitError,
    lastUserPrompt,
    lastAssistantReply,
    isStreaming,
    currentSpec,
    memoryBank,
    tracePersistenceStatus,
    model,
    availableModels,
    supportsReasoning,
    hasProvider,
    filePaths,
    planDraft,
    isSavingPlanDraft,
    planApproveDisabled,
    planBuildDisabled,
    showInlinePlanReview,
    planStatus,
    planningSession,
    planningCurrentQuestion,
    onSendMessage,
    onSuggestedAction,
    onModeChange,
    onStopStreaming,
    onResumeRuntimeSession,
    onRunEvalScenario,
    onSaveMemoryBank,
    onPlanApprove,
    onBuildFromPlan,
    onPlanDraftChange,
    onSavePlanDraft,
    onStartPlanningIntake,
    onAnswerPlanningQuestion,
    onClearPlanningIntake,
    onOpenFile,
    onResetWorkspace,
    onNewChat,
    onToggleInspector,
    onOpenHistory,
    onOpenPreviewPanel,
    openRightPanelTab,
  } = useWorkspaceRuntime()

  // Store reads — these replace the equivalent props
  const chatMode = useChatSessionStore((s) => s.chatMode)
  const architectBrainstormEnabled = useChatSessionStore((s) => s.architectBrainstormEnabled)
  const oversightLevel = useChatSessionStore((s) => s.oversightLevel)
  const contextualPrompt = useChatSessionStore((s) => s.contextualPrompt)
  const reasoningVariant = useChatSessionStore((s) => s.reasoningVariant)
  const isInspectorOpen = useWorkspaceUiStore((s) => s.isChatInspectorOpen)
  const inspectorTab = useWorkspaceUiStore((s) => s.chatInspectorTab as InspectorTab)
  const specSurfaceMode = useWorkspaceUiStore((s) => s.specSurfaceMode)
  const isMobileLayout = useWorkspaceUiStore((s) => s.isMobileLayout)

  // Callbacks computed from stores — no prop needed
  const onOversightLevelChange = useChatSessionStore((s) => s.setOversightLevel)
  const onArchitectBrainstormEnabledChange = useChatSessionStore(
    (s) => s.setArchitectBrainstormEnabled
  )
  const onModelChange = useChatSessionStore((s) => s.setUiSelectedModel) as unknown as (
    model: string
  ) => void
  const onVariantChange = useChatSessionStore((s) => s.setReasoningVariant)
  const onInspectorOpenChange = useWorkspaceUiStore((s) => s.setChatInspectorOpen)
  const onInspectorTabChange = useWorkspaceUiStore(
    (s) => s.setChatInspectorTab as (tab: InspectorTab) => void
  )
  const onOpenArtifacts = () => openRightPanelTab('review')
  const onPlanReview = () => openRightPanelTab('plan')
  const onPlanClick = () => openRightPanelTab('plan')
  const onSpecClick = () => useWorkspaceUiStore.getState().setSpecSurfaceMode('inspect')
  const onCloseSpecSurface = () => useWorkspaceUiStore.getState().setSpecSurfaceMode('closed')
  const onOpenShare = () => useWorkspaceUiStore.getState().setShareDialogOpen(true)
  const onContextualPromptHandled = () => useChatSessionStore.getState().setContextualPrompt(null)

  const runHistoryCount = (runEvents ?? []).length

  const planApproval = derivePlanApprovalState({
    planningSession: planningSession as never,
  })

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
    (cp) => cp.reason !== 'complete' && typeof cp.sessionID === 'string'
  )

  const inspectorPanel = (
    <ProjectChatInspector
      projectId={projectId}
      chatId={activeChatId}
      isMobileLayout={isMobileLayout}
      isOpen={isInspectorOpen}
      tab={inspectorTab}
      planningSession={planningSession as never}
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
      planStatus={planStatus}
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
              <DropdownMenuItem
                onClick={onNewChat}
                className="rounded-none text-xs uppercase tracking-wide"
              >
                <IconNewChat className="mr-2 h-3.5 w-3.5" />
                New Chat
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onToggleInspector}
                className="rounded-none text-xs uppercase tracking-wide"
              >
                Review
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onOpenPreviewPanel}
                className="rounded-none text-xs uppercase tracking-wide"
              >
                Preview
              </DropdownMenuItem>
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
                Clear Local Workspace
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

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

      {!hasProvider && chatMessages.length === 0 ? (
        <div className="px-3 pb-2">
          <Alert className="rounded-none border-primary/40 bg-primary/5">
            <AlertTitle className="font-mono text-xs uppercase tracking-wide">
              No LLM Provider Configured
            </AlertTitle>
            <AlertDescription className="space-y-2 font-mono text-xs">
              <p>Configure an API key in Settings to start chatting with Panda.</p>
              <div className="flex items-center gap-2">
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-none font-mono text-xs"
                >
                  <Link href="/settings">Open Settings</Link>
                </Button>
              </div>
            </AlertDescription>
          </Alert>
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
          planStatus={planStatus}
          chatMode={chatMode}
        />
      </div>

      <ChatActionBar
        planStatus={planStatus}
        planDraft={planDraft}
        onPlanReview={onPlanReview}
        onPlanApprove={onPlanApprove}
        onBuildFromPlan={onBuildFromPlan}
        planApproveDisabled={planApproveDisabled || !planApproval.canApprove}
        planBuildDisabled={planBuildDisabled || !planApproval.canBuild}
        showPlanReview={showInlinePlanReview || planApproval.status === 'awaiting_review'}
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
        variant={reasoningVariant ?? undefined}
        onVariantChange={onVariantChange}
        supportsReasoning={supportsReasoning}
        attachmentsEnabled={true}
        contextualPrompt={contextualPrompt}
        onContextualPromptHandled={onContextualPromptHandled}
      />

      <PlanVerificationDrawer
        mode={currentSpec ? specSurfaceMode : 'closed'}
        spec={currentSpec}
        onClose={onCloseSpecSurface}
      />

      <AnimatePresence>{inspectorPanel}</AnimatePresence>
    </div>
  )
}
