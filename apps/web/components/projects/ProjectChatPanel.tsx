'use client'

import { useCallback } from 'react'
import { motion } from 'framer-motion'
import type { Id } from '@convex/_generated/dataModel'
import { AlertTriangle, History, RotateCcw } from 'lucide-react'
import { MoreHorizontal as IconOverflow, MessageSquarePlus as IconNewChat } from 'lucide-react'
import Link from 'next/link'
import { ChatActionBar } from '@/components/chat/ChatActionBar'
import { ChatInput } from '@/components/chat/ChatInput'
import { MessageList } from '@/components/chat/MessageList'
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
import { findLatestRecoverableCheckpoint } from '@/components/chat/runtime-checkpoints'

interface ProjectChatPanelProps {
  projectId: Id<'projects'>
}

export function ProjectChatPanel({ projectId }: ProjectChatPanelProps) {
  const {
    activeChatId,
    activeChatExists,
    chatMessages,
    runEvents,
    latestRunReceipt,
    liveSteps,
    inlineRateLimitError,
    isStreaming,
    lastUserPrompt,
    currentSpec,
    model,
    availableModels,
    supportsReasoning,
    hasProvider,
    filePaths,
    planDraft,
    planApproveDisabled,
    planBuildDisabled,
    showInlinePlanReview,
    planStatus,
    planningSession,
    onSendMessage,
    onSuggestedAction,
    onModeChange,
    onStopStreaming,
    onResumeRuntimeSession,
    onPlanApprove,
    onBuildFromPlan,
    onResetWorkspace,
    onNewChat,
    onToggleInspector,
    onOpenHistory,
    openRightPanelTab,
    executionSession,
    runtimeCheckpoints,
  } = useWorkspaceRuntime()

  // Store reads — these replace the equivalent props
  const chatMode = useChatSessionStore((s) => s.chatMode)
  const architectBrainstormEnabled = useChatSessionStore((s) => s.architectBrainstormEnabled)
  const contextualPrompt = useChatSessionStore((s) => s.contextualPrompt)
  const reasoningVariant = useChatSessionStore((s) => s.reasoningVariant)
  const specSurfaceMode = useWorkspaceUiStore((s) => s.specSurfaceMode)
  const isMobileLayout = useWorkspaceUiStore((s) => s.isMobileLayout)

  // Callbacks computed from stores — no prop needed
  const onArchitectBrainstormEnabledChange = useChatSessionStore(
    (s) => s.setArchitectBrainstormEnabled
  )
  const setUiSelectedModel = useChatSessionStore((s) => s.setUiSelectedModel)
  const onModelChange = useCallback(
    (model: string) => setUiSelectedModel({ modelId: model }),
    [setUiSelectedModel]
  )
  const onVariantChange = useChatSessionStore((s) => s.setReasoningVariant)
  const onPlanReview = () => openRightPanelTab('context')
  const onCloseSpecSurface = () => useWorkspaceUiStore.getState().setSpecSurfaceMode('closed')
  const onOpenShare = () => useWorkspaceUiStore.getState().setShareDialogOpen(true)
  const onContextualPromptHandled = () => useChatSessionStore.getState().setContextualPrompt(null)

  const runHistoryCount = (runEvents ?? []).length

  const planApproval = derivePlanApprovalState({
    planningSession: planningSession as never,
  })

  const latestRecoverableCheckpoint = findLatestRecoverableCheckpoint(runtimeCheckpoints)

  const activeRole = getChatModeSurfacePresentation(chatMode)
  const sessionStatusLabel = executionSession?.statusLabel ?? activeRole.label
  const sessionSummary = executionSession?.summary

  return (
    <div
      className={cn(
        'relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-card',
        isMobileLayout ? 'border-t border-foreground' : ''
      )}
    >
      <div className="relative flex h-9 shrink-0 items-center justify-between border-b border-foreground bg-secondary px-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 font-mono text-[11px] font-medium uppercase tracking-[0.24em] text-foreground">
            Agent Thread · {sessionStatusLabel}
          </span>
          {sessionSummary ? (
            <span className="min-w-0 truncate font-mono text-[10px] text-muted-foreground">
              {sessionSummary}
            </span>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 rounded-none p-0"
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
        <div className="bg-primary/5 border-b border-border px-3 py-2">
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
              className="border-primary/40 h-7 rounded-none px-2 font-mono text-[10px] uppercase tracking-wide"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Recover Run
            </Button>
          </div>
        </div>
      ) : null}

      {!hasProvider && chatMessages.length === 0 ? (
        <div className="px-3 pb-2">
          <Alert className="border-primary/40 bg-primary/5 rounded-none">
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
            className="border-destructive/70 bg-destructive/5 rounded-none"
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
          latestRunReceipt={latestRunReceipt}
          userIntent={lastUserPrompt}
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
    </div>
  )
}
