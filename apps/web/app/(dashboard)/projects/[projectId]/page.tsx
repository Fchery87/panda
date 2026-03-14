'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { motion } from 'framer-motion'
import { AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'

// Components
import { Workbench } from '@/components/workbench/Workbench'
import { Breadcrumb, buildBreadcrumbItems } from '@/components/workbench/Breadcrumb'
import { StatusBar } from '@/components/workbench/StatusBar'
import { ChatInput } from '@/components/chat/ChatInput'
import { PermissionDialog } from '@/components/chat/PermissionDialog'
import { ChatActionBar } from '@/components/chat/ChatActionBar'
import { MessageList } from '@/components/chat/MessageList'
import { mapLatestRunProgressSteps } from '@/components/chat/live-run-utils'
import { ArtifactPanel } from '@/components/artifacts/ArtifactPanel'
import { AgentAutomationDialog } from '@/components/projects/AgentAutomationDialog'
import { ProjectChatInspector } from '@/components/projects/ProjectChatInspector'
import { SpecDrawer } from '@/components/chat/SpecDrawer'
import { SpecPanel } from '@/components/plan/SpecPanel'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import {
  PanelRight,
  PanelRightClose,
  ChevronLeft,
  Bot,
  RotateCcw,
  AlertTriangle,
  Layers,
  MoreHorizontal,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

// UI Components
import { PandaLogo } from '@/components/ui/panda-logo'

// New UX Components
import { CommandPalette } from '@/components/command-palette/CommandPalette'

// Hooks
import { useJobs } from '@/hooks/useJobs'
import { useAgent } from '@/hooks/useAgent'
import { useProjectChatSession } from '@/hooks/useProjectChatSession'
import { useProjectMessageWorkflow } from '@/hooks/useProjectMessageWorkflow'
import { useProjectPlanDraft } from '@/hooks/useProjectPlanDraft'
import { useProjectWorkbenchFiles } from '@/hooks/useProjectWorkbenchFiles'
import { useProjectWorkspaceUi } from '@/hooks/useProjectWorkspaceUi'
import { useSpecDriftDetection } from '@/hooks/useSpecDriftDetection'

import type { Message } from '@/components/chat/types'
import { canApprovePlan, canBuildFromPlan, type PlanStatus } from '@/lib/chat/planDraft'
import { isRateLimitError, getUserFacingAgentError } from '@/lib/chat/error-messages'
import { resolveBackgroundExecutionPolicy } from '@/lib/chat/backgroundExecution'
import type { AgentPolicy } from '@/lib/agent/automationPolicy'
import { normalizeChatMode, type ChatMode } from '@/lib/agent/prompt-library'
import type { LLMProvider } from '@/lib/llm/types'

interface File {
  _id: Id<'files'>
  _creationTime: number
  projectId: Id<'projects'>
  path: string
  content: string
  isBinary: boolean
  updatedAt: number
}

interface Chat {
  _id: Id<'chats'>
  _creationTime: number
  projectId: Id<'projects'>
  title?: string
  mode: ChatMode
  planDraft?: string
  planStatus?: PlanStatus
  planSourceMessageId?: string
  planApprovedAt?: number
  planLastGeneratedAt?: number
  planBuildRunId?: Id<'agentRuns'>
  planUpdatedAt?: number
  createdAt: number
  updatedAt: number
}

interface ConvexMessage {
  _id: Id<'messages'>
  _creationTime: number
  chatId: Id<'chats'>
  role: 'user' | 'assistant' | 'system'
  content: string
  annotations?: Array<Record<string, unknown>>
  createdAt: number
}

interface AgentRunEvent {
  _id: Id<'agentRunEvents'>
  _creationTime: number
  runId: Id<'agentRuns'>
  chatId: Id<'chats'>
  sequence: number
  type: string
  content?: string
  status?: string
  progressCategory?: string
  progressToolName?: string
  progressHasArtifactTarget?: boolean
  targetFilePaths?: string[]
  toolCallId?: string
  toolName?: string
  args?: Record<string, unknown>
  output?: string
  error?: string
  durationMs?: number
  usage?: Record<string, unknown>
  snapshot?: {
    hash: string
    step: number
    files: string[]
    timestamp: number
  }
  createdAt: number
}

type ChatInspectorTab = 'run' | 'plan' | 'memory' | 'evals'

function readAgentPolicyField(
  source: unknown,
  key: 'agentPolicy' | 'agentDefaults'
): AgentPolicy | null | undefined {
  if (!source || typeof source !== 'object') return undefined
  return (source as Record<string, unknown>)[key] as AgentPolicy | null | undefined
}

const FALLBACK_PROVIDER = {} as LLMProvider

export default function ProjectPage() {
  const params = useParams()
  const projectId = params.projectId as Id<'projects'>

  const {
    isArtifactPanelOpen,
    setIsArtifactPanelOpen,
    isChatPanelOpen,
    setIsChatPanelOpen,
    selectedFilePath,
    setSelectedFilePath,
    selectedFileLocation,
    setSelectedFileLocation,
    openTabs,
    setOpenTabs,
    cursorPosition,
    setCursorPosition,
    isMobileLayout,
    isCompactDesktopLayout,
    mobilePrimaryPanel,
    setMobilePrimaryPanel,
    mobileUnreadCount,
    setMobileUnreadCount,
    isMobileKeyboardOpen,
    setIsMobileKeyboardOpen,
    isChatInspectorOpen,
    setIsChatInspectorOpen,
    chatInspectorTab,
    setChatInspectorTab,
    isSpecDrawerOpen,
    setIsSpecDrawerOpen,
    isSpecPanelOpen,
    setIsSpecPanelOpen,
  } = useProjectWorkspaceUi()
  const lastAssistantMessageIdRef = useRef<string | null>(null)

  // Fetch project data
  const project = useQuery(api.projects.get, { id: projectId })

  // Spec Drift Hook
  // The hook internally manages showing toasts via showSpecSyncToast
  useSpecDriftDetection({ projectId })

  // Fetch files
  const files = useQuery(api.files.list, { projectId }) as File[] | undefined

  // Fetch chats
  const chats = useQuery(api.chats.list, { projectId }) as Chat[] | undefined

  // Jobs (Terminal)
  const { isAnyJobRunning } = useJobs(projectId)

  const projectAgentPolicy = readAgentPolicyField(project, 'agentPolicy')
  const createChatMutation = useMutation(api.chats.create)
  const updateChatMutation = useMutation(api.chats.update)
  const {
    settings,
    setActiveChatId,
    activeChat,
    chatMode,
    setChatMode,
    architectBrainstormEnabled,
    setArchitectBrainstormEnabled,
    uiSelectedModel,
    setUiSelectedModel,
    reasoningVariant,
    setReasoningVariant,
    specTier,
    setSpecTier,
    provider,
    selectedModel,
    availableModels,
    supportsReasoning,
  } = useProjectChatSession({
    projectId,
    chats,
    projectAgentPolicy,
  })
  const persistedPlanDraft = activeChat?.planDraft ?? ''

  // Initialize agent hook when activeChat and provider exist
  // Skip the hook if provider is not available - we'll show an error when user tries to send
  const agent = useAgent({
    chatId: activeChat?._id as Id<'chats'>,
    projectId,
    projectName: project?.name,
    projectDescription: project?.description,
    mode: chatMode,
    architectBrainstormEnabled,
    provider: provider ?? FALLBACK_PROVIDER, // Stable fallback - checked before use
    model: selectedModel,
    planDraft: persistedPlanDraft,
    onRunCreated: async ({ runId, approvedPlanExecution }) => {
      if (!approvedPlanExecution || !activeChat?._id) return
      await updateChatMutation({
        id: activeChat._id,
        planBuildRunId: runId,
        planStatus: 'executing',
      })
    },
  })
  const sendAgentMessage = agent.sendMessage

  const { planDraft, setPlanDraft, isSavingPlanDraft, handleSavePlanDraft, handleApprovePlan } =
    useProjectPlanDraft({
      activeChat,
      chatMode,
      architectBrainstormEnabled,
      agentStatus: agent.status,
      agentMessages: agent.messages,
      updateChatMutation,
    })

  const { handleSendMessage, handleSuggestedAction, handleBuildFromPlan, handleModeChange } =
    useProjectMessageWorkflow({
      projectId,
      activeChat,
      chatMode,
      setChatMode,
      planDraft,
      providerAvailable: Boolean(provider),
      createChatMutation,
      updateChatMutation,
      sendAgentMessage,
      setActiveChatId,
      setMobilePrimaryPanel,
    })

  const artifactRecords = useQuery(
    api.artifacts.list,
    activeChat ? { chatId: activeChat._id } : 'skip'
  ) as
    | Array<{
        _id: Id<'artifacts'>
        status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rejected'
      }>
    | undefined
  const pendingArtifactCount = (artifactRecords || []).filter((a) => a.status === 'pending').length

  // Reset workspace handler
  const handleResetWorkspace = useCallback(() => {
    // Stop any running agent
    agent.stop()
    // Clear chat messages
    agent.clear()
    // Clear input
    agent.setInput('')
    // Clear plan draft
    setPlanDraft('')
    // Reset mode to architect
    setChatMode('architect')
    // Close artifact panel
    setIsArtifactPanelOpen(false)
    // Show confirmation
    toast.success('Workspace reset', {
      description: 'Chat, artifacts, and plan draft have been cleared',
    })
  }, [agent, setChatMode, setIsArtifactPanelOpen, setPlanDraft])

  // Auto-open artifact panel when there are pending artifacts in build/code mode
  useEffect(() => {
    const isWriteMode = chatMode === 'build' || chatMode === 'code'
    if (isWriteMode && pendingArtifactCount > 0 && !isArtifactPanelOpen) {
      setIsArtifactPanelOpen(true)
    }
  }, [pendingArtifactCount, chatMode, isArtifactPanelOpen, setIsArtifactPanelOpen])

  // Fetch messages for active chat (fallback when not streaming)
  const convexMessages = useQuery(
    api.messages.list,
    activeChat ? { chatId: activeChat._id } : 'skip'
  ) as ConvexMessage[] | undefined
  const runEvents = useQuery(
    api.agentRuns.listEventsByChat,
    activeChat ? { chatId: activeChat._id, limit: 120 } : 'skip'
  ) as AgentRunEvent[] | undefined

  // Convert agent messages to MessageList format
  const chatMessages: Message[] = useMemo(() => {
    if (!activeChat) {
      return (
        convexMessages?.map((msg) => ({
          _id: msg._id,
          role: msg.role,
          content: msg.content,
          reasoningContent:
            Array.isArray(msg.annotations) &&
            msg.annotations.length > 0 &&
            typeof msg.annotations[0]?.reasoningSummary === 'string'
              ? (msg.annotations[0]?.reasoningSummary as string)
              : undefined,
          annotations:
            Array.isArray(msg.annotations) && msg.annotations.length > 0
              ? {
                  mode: normalizeChatMode(msg.annotations[0]?.mode, chatMode),
                  model: msg.annotations[0]?.model as string | undefined,
                  provider: msg.annotations[0]?.provider as string | undefined,
                  tokenCount: msg.annotations[0]?.tokenCount as number | undefined,
                  promptTokens: msg.annotations[0]?.promptTokens as number | undefined,
                  completionTokens: msg.annotations[0]?.completionTokens as number | undefined,
                  totalTokens: msg.annotations[0]?.totalTokens as number | undefined,
                  tokenSource: msg.annotations[0]?.tokenSource as 'exact' | 'estimated' | undefined,
                  contextWindow: msg.annotations[0]?.contextWindow as number | undefined,
                  contextUsedTokens: msg.annotations[0]?.contextUsedTokens as number | undefined,
                  contextRemainingTokens: msg.annotations[0]?.contextRemainingTokens as
                    | number
                    | undefined,
                  contextUsagePct: msg.annotations[0]?.contextUsagePct as number | undefined,
                  contextSource: msg.annotations[0]?.contextSource as
                    | 'map'
                    | 'provider'
                    | 'fallback'
                    | undefined,
                  reasoningTokens: msg.annotations[0]?.reasoningTokens as number | undefined,
                }
              : undefined,
          toolCalls:
            Array.isArray(msg.annotations) &&
            msg.annotations.length > 0 &&
            Array.isArray(msg.annotations[0]?.toolCalls)
              ? (msg.annotations[0]?.toolCalls as Message['toolCalls'])
              : undefined,
          createdAt: msg.createdAt,
        })) || []
      )
    }

    // Use agent messages when available, converting format
    return agent.messages
      .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
      .map((msg) => ({
        _id: msg.id,
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
        reasoningContent: msg.reasoningContent,
        toolCalls: msg.toolCalls,
        annotations: {
          ...(msg.annotations || {}),
          mode: msg.mode,
        },
        createdAt: msg.createdAt,
      }))
  }, [agent.messages, activeChat, chatMode, convexMessages])

  const replayProgressSteps = useMemo(
    () => mapLatestRunProgressSteps(runEvents ?? []).slice(-24),
    [runEvents]
  )
  const liveRunSteps = useMemo(() => {
    return agent.progressSteps.length > 0 ? agent.progressSteps : replayProgressSteps
  }, [agent.progressSteps, replayProgressSteps])
  const snapshotRunEvents = useMemo(
    () => (runEvents ?? []).filter((event) => event.type === 'snapshot'),
    [runEvents]
  )
  const subagentToolCalls = useMemo(
    () =>
      chatMessages
        .flatMap((message) => message.toolCalls ?? [])
        .filter((call) => call.name === 'task'),
    [chatMessages]
  )
  const latestUserPrompt = useMemo(
    () =>
      [...chatMessages]
        .reverse()
        .find((msg) => msg.role === 'user' && typeof msg.content === 'string' && msg.content.trim())
        ?.content ?? null,
    [chatMessages]
  )
  const latestAssistantReply = useMemo(
    () =>
      [...chatMessages]
        .reverse()
        .find(
          (msg) => msg.role === 'assistant' && typeof msg.content === 'string' && msg.content.trim()
        )?.content ?? null,
    [chatMessages]
  )
  const backgroundExecutionPolicy = useMemo(
    () => resolveBackgroundExecutionPolicy(chatMode),
    [chatMode]
  )
  const inlineRateLimitError = useMemo(() => {
    if (!agent.error || !isRateLimitError(agent.error)) return null
    return getUserFacingAgentError(agent.error)
  }, [agent.error])

  // Note: Inspector no longer auto-opens on agent start - user opens it manually

  const {
    handleFileSelect,
    handleTabClose,
    handleFileCreate,
    handleFileRename,
    handleFileDelete,
    handleEditorSave,
  } = useProjectWorkbenchFiles({
    projectId,
    files,
    selectedFilePath,
    setSelectedFilePath,
    setSelectedFileLocation,
    setCursorPosition,
    setOpenTabs,
    setMobilePrimaryPanel,
  })

  useEffect(() => {
    if (!isMobileLayout || mobilePrimaryPanel === 'chat') {
      setMobileUnreadCount(0)
    }
  }, [isMobileLayout, mobilePrimaryPanel, setMobileUnreadCount])

  useEffect(() => {
    const latestAssistant = [...chatMessages].reverse().find((msg) => msg.role === 'assistant')
    if (!latestAssistant) return

    if (!lastAssistantMessageIdRef.current) {
      lastAssistantMessageIdRef.current = latestAssistant._id
      return
    }

    if (latestAssistant._id !== lastAssistantMessageIdRef.current) {
      lastAssistantMessageIdRef.current = latestAssistant._id
      if (isMobileLayout && mobilePrimaryPanel === 'workspace') {
        setMobileUnreadCount((count) => Math.min(99, count + 1))
      }
    }
  }, [chatMessages, isMobileLayout, mobilePrimaryPanel, setMobileUnreadCount])

  useEffect(() => {
    if (!isMobileLayout) {
      setIsMobileKeyboardOpen(false)
      return
    }

    let focusedInput = false
    let viewportKeyboardOpen = false

    const commitState = () => setIsMobileKeyboardOpen(focusedInput || viewportKeyboardOpen)

    const isTextInputTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false
      if (target.isContentEditable) return true
      return Boolean(target.closest('input, textarea, [contenteditable="true"]'))
    }

    const onFocusIn = (event: FocusEvent) => {
      focusedInput = isTextInputTarget(event.target)
      commitState()
    }

    const onFocusOut = () => {
      window.setTimeout(() => {
        focusedInput = isTextInputTarget(document.activeElement)
        commitState()
      }, 0)
    }

    const onViewportChange = () => {
      if (!window.visualViewport) return
      const heightDelta = window.innerHeight - window.visualViewport.height
      viewportKeyboardOpen = heightDelta > 140
      commitState()
    }

    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    window.visualViewport?.addEventListener('resize', onViewportChange)
    window.visualViewport?.addEventListener('scroll', onViewportChange)
    onViewportChange()
    commitState()

    return () => {
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
      window.visualViewport?.removeEventListener('resize', onViewportChange)
      window.visualViewport?.removeEventListener('scroll', onViewportChange)
    }
  }, [isMobileLayout, setIsMobileKeyboardOpen])

  const chatPanelContent = (
    <div
      className={cn(
        'surface-1 relative flex h-full flex-col border-border',
        isMobileLayout ? 'border-t' : 'border-l'
      )}
    >
      {/* Chat Header - Compact */}
      <div className="panel-header-compact flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <Bot className="h-3 w-3 text-primary" />
          <span>Chat</span>
        </div>

        {/* Running indicator - subtle pulse dot */}
        {agent.isLoading && (
          <div
            className="ml-1 flex h-2 w-2 animate-pulse rounded-full bg-primary"
            title="Agent running"
          />
        )}

        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsChatInspectorOpen((prev) => !prev)}
            className="h-6 rounded-none px-2 font-mono text-[10px] uppercase tracking-wide"
            aria-label="Toggle inspector"
          >
            Inspector
          </Button>

          {/* Overflow Menu */}
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
                onClick={() => setIsChatInspectorOpen((prev) => !prev)}
                className="rounded-none text-xs uppercase tracking-wide"
              >
                Inspector
              </DropdownMenuItem>
              {activeChat?._id && (
                <DropdownMenuItem
                  className="rounded-none text-xs uppercase tracking-wide"
                  onClick={() => window.dispatchEvent(new CustomEvent('panda:open-share'))}
                >
                  Share
                </DropdownMenuItem>
              )}
              {activeChat?._id && (
                <DropdownMenuItem className="rounded-none text-xs uppercase tracking-wide">
                  History ({chatMessages.length})
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

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

      {/* Messages - Full height */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <MessageList
          messages={chatMessages}
          isStreaming={agent.isLoading}
          onSuggestedAction={handleSuggestedAction}
        />
      </div>

      {/* ChatActionBar - between messages and input */}
      <ChatActionBar
        planStatus={activeChat?.planStatus}
        planDraft={planDraft}
        onPlanReview={() => {
          setChatInspectorTab('plan')
          setIsChatInspectorOpen(true)
        }}
        onPlanApprove={() => {
          void handleApprovePlan()
        }}
        onBuildFromPlan={() => {
          void handleBuildFromPlan()
        }}
        planApproveDisabled={!canApprovePlan(activeChat?.planStatus, planDraft) || agent.isLoading}
        planBuildDisabled={!canBuildFromPlan(activeChat?.planStatus, planDraft) || agent.isLoading}
        showPlanReview={backgroundExecutionPolicy.showInlinePlanReview}
        pendingSpec={agent.pendingSpec}
        onSpecApprove={agent.approvePendingSpec}
        onSpecEdit={() => setIsSpecPanelOpen(true)}
        onSpecCancel={agent.cancelPendingSpec}
        showSpecReview={backgroundExecutionPolicy.showInlineSpecReview}
        specTier={agent.currentSpec?.tier || specTier}
      />

      {/* Input - Clean, cards removed */}
      {/* Permission Dialog - mounted above chat input */}
      <PermissionDialog />

      <ChatInput
        mode={chatMode}
        onModeChange={handleModeChange}
        architectBrainstormEnabled={architectBrainstormEnabled}
        onArchitectBrainstormEnabledChange={setArchitectBrainstormEnabled}
        onSendMessage={handleSendMessage}
        isStreaming={agent.isLoading}
        onStopStreaming={agent.stop}
        filePaths={files?.map((f) => f.path) ?? []}
        model={uiSelectedModel || selectedModel}
        onModelChange={setUiSelectedModel}
        availableModels={availableModels}
        variant={reasoningVariant}
        onVariantChange={setReasoningVariant}
        supportsReasoning={supportsReasoning}
        specTier={specTier}
        onSpecTierChange={setSpecTier}
      />

      <AnimatePresence>
        {agent.pendingSpec && isSpecPanelOpen ? (
          <>
            <motion.button
              type="button"
              aria-label="Close spec editor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSpecPanelOpen(false)}
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
                spec={agent.pendingSpec}
                onEdit={agent.updatePendingSpecDraft}
                onExecute={(spec) => {
                  agent.approvePendingSpec(spec)
                  setIsSpecPanelOpen(false)
                }}
                onCancel={agent.cancelPendingSpec}
                onClose={() => setIsSpecPanelOpen(false)}
              />
            </motion.div>
          </>
        ) : null}
        <ProjectChatInspector
          projectId={projectId}
          chatId={activeChat?._id}
          isMobileLayout={isMobileLayout}
          isOpen={isChatInspectorOpen}
          tab={chatInspectorTab as ChatInspectorTab}
          onOpenChange={setIsChatInspectorOpen}
          onTabChange={(value) => setChatInspectorTab(value)}
          liveSteps={liveRunSteps}
          isStreaming={agent.isLoading}
          tracePersistenceStatus={agent.tracePersistenceStatus}
          onOpenFile={handleFileSelect}
          onOpenArtifacts={() => setIsArtifactPanelOpen(true)}
          currentSpec={agent.currentSpec}
          planStatus={activeChat?.planStatus}
          planDraft={planDraft}
          onSpecClick={() => setIsSpecDrawerOpen(true)}
          onPlanClick={() => {
            setChatInspectorTab('plan')
            setIsChatInspectorOpen(true)
          }}
          onResumeRuntimeSession={agent.resumeRuntimeSession}
          snapshotEvents={snapshotRunEvents}
          subagentToolCalls={subagentToolCalls}
          onPlanDraftChange={setPlanDraft}
          onSavePlanDraft={() => {
            void handleSavePlanDraft()
          }}
          onApprovePlan={() => {
            void handleApprovePlan()
          }}
          onBuildFromPlan={() => {
            void handleBuildFromPlan()
          }}
          isSavingPlanDraft={isSavingPlanDraft}
          lastSavedAt={activeChat?.planUpdatedAt ?? null}
          lastGeneratedAt={activeChat?.planLastGeneratedAt ?? null}
          approveDisabled={!canApprovePlan(activeChat?.planStatus, planDraft) || agent.isLoading}
          buildDisabled={!canBuildFromPlan(activeChat?.planStatus, planDraft) || agent.isLoading}
          memoryBank={agent.memoryBank}
          onSaveMemoryBank={agent.updateMemoryBank}
          lastUserPrompt={latestUserPrompt}
          lastAssistantReply={latestAssistantReply}
          onRunEvalScenario={agent.runEvalScenario}
        />
      </AnimatePresence>
    </div>
  )

  // Loading state
  if (!project || !files) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-4 text-center"
        >
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          <p className="font-mono text-sm text-muted-foreground">Loading project...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 top-0 z-10 flex flex-col overflow-hidden bg-background">
      {/* Top Bar - Unified Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="surface-1 flex h-14 shrink-0 items-center justify-between border-b border-border px-4"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {/* Panda Logo + Home Link */}
          <Link href="/" className="flex shrink-0 items-center">
            <PandaLogo size="md" variant="icon" />
          </Link>

          <div className="h-6 w-px bg-border" />

          <Link href="/projects" className="shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-1 rounded-none font-mono text-xs"
              aria-label="Back to projects"
              title="Back to projects"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Projects</span>
            </Button>
          </Link>

          <div className="h-6 w-px bg-border" />

          <Breadcrumb
            projectName={project.name}
            projectId={projectId}
            items={buildBreadcrumbItems(selectedFilePath)}
          />

          {isAnyJobRunning && (
            <span
              className="ml-2 flex h-2 w-2 animate-pulse rounded-full bg-primary"
              title="Jobs running"
            />
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Primary Actions */}
          <div className="flex items-center gap-1 border-r border-border pr-3">
            <AgentAutomationDialog
              projectId={projectId}
              projectPolicy={readAgentPolicyField(project, 'agentPolicy')}
              userDefaults={readAgentPolicyField(settings, 'agentDefaults')}
            />
          </div>

          {/* Secondary Actions */}
          <div className="flex items-center gap-1 pl-3">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-8 gap-1.5 rounded-none font-mono text-xs transition-colors',
                isChatPanelOpen
                  ? 'border border-primary/30 bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              onClick={() => setIsChatPanelOpen(!isChatPanelOpen)}
              title="Toggle chat panel (Ctrl+B)"
              aria-label="Toggle chat panel"
            >
              {isChatPanelOpen ? (
                <PanelRightClose className="h-4 w-4" />
              ) : (
                <PanelRight className="h-4 w-4" />
              )}
              <span className="hidden lg:inline">Chat</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-8 gap-1.5 rounded-none font-mono text-xs transition-colors',
                isArtifactPanelOpen
                  ? 'border border-primary/30 bg-primary/10 text-primary'
                  : pendingArtifactCount > 0
                    ? 'border border-primary/30 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              onClick={() => setIsArtifactPanelOpen(!isArtifactPanelOpen)}
              title="Toggle artifacts panel (Ctrl+Shift+A)"
              aria-label="Toggle artifacts panel"
            >
              {isArtifactPanelOpen ? (
                <PanelRightClose className="h-4 w-4" />
              ) : (
                <Layers className="h-4 w-4" />
              )}
              <span className="hidden lg:inline">Artifacts</span>
              {pendingArtifactCount > 0 && (
                <span
                  className={cn(
                    'ml-0.5 flex h-4 min-w-4 items-center justify-center px-1 text-[10px]',
                    isArtifactPanelOpen
                      ? 'bg-primary/20 text-primary'
                      : 'bg-primary text-primary-foreground'
                  )}
                >
                  {pendingArtifactCount}
                </span>
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 rounded-none font-mono text-xs"
                  title="More actions"
                  aria-label="More actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="hidden xl:inline">More</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-none border-border font-mono">
                <DropdownMenuItem
                  onClick={handleResetWorkspace}
                  className="rounded-none text-xs uppercase tracking-wide"
                >
                  <RotateCcw className="mr-2 h-3.5 w-3.5" />
                  Reset Workspace
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="relative flex flex-1 flex-col overflow-hidden">
        <div className="relative flex-1 overflow-hidden">
          {isMobileLayout ? (
            <div className="flex h-full flex-col">
              <div className="flex-1 overflow-hidden">
                {mobilePrimaryPanel === 'workspace' ? (
                  <Workbench
                    projectId={projectId}
                    currentChatId={activeChat?._id}
                    files={files}
                    selectedFilePath={selectedFilePath}
                    selectedLocation={selectedFileLocation}
                    openTabs={openTabs}
                    onSelectFile={handleFileSelect}
                    onCloseTab={handleTabClose}
                    onCreateFile={handleFileCreate}
                    onRenameFile={handleFileRename}
                    onDeleteFile={handleFileDelete}
                    onSaveFile={handleEditorSave}
                  />
                ) : (
                  chatPanelContent
                )}
              </div>
              {!isMobileKeyboardOpen && (
                <div className="surface-1 grid min-h-12 grid-cols-2 border-t border-border pb-[env(safe-area-inset-bottom)] font-mono text-xs uppercase tracking-widest">
                  <button
                    type="button"
                    onClick={() => setMobilePrimaryPanel('workspace')}
                    className={cn(
                      'h-full border-r border-border',
                      mobilePrimaryPanel === 'workspace'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Workspace
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobilePrimaryPanel('chat')}
                    className={cn(
                      'relative h-full',
                      mobilePrimaryPanel === 'chat'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Chat
                    {mobileUnreadCount > 0 && mobilePrimaryPanel !== 'chat' && (
                      <span className="absolute right-2 top-1.5 min-w-5 border border-border bg-destructive px-1.5 py-0.5 text-center font-mono text-xs text-destructive-foreground">
                        {mobileUnreadCount}
                      </span>
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <PanelGroup
              direction="horizontal"
              className="h-full"
              autoSaveId="panda-workbench-outer"
            >
              <Panel
                defaultSize={isChatPanelOpen ? (isCompactDesktopLayout ? 64 : 70) : 100}
                minSize={40}
                className="flex flex-col"
              >
                <Workbench
                  projectId={projectId}
                  currentChatId={activeChat?._id}
                  files={files}
                  selectedFilePath={selectedFilePath}
                  selectedLocation={selectedFileLocation}
                  openTabs={openTabs}
                  onSelectFile={handleFileSelect}
                  onCloseTab={handleTabClose}
                  onCreateFile={handleFileCreate}
                  onRenameFile={handleFileRename}
                  onDeleteFile={handleFileDelete}
                  onSaveFile={handleEditorSave}
                />
              </Panel>

              {isChatPanelOpen && (
                <>
                  <PanelResizeHandle className="h-full w-px bg-border transition-colors hover:bg-primary" />

                  <Panel
                    defaultSize={isCompactDesktopLayout ? 36 : 30}
                    minSize={isCompactDesktopLayout ? 30 : 25}
                    maxSize={isCompactDesktopLayout ? 45 : 50}
                    className="flex flex-col"
                  >
                    {chatPanelContent}
                  </Panel>
                </>
              )}
            </PanelGroup>
          )}

          {/* Artifact Panel - Side drawer */}
          <AnimatePresence>
            {isArtifactPanelOpen && (
              <motion.div
                initial={{ opacity: 0, x: 300 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 300 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="shadow-sharp-lg absolute bottom-0 right-0 top-0 z-40 w-72 border-l border-border bg-background xl:w-80"
              >
                <ArtifactPanel
                  projectId={projectId}
                  chatId={activeChat?._id}
                  isOpen={true}
                  onClose={() => setIsArtifactPanelOpen(false)}
                  position="right"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Command Palette */}
          <CommandPalette
            files={files?.map((f) => ({ path: f.path })) ?? []}
            onModeChange={handleModeChange}
            currentMode={chatMode}
          />
        </div>

        {/* Status Bar */}
        <StatusBar
          filePath={selectedFilePath}
          cursorPosition={cursorPosition}
          isConnected={true}
          isStreaming={agent.isLoading}
          specEngineEnabled={true}
          specStatus={agent.currentSpec?.status ?? null}
          specConstraintsMet={
            agent.currentSpec?.verificationResults?.filter((result) => result.passed).length
          }
          specConstraintsTotal={agent.currentSpec?.intent.acceptanceCriteria.length}
          onSpecClick={agent.currentSpec ? () => setIsSpecDrawerOpen(true) : undefined}
        />
        <SpecDrawer
          spec={agent.currentSpec}
          isOpen={isSpecDrawerOpen}
          onClose={() => setIsSpecDrawerOpen(false)}
        />
      </div>
    </div>
  )
}
