'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import {
  AlertTriangle,
  Bot,
  History,
  MoreHorizontal,
  RotateCcw,
  MessageSquarePlus,
} from 'lucide-react'
import Link from 'next/link'
import { ChatActionBar } from '@/components/chat/ChatActionBar'
import { ChatInput } from '@/components/chat/ChatInput'
import { MessageList } from '@/components/chat/MessageList'
import type { AvailableModel } from '@/components/chat/ModelSelector'
import { PermissionDialog } from '@/components/chat/PermissionDialog'
import { ProjectChatInspector, type InspectorTab } from '@/components/projects/ProjectChatInspector'
import { SpecPanel } from '@/components/plan/SpecPanel'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { ToolCallInfo, Message } from '@/components/chat/types'
import type { LiveProgressStep } from '@/components/chat/live-run-utils'
import type { FormalSpecification, SpecTier } from '@/lib/agent/spec/types'
import type { ChatMode } from '@/lib/agent/prompt-library'
import type { PlanStatus } from '@/lib/chat/planDraft'
import type { TracePersistenceStatus } from '@/hooks/useRunEventBuffer'

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
  chatMode: ChatMode
  architectBrainstormEnabled: boolean
  onArchitectBrainstormEnabledChange: (enabled: boolean) => void
  onModeChange: (mode: ChatMode) => void
  onSendMessage: (
    content: string,
    mode: ChatMode,
    contextFiles?: string[],
    options?: { approvedPlanExecution?: boolean }
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
  specTier: SpecTier | 'auto'
  onSpecTierChange: (tier: SpecTier | 'auto') => void
  inlineRateLimitError: InlineRateLimitError | null
  onToggleInspector: () => void
  onOpenHistory: () => void
  onOpenShare: () => void
  previewUrl?: string | null
  onOpenPreview?: () => void
  onResetWorkspace: () => void
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
  currentSpecTier: SpecTier | 'auto'
  isSpecPanelOpen: boolean
  onCloseSpecPanel: () => void
  onEditPendingSpec: (spec: FormalSpecification) => void
  onExecutePendingSpec: (spec: FormalSpecification) => void
  isMobileLayout: boolean
  isInspectorOpen: boolean
  inspectorTab: InspectorTab
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
  specTier,
  onSpecTierChange,
  inlineRateLimitError,
  onToggleInspector,
  onOpenHistory,
  onOpenShare,
  previewUrl,
  onOpenPreview,
  onResetWorkspace,
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
  currentSpecTier,
  isSpecPanelOpen,
  onCloseSpecPanel,
  onEditPendingSpec,
  onExecutePendingSpec,
  isMobileLayout,
  isInspectorOpen,
  inspectorTab,
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

  return (
    <div
      className={cn(
        'surface-1 relative flex h-full flex-col border-border',
        isMobileLayout ? 'border-t' : 'border-l'
      )}
    >
      <div className="panel-header-compact flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <Bot className="h-3 w-3 text-primary" />
          <span>Chat</span>
        </div>

        {isStreaming && (
          <div
            className="ml-1 flex h-2 w-2 animate-pulse rounded-full bg-primary"
            title="Agent running"
          />
        )}

        <div className="ml-auto flex items-center gap-1">
          {onNewChat && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 rounded-none p-0 text-muted-foreground hover:text-foreground"
              onClick={onNewChat}
              aria-label="New chat"
              title="New chat"
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onToggleInspector}
            className="h-6 rounded-none px-2 font-mono text-[10px] uppercase tracking-wide"
            aria-label="Toggle review panel"
          >
            Review
          </Button>

          {previewUrl && onOpenPreview ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onOpenPreview}
              className="h-6 rounded-none px-2 font-mono text-[10px] uppercase tracking-wide"
              aria-label="Open runtime preview"
            >
              Preview
            </Button>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 rounded-none p-0"
                aria-label="Chat more actions"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-none border-border font-mono">
              <DropdownMenuItem
                onClick={onToggleInspector}
                className="rounded-none text-xs uppercase tracking-wide"
              >
                Inspector
              </DropdownMenuItem>
              {activeChatExists && (
                <DropdownMenuItem
                  className="rounded-none text-xs uppercase tracking-wide"
                  onClick={onOpenShare}
                >
                  Share
                </DropdownMenuItem>
              )}
              {activeChatExists && (
                <DropdownMenuItem
                  onClick={onOpenHistory}
                  className="rounded-none text-xs uppercase tracking-wide"
                >
                  History ({chatMessages.length})
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={onResetWorkspace}
                className="rounded-none text-xs uppercase tracking-wide"
              >
                Reset Workspace
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {activeChatExists && latestRecoverableCheckpoint?.sessionID && !isStreaming ? (
        <div className="border-b border-border bg-primary/5 px-3 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0 space-y-0.5 font-mono text-[11px]">
              <div className="flex items-center gap-1.5 uppercase tracking-wide text-primary">
                <History className="h-3.5 w-3.5" />
                <span>Resume Available</span>
              </div>
              <div className="text-muted-foreground">
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

      <div className="flex flex-1 flex-col overflow-hidden">
        <MessageList
          messages={chatMessages}
          isStreaming={isStreaming}
          onSuggestedAction={onSuggestedAction}
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
        specTier={currentSpecTier}
      />

      <PermissionDialog />

      <ChatInput
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
        specTier={specTier}
        onSpecTierChange={onSpecTierChange}
        contextualPrompt={contextualPrompt}
        onContextualPromptHandled={onContextualPromptHandled}
      />

      <AnimatePresence>
        {pendingSpec && isSpecPanelOpen ? (
          <>
            <motion.button
              type="button"
              aria-label="Close spec editor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseSpecPanel}
              className="absolute inset-0 z-20 bg-background/55 backdrop-blur-[1px]"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="shadow-sharp-lg absolute inset-x-0 bottom-0 z-30 max-h-[90vh] border-t border-border bg-background sm:inset-x-3 sm:bottom-3 sm:border"
            >
              <SpecPanel
                spec={pendingSpec}
                onEdit={onEditPendingSpec}
                onExecute={onExecutePendingSpec}
                onCancel={onSpecCancel}
                onClose={onCloseSpecPanel}
              />
            </motion.div>
          </>
        ) : null}

        {renderInspectorInline ? (
          <ProjectChatInspector
            projectId={projectId}
            chatId={activeChatId}
            isMobileLayout={isMobileLayout}
            isOpen={isInspectorOpen}
            tab={inspectorTab}
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
        ) : null}
      </AnimatePresence>
    </div>
  )
}
