'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

// Components
import { useHotkeys } from 'react-hotkeys-hook'
import { ComposerOverlay } from '@/components/chat/ComposerOverlay'
import { PermissionDialog } from '@/components/chat/PermissionDialog'
import { CommandPalette } from '@/components/command-palette/CommandPalette'
import { ProjectChatPanel } from '@/components/projects/ProjectChatPanel'
import { ProjectShareDialog } from '@/components/projects/ProjectShareDialog'
import { ProjectWorkspaceLayout } from '@/components/projects/ProjectWorkspaceLayout'
import { WorkbenchRightPanel } from '@/components/workbench/WorkbenchRightPanel'
import { Button } from '@/components/ui/button'
import { PandaLogo } from '@/components/ui/panda-logo'
import { WorkspaceProvider, type WorkspaceContextValue } from '@/contexts/WorkspaceContext'
import { WorkbenchTopBar } from '@/components/workbench/WorkbenchTopBar'
import { useCommandPaletteStore } from '@/stores/commandPaletteStore'
import { useGit } from '@/hooks/useGit'

// Hooks
import { useJobs } from '@/hooks/useJobs'
import { useAgent } from '@/hooks/useAgent'
import { useSidebar } from '@/hooks/useSidebar'
import { useProjectChatSession } from '@/hooks/useProjectChatSession'
import { useProjectMessageWorkflow } from '@/hooks/useProjectMessageWorkflow'
import { getAuthoritativePlanDraftValue, useProjectPlanDraft } from '@/hooks/useProjectPlanDraft'
import { useProjectPlanningSession } from '@/hooks/useProjectPlanningSession'
import { useProjectWorkbenchFiles } from '@/hooks/useProjectWorkbenchFiles'
import { useProjectWorkspaceUi } from '@/hooks/useProjectWorkspaceUi'
import { useShortcutListener } from '@/hooks/useShortcuts'
import { useSpecDriftDetection } from '@/hooks/useSpecDriftDetection'
import { useArtifactLifecycle } from '@/hooks/useArtifactLifecycle'
import { usePlanArtifactSync } from '@/hooks/usePlanArtifactSync'
import { useWorkbenchChatState } from '@/hooks/useWorkbenchChatState'
import { useWorkbenchPanelState } from '@/hooks/useWorkbenchPanelState'

import { canApprovePlan, canBuildFromPlan, type PlanStatus } from '@/lib/chat/planDraft'
import { resolveAgentPolicy } from '@/lib/chat/agentPolicy'
import { derivePlanCompletionStatus } from '@/lib/agent/plan-progress'
import type { AgentPolicy } from '@/lib/agent/automationPolicy'
import { type ChatMode } from '@/lib/agent/prompt-library'
import type { LLMProvider } from '@/lib/llm/types'

import { ShortcutHelpOverlay } from '@/components/workbench/ShortcutHelpOverlay'
import { derivePlanningSessionDebugSummary } from '@/components/plan/PlanningSessionDebugCard'
import { appLog } from '@/lib/logger'
import {
  buildInlineChatFailureDisplay,
  resolveExplorerRevealTarget,
} from '@/lib/workbench-navigation'
import { buildDefaultPlanningQuestions } from '@/lib/planning/question-engine'

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

function readAgentPolicyField(
  source: unknown,
  key: 'agentPolicy' | 'agentDefaults'
): AgentPolicy | null | undefined {
  if (!source || typeof source !== 'object') return undefined
  return (source as Record<string, unknown>)[key] as AgentPolicy | null | undefined
}

const FALLBACK_PROVIDER: LLMProvider = {
  name: 'No Provider',
  config: {
    provider: 'anthropic',
    auth: { apiKey: '' },
  },
  async listModels() {
    return []
  },
  async complete() {
    throw new Error('No LLM provider configured')
  },
  async *completionStream() {
    yield { type: 'error' as const, error: 'No LLM provider configured' }
    throw new Error('No LLM provider configured')
  },
}

export default function ProjectPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const projectId = params.projectId as Id<'projects'>
  const openCommandPalette = useCommandPaletteStore((state) => state.open)
  const { status: gitStatus, refreshStatus: refreshGitStatus } = useGit()

  const {
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
    chatInspectorTab,
    setIsChatInspectorOpen,
    setChatInspectorTab,
    specSurfaceMode,
    openSpecApproval,
    openSpecInspect,
    closeSpecSurface,
    isShareDialogOpen,
    setIsShareDialogOpen,
    // New agent command center state
    isBottomDockOpen,
    setIsBottomDockOpen,
    activeBottomDockTab,
    setActiveBottomDockTab,
    activeCenterTab,
    setActiveCenterTab,
    isRightPanelOpen,
    setIsRightPanelOpen,
    rightPanelTab,
    setRightPanelTab,
    taskHeaderVisible,
    setTaskHeaderVisible,
  } = useProjectWorkspaceUi()

  const { openRightPanelTab } = useWorkbenchPanelState({
    isMobileLayout,
    setRightPanelTab,
    setIsRightPanelOpen,
    setMobilePrimaryPanel,
    setIsMobileKeyboardOpen,
  })

  useEffect(() => {
    void refreshGitStatus()
  }, [refreshGitStatus])

  const { activeSection, isFlyoutOpen, handleSectionChange, toggleFlyout } = useSidebar()

  const [oversightLevel, setOversightLevel] = useState<'review' | 'autopilot'>('review')
  const [contextualPrompt, setContextualPrompt] = useState<string | null>(null)
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [isShortcutHelpOpen, setIsShortcutHelpOpen] = useState(false)
  const approvedPlanRunSessionsRef = useRef(new Map<string, string>())

  useHotkeys(
    'mod+i',
    (e) => {
      e.preventDefault()
      setIsComposerOpen((prev) => !prev)
    },
    { enableOnFormTags: ['INPUT', 'TEXTAREA'] }
  )

  useHotkeys(
    'mod+/',
    (e) => {
      e.preventDefault()
      setIsShortcutHelpOpen((prev) => !prev)
    },
    { enableOnFormTags: ['INPUT', 'TEXTAREA'] }
  )

  // Toggle bottom dock with Ctrl+J
  useHotkeys(
    'ctrl+j',
    (e) => {
      e.preventDefault()
      setIsBottomDockOpen((prev) => !prev)
    },
    { enableOnFormTags: ['INPUT', 'TEXTAREA'] }
  )

  // Toggle right panel (chat) with Cmd+L
  useHotkeys(
    'mod+l',
    (e) => {
      e.preventDefault()
      setIsRightPanelOpen((prev) => !prev)
    },
    { enableOnFormTags: ['INPUT', 'TEXTAREA'] }
  )

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
  const addMessageMutation = useMutation(api.messages.add)
  const updateChatMutation = useMutation(api.chats.update)
  const {
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
    provider,
    selectedModel,
    availableModels,
    supportsReasoning,
    effectiveAutomationPolicy,
  } = useProjectChatSession({
    projectId,
    chats,
    projectAgentPolicy,
  })
  const planningSession = useProjectPlanningSession({
    activeChatId: activeChat?._id ?? null,
  })
  const activePlanningSession = planningSession.session
  const planningQuestions =
    activePlanningSession?.questions ??
    buildDefaultPlanningQuestions({ projectName: project?.name })
  const agentPolicy = useMemo(
    () => resolveAgentPolicy({ chatMode, oversightLevel }),
    [chatMode, oversightLevel]
  )
  useShortcutListener()
  const persistedPlanDraft = getAuthoritativePlanDraftValue({
    activeChat,
    activePlanningSession: activePlanningSession
      ? {
          sessionId: activePlanningSession.sessionId,
          status: activePlanningSession.status,
          generatedPlan: activePlanningSession.generatedPlan,
        }
      : null,
  })

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
    automationPolicy: effectiveAutomationPolicy,
    specApprovalMode: agentPolicy.specApprovalMode,
    onRunCreated: async ({ runId, approvedPlanExecution }) => {
      void runId

      if (!approvedPlanExecution) return

      const planningSessionId = activePlanningSession?.sessionId ?? null
      if (planningSessionId) {
        approvedPlanRunSessionsRef.current.set(String(runId), planningSessionId)
        await planningSession.markExecutionState({
          state: 'executing',
          runId,
        })
        return
      }

      if (!activeChat?._id) return
      await updateChatMutation({
        id: activeChat._id,
        planBuildRunId: runId,
        planStatus: 'executing',
      })
    },
    onRunCompleted: async ({ runId, outcome, completedPlanStepIndexes, planTotalSteps }) => {
      const nextPlanStatus = derivePlanCompletionStatus({
        planTotalSteps,
        completedPlanStepIndexes,
        runOutcome: outcome,
      })

      const planningSessionId = approvedPlanRunSessionsRef.current.get(String(runId))
      if (planningSessionId) {
        approvedPlanRunSessionsRef.current.delete(String(runId))
        await planningSession.markExecutionState({
          sessionId: planningSessionId,
          state: nextPlanStatus,
        })
        return
      }

      if (!activeChat?._id || !activeChat.planBuildRunId) return
      if (activeChat.planBuildRunId !== runId) return
      if (activeChat.planStatus !== 'executing') return

      await updateChatMutation({
        id: activeChat._id,
        planStatus: nextPlanStatus,
      })
    },
  })

  const healthStatus = useMemo(() => {
    if (agent.error) return 'error' as const
    if (isAnyJobRunning || agent.isLoading) return 'issues' as const
    return 'ready' as const
  }, [agent.error, agent.isLoading, isAnyJobRunning])

  const healthDetail = useMemo(() => {
    if (agent.error) return 'Agent execution encountered an error'
    if (agent.isLoading) return 'Agent is actively working'
    if (isAnyJobRunning) return 'Background jobs are running'
    return 'Workspace systems nominal'
  }, [agent.error, agent.isLoading, isAnyJobRunning])
  const sendAgentMessage = agent.sendMessage

  // Auto-show task header when agent is running
  useEffect(() => {
    setTaskHeaderVisible(agent.isLoading)
  }, [agent.isLoading, setTaskHeaderVisible])

  const { planDraft, setPlanDraft, isSavingPlanDraft, handleSavePlanDraft, handleApprovePlan } =
    useProjectPlanDraft({
      activeChat,
      activePlanningSession,
      chatMode,
      architectBrainstormEnabled,
      agentStatus: agent.status,
      agentMessages: agent.messages,
      updateChatMutation,
      acceptPlanningSession: planningSession.acceptPlan,
    })

  const canApproveCurrentPlan =
    planningSession.canApprove ||
    (!planningSession.generatedPlan && canApprovePlan(activeChat?.planStatus, planDraft))
  const canBuildCurrentPlan =
    planningSession.canBuild ||
    (!planningSession.generatedPlan && canBuildFromPlan(activeChat?.planStatus, planDraft))

  const { handleSendMessage, handleSuggestedAction, handleBuildFromPlan, handleModeChange } =
    useProjectMessageWorkflow({
      projectId,
      activeChat,
      chatMode,
      setChatMode,
      planDraft,
      approvedPlanArtifact: activePlanningSession?.generatedPlan ?? null,
      activePlanningSessionId: activePlanningSession?.sessionId ?? null,
      providerAvailable: Boolean(provider),
      createChatMutation,
      updateChatMutation,
      markPlanningExecutionState: ({ sessionId, state }) =>
        planningSession.markExecutionState({ sessionId, state }),
      sendAgentMessage,
      setActiveChatId,
      setMobilePrimaryPanel,
    })

  const {
    pendingArtifactPreview,
    pendingDiffEntries,
    pendingChangedFilesCount,
    handleApplyPendingArtifact,
    handleRejectPendingArtifact,
  } = useArtifactLifecycle({
    projectId,
    activeChat,
    selectedFilePath,
    openTabs,
    setOpenTabs,
    setSelectedFilePath,
    setSelectedFileLocation,
    setCursorPosition,
    setMobilePrimaryPanel,
  })

  const activePlanArtifact = planningSession.generatedPlan
  const planningDebug = useMemo(() => {
    if (!activePlanningSession) return null
    return derivePlanningSessionDebugSummary({
      sessionId: activePlanningSession.sessionId,
      questions: activePlanningSession.questions,
      answers: activePlanningSession.answers,
      generatedPlan: activePlanningSession.generatedPlan ?? null,
      openTabPaths: openTabs.map((tab) => tab.path),
    })
  }, [activePlanningSession, openTabs])

  usePlanArtifactSync({
    activePlanArtifact,
    openTabs,
    setOpenTabs,
    setSelectedFilePath,
    setSelectedFileLocation,
    setCursorPosition,
    setMobilePrimaryPanel,
  })

  const requestedFilePath = searchParams.get('filePath')

  useEffect(() => {
    if (!requestedFilePath || !files?.some((file) => file.path === requestedFilePath)) return

    setSelectedFilePath(requestedFilePath)
    setSelectedFileLocation(null)
    setCursorPosition(null)
    setOpenTabs((prev) => {
      if (prev.some((tab) => tab.path === requestedFilePath)) return prev
      return [...prev, { path: requestedFilePath }]
    })
  }, [
    files,
    requestedFilePath,
    setCursorPosition,
    setOpenTabs,
    setSelectedFileLocation,
    setSelectedFilePath,
  ])

  // Reset workspace handler
  const handleSelectChat = useCallback(
    (chatId: Id<'chats'>) => {
      setActiveChatId(chatId)
    },
    [setActiveChatId]
  )

  const handleNewChat = useCallback(async () => {
    const id = await createChatMutation({ projectId, title: 'New Chat', mode: chatMode })
    setActiveChatId(id)
    setIsRightPanelOpen(true)
    setRightPanelTab('chat')
  }, [
    createChatMutation,
    projectId,
    chatMode,
    setActiveChatId,
    setIsRightPanelOpen,
    setRightPanelTab,
  ])

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
    // Show confirmation
    toast.success('Workspace reset', {
      description:
        'Local draft state was cleared. Persisted messages and artifacts remain available.',
    })
  }, [agent, setChatMode, setPlanDraft])

  const {
    runEvents,
    chatMessages,
    liveRunSteps,
    snapshotRunEvents,
    subagentToolCalls,
    latestUserPrompt,
    latestAssistantReply,
    inlineRateLimitError,
    chatInspectorSurfaceTab,
    openChatInspectorSurface,
  } = useWorkbenchChatState({
    activeChat,
    chatMode,
    agent,
    isMobileLayout,
    mobilePrimaryPanel,
    chatInspectorTab,
    setMobileUnreadCount,
    setIsChatInspectorOpen,
    setChatInspectorTab,
    setIsRightPanelOpen,
    setMobilePrimaryPanel,
    setRightPanelTab,
  })

  // Note: Inspector no longer auto-opens on agent start - user opens it manually

  const {
    handleFileSelect,
    handleTabClose,
    handleFileCreate,
    handleFileRename,
    handleFileDelete,
    handleEditorSave,
    handleEditorDirtyChange,
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

  const selectedChatModel = uiSelectedModel || selectedModel

  const handleStartPlanningIntake = useCallback(async () => {
    const sessionId = await planningSession.startIntake(planningQuestions)

    if (activeChat?._id) {
      const taskSummary = 'Start planning intake'
      await addMessageMutation({
        chatId: activeChat._id,
        role: 'user',
        content: taskSummary,
        annotations: [{ mode: 'architect' }],
      })
    }

    setIsChatInspectorOpen(true)
    setChatInspectorTab('plan')
    openRightPanelTab('plan')

    return sessionId
  }, [
    activeChat?._id,
    addMessageMutation,
    openRightPanelTab,
    planningQuestions,
    planningSession,
    setChatInspectorTab,
    setIsChatInspectorOpen,
  ])

  const chatPanelContent = (
    <ProjectChatPanel
      projectId={projectId}
      oversightLevel={oversightLevel}
      onOversightLevelChange={setOversightLevel}
      activeChatId={activeChat?._id}
      activeChatPlanStatus={activeChat?.planStatus}
      activeChatPlanUpdatedAt={activeChat?.planUpdatedAt}
      activeChatPlanLastGeneratedAt={activeChat?.planLastGeneratedAt}
      activeChatExists={Boolean(activeChat?._id)}
      chatMessages={chatMessages}
      runEvents={runEvents}
      runHistoryCount={(runEvents ?? []).length}
      chatMode={chatMode}
      architectBrainstormEnabled={architectBrainstormEnabled}
      onArchitectBrainstormEnabledChange={setArchitectBrainstormEnabled}
      onModeChange={handleModeChange}
      onSendMessage={handleSendMessage}
      onSuggestedAction={handleSuggestedAction}
      isStreaming={agent.isLoading}
      onStopStreaming={agent.stop}
      filePaths={files?.map((f) => f.path) ?? []}
      model={selectedChatModel}
      onModelChange={setUiSelectedModel}
      availableModels={availableModels}
      variant={reasoningVariant}
      onVariantChange={setReasoningVariant}
      supportsReasoning={supportsReasoning}
      attachmentsEnabled={true}
      inlineRateLimitError={inlineRateLimitError}
      hasProvider={provider !== null}
      onToggleInspector={() => {
        openChatInspectorSurface(chatInspectorSurfaceTab)
      }}
      onOpenHistory={() => {
        openChatInspectorSurface('run')
      }}
      onOpenShare={() => setIsShareDialogOpen(true)}
      onOpenPreview={() => setActiveCenterTab('preview')}
      onResetWorkspace={handleResetWorkspace}
      resetWorkspaceLabel="Clear Local Workspace"
      onNewChat={() => {
        void handleNewChat()
      }}
      planDraft={planDraft}
      onPlanReview={() => {
        openRightPanelTab('plan')
      }}
      onPlanApprove={() => {
        void handleApprovePlan()
      }}
      onBuildFromPlan={() => {
        void handleBuildFromPlan()
      }}
      planApproveDisabled={!canApproveCurrentPlan || agent.isLoading}
      planBuildDisabled={!canBuildCurrentPlan || agent.isLoading}
      showInlinePlanReview={agentPolicy.showPlanReview}
      pendingSpec={agent.pendingSpec}
      onSpecApprove={agent.approvePendingSpec}
      onSpecEdit={openSpecApproval}
      onSpecCancel={agent.cancelPendingSpec}
      showInlineSpecReview={agentPolicy.showSpecReview}
      specSurfaceMode={specSurfaceMode}
      onCloseSpecSurface={closeSpecSurface}
      onEditPendingSpec={agent.updatePendingSpecDraft}
      onExecutePendingSpec={(spec) => {
        agent.approvePendingSpec(spec)
        closeSpecSurface()
      }}
      isMobileLayout={isMobileLayout}
      isInspectorOpen={isChatInspectorOpen}
      inspectorTab={chatInspectorSurfaceTab}
      planningSession={activePlanningSession}
      planningCurrentQuestion={planningSession.currentQuestion}
      onStartPlanningIntake={handleStartPlanningIntake}
      onAnswerPlanningQuestion={planningSession.answerQuestion}
      onClearPlanningIntake={() =>
        activePlanningSession?.sessionId ? planningSession.clearIntake() : Promise.resolve(null)
      }
      onInspectorOpenChange={setIsChatInspectorOpen}
      onInspectorTabChange={setChatInspectorTab}
      liveSteps={liveRunSteps}
      tracePersistenceStatus={agent.tracePersistenceStatus}
      onOpenFile={handleFileSelect}
      onOpenArtifacts={() => {
        openRightPanelTab('review')
      }}
      currentSpec={agent.currentSpec}
      onSpecClick={openSpecInspect}
      onPlanClick={() => {
        openRightPanelTab('plan')
      }}
      onResumeRuntimeSession={agent.resumeRuntimeSession}
      snapshotEvents={snapshotRunEvents}
      subagentToolCalls={subagentToolCalls}
      onPlanDraftChange={setPlanDraft}
      onSavePlanDraft={() => {
        void handleSavePlanDraft()
      }}
      isSavingPlanDraft={isSavingPlanDraft}
      memoryBank={agent.memoryBank}
      onSaveMemoryBank={agent.updateMemoryBank}
      lastUserPrompt={latestUserPrompt}
      onRunEvalScenario={agent.runEvalScenario}
      renderInspectorInline={false}
      contextualPrompt={contextualPrompt}
      onContextualPromptHandled={() => setContextualPrompt(null)}
    />
  )

  const rightPanelContent = (
    <WorkbenchRightPanel
      projectId={projectId}
      activeTab={rightPanelTab}
      onTabChange={setRightPanelTab}
      activeChatId={activeChat?._id}
      activeChatPlanStatus={activeChat?.planStatus}
      activeChatPlanUpdatedAt={activeChat?.planUpdatedAt}
      activeChatPlanLastGeneratedAt={activeChat?.planLastGeneratedAt}
      chatMessages={chatMessages}
      runEvents={runEvents}
      chatMode={chatMode}
      architectBrainstormEnabled={architectBrainstormEnabled}
      onArchitectBrainstormEnabledChange={setArchitectBrainstormEnabled}
      onModeChange={handleModeChange}
      onSendMessage={handleSendMessage}
      onSuggestedAction={handleSuggestedAction}
      isStreaming={agent.isLoading}
      onStopStreaming={agent.stop ?? (() => {})}
      filePaths={files?.map((f) => f.path) ?? []}
      model={selectedChatModel}
      onModelChange={setUiSelectedModel}
      availableModels={availableModels}
      variant={reasoningVariant}
      onVariantChange={setReasoningVariant}
      supportsReasoning={supportsReasoning}
      inlineRateLimitError={inlineRateLimitError}
      hasProvider={provider !== null}
      oversightLevel={oversightLevel}
      onOversightLevelChange={setOversightLevel}
      isMobileLayout={isMobileLayout}
      isInspectorOpen={isChatInspectorOpen}
      inspectorTab={chatInspectorSurfaceTab}
      planningSession={activePlanningSession}
      planningCurrentQuestion={planningSession.currentQuestion}
      onStartPlanningIntake={handleStartPlanningIntake}
      onAnswerPlanningQuestion={planningSession.answerQuestion}
      onClearPlanningIntake={() =>
        activePlanningSession?.sessionId ? planningSession.clearIntake() : Promise.resolve(null)
      }
      onInspectorOpenChange={setIsChatInspectorOpen}
      onInspectorTabChange={setChatInspectorTab}
      liveSteps={liveRunSteps}
      tracePersistenceStatus={agent.tracePersistenceStatus}
      onOpenFile={handleFileSelect}
      onOpenArtifacts={() => openRightPanelTab('review')}
      currentSpec={agent.currentSpec}
      onSpecClick={openSpecInspect}
      onPlanClick={() => openRightPanelTab('plan')}
      onResumeRuntimeSession={agent.resumeRuntimeSession}
      snapshotEvents={snapshotRunEvents}
      subagentToolCalls={subagentToolCalls}
      planDraft={planDraft}
      onPlanDraftChange={setPlanDraft}
      onSavePlanDraft={() => {
        void handleSavePlanDraft()
      }}
      isSavingPlanDraft={isSavingPlanDraft}
      memoryBank={agent.memoryBank}
      onSaveMemoryBank={agent.updateMemoryBank}
      lastUserPrompt={latestUserPrompt}
      lastAssistantReply={latestAssistantReply}
      onRunEvalScenario={agent.runEvalScenario}
      contextualPrompt={contextualPrompt}
      onContextualPromptHandled={() => setContextualPrompt(null)}
      onToggleInspector={() => {
        openChatInspectorSurface(chatInspectorSurfaceTab)
      }}
      onOpenHistory={() => {
        openChatInspectorSurface('run')
      }}
      onOpenShare={() => setIsShareDialogOpen(true)}
      onOpenPreview={() => setActiveCenterTab('preview')}
      onResetWorkspace={handleResetWorkspace}
      onNewChat={() => {
        void handleNewChat()
      }}
      onPlanReview={() => {
        openRightPanelTab('plan')
      }}
      onPlanApprove={() => {
        void handleApprovePlan()
      }}
      onBuildFromPlan={() => {
        void handleBuildFromPlan()
      }}
      planApproveDisabled={!canApproveCurrentPlan || agent.isLoading}
      planBuildDisabled={!canBuildCurrentPlan || agent.isLoading}
      showInlinePlanReview={agentPolicy.showPlanReview}
      pendingSpec={agent.pendingSpec}
      onSpecApprove={agent.approvePendingSpec}
      onSpecEdit={openSpecApproval}
      onSpecCancel={agent.cancelPendingSpec}
      showInlineSpecReview={agentPolicy.showSpecReview}
      specSurfaceMode={specSurfaceMode}
      onCloseSpecSurface={closeSpecSurface}
      onEditPendingSpec={agent.updatePendingSpecDraft}
      onExecutePendingSpec={(spec) => {
        agent.approvePendingSpec(spec)
        closeSpecSurface()
      }}
      openSpecApproval={openSpecApproval}
      openSpecInspect={openSpecInspect}
      planStatus={activeChat?.planStatus}
      canApprovePlan={canApproveCurrentPlan}
      canBuildPlan={canBuildCurrentPlan}
      lastSavedAt={activeChat?.planUpdatedAt}
      lastGeneratedAt={activeChat?.planLastGeneratedAt}
      planningDebug={planningDebug}
    />
  )

  // Invalid project — Convex returned null (not found)
  if (project === null) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-6 text-center"
        >
          <span className="text-label text-primary">404</span>
          <h1 className="font-mono text-2xl font-bold">Project not found</h1>
          <p className="font-mono text-sm text-muted-foreground">
            This project doesn&apos;t exist or was deleted. Your other projects are safe.
          </p>
          <Button
            variant="outline"
            className="rounded-none font-mono"
            onClick={() => {
              window.location.href = '/projects'
            }}
          >
            Back to Projects
          </Button>
        </motion.div>
      </div>
    )
  }

  // Loading state — project is undefined (still loading) or files not yet fetched
  if (project === undefined || !files) {
    return (
      <div className="dot-grid flex h-screen w-full items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className="space-y-6 text-center"
        >
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="flex justify-center"
          >
            <PandaLogo size="xl" variant="icon" />
          </motion.div>
          <p className="font-mono text-sm text-muted-foreground">
            {project === undefined ? 'Loading project...' : 'Loading files...'}
          </p>
        </motion.div>
      </div>
    )
  }

  const workspaceContextValue: WorkspaceContextValue = {
    selectedFilePath,
    setSelectedFilePath,
    selectedFileLocation,
    setSelectedFileLocation,
    openTabs,
    setOpenTabs,
    cursorPosition,
    setCursorPosition,
    activeSection,
    isFlyoutOpen,
    handleSectionChange,
    toggleFlyout,
    isMobileLayout,
    isCompactDesktopLayout,
    mobilePrimaryPanel,
    setMobilePrimaryPanel,
    projectId,
    activeChatId: activeChat?._id,
    chatMode,
    onSelectChat: handleSelectChat,
    onNewChat: () => {
      void handleNewChat()
    },
  }

  return (
    <WorkspaceProvider value={workspaceContextValue}>
      <div className="fixed inset-0 top-0 z-10 flex flex-col overflow-hidden bg-background">
        <div className="pointer-events-none absolute inset-x-0 top-11 z-40 px-3 py-2">
          <PermissionDialog className="pointer-events-auto ml-auto max-w-xl" />
        </div>
        <ProjectShareDialog
          open={isShareDialogOpen}
          onOpenChange={setIsShareDialogOpen}
          chatId={activeChat?._id}
          chatTitle={activeChat?.title}
        />
        <WorkbenchTopBar
          projectName={project.name}
          projectId={projectId}
          selectedFilePath={selectedFilePath}
          gitStatus={gitStatus}
          selectedModel={selectedModel}
          isAgentRunning={agent.isLoading}
          isAnyJobRunning={isAnyJobRunning}
          healthStatus={healthStatus}
          healthDetail={healthDetail}
          isRightPanelOpen={isRightPanelOpen}
          isFlyoutOpen={isFlyoutOpen}
          onToggleFlyout={toggleFlyout}
          onToggleRightPanel={() => setIsRightPanelOpen((prev) => !prev)}
          onNewTask={() => {
            void handleNewChat()
          }}
          onResetWorkspace={handleResetWorkspace}
          onOpenShareDialog={() => setIsShareDialogOpen(true)}
          onRevealInExplorer={(folderPath) => {
            const revealTarget = resolveExplorerRevealTarget({
              folderPath,
              files: files ?? [],
            })
            if (!revealTarget) return
            handleSectionChange('files')
            if (!isFlyoutOpen) toggleFlyout()
            setSelectedFilePath(revealTarget)
            setSelectedFileLocation(null)
            setCursorPosition(null)
          }}
          onOpenCommandPalette={openCommandPalette}
          activeSidebarSection={activeSection}
          onSidebarSectionChange={handleSectionChange}
        />

        <ProjectWorkspaceLayout
          projectId={projectId}
          activeChatId={activeChat?._id}
          files={files}
          selectedFilePath={selectedFilePath}
          selectedFileLocation={selectedFileLocation}
          openTabs={openTabs}
          onSelectFile={handleFileSelect}
          onCloseTab={handleTabClose}
          onCreateFile={handleFileCreate}
          onRenameFile={handleFileRename}
          onDeleteFile={handleFileDelete}
          onSaveFile={handleEditorSave}
          onEditorDirtyChange={handleEditorDirtyChange}
          isMobileLayout={isMobileLayout}
          isCompactDesktopLayout={isCompactDesktopLayout}
          mobilePrimaryPanel={mobilePrimaryPanel}
          onMobilePrimaryPanelChange={setMobilePrimaryPanel}
          mobileUnreadCount={mobileUnreadCount}
          isMobileKeyboardOpen={isMobileKeyboardOpen}
          chatPanel={chatPanelContent}
          rightPanelContent={rightPanelContent}
          pendingArtifactPreview={pendingArtifactPreview}
          pendingDiffEntries={pendingDiffEntries}
          onApplyPendingArtifact={handleApplyPendingArtifact}
          onRejectPendingArtifact={handleRejectPendingArtifact}
          chatMode={chatMode}
          onModeChange={handleModeChange}
          cursorPosition={cursorPosition}
          isStreaming={agent.isLoading}
          currentSpec={agent.currentSpec}
          openSpecInspect={openSpecInspect}
          onContextualChat={(selection, filePath) => {
            const ext = filePath.split('.').pop() || 'text'
            const prompt = `\`\`\`${ext}\n// ${filePath}\n${selection}\n\`\`\``
            setContextualPrompt(prompt)
            if (!isRightPanelOpen) {
              setIsRightPanelOpen(true)
            }
            setRightPanelTab('chat')
            if (isMobileLayout) {
              setMobilePrimaryPanel('chat')
            }
          }}
          onInlineChat={async (prompt, selection, filePath) => {
            try {
              const result = await agent.runEvalScenario({
                prompt: `The user wants to edit ${filePath}.\n${selection ? `Selected text:\n\`\`\`\n${selection}\n\`\`\`\n` : ''}User request: ${prompt}\n\nReturn ONLY the new code that should replace the selected text (or be inserted at the cursor). Do NOT wrap it in markdown block quotes. Do NOT add any explanations.`,
                mode: 'code',
              })
              if (result.error) throw new Error(result.error)

              let output = result.output
              if (output.startsWith('```')) {
                const lines = output.split('\n')
                if (lines.length > 2) {
                  output = lines.slice(1, -1).join('\n')
                }
              }
              return output
            } catch (err) {
              const failure = buildInlineChatFailureDisplay(err)
              appLog.error('[projects/[projectId]] Inline chat failed', {
                projectId,
                filePath,
                error:
                  err instanceof Error
                    ? {
                        name: err.name,
                        message: err.message,
                        stack: err.stack,
                      }
                    : err,
              })
              toast.error(failure.title, {
                description: failure.description,
              })
              return null
            }
          }}
          // New agent command center props
          isBottomDockOpen={isBottomDockOpen}
          onBottomDockOpenChange={setIsBottomDockOpen}
          activeBottomDockTab={activeBottomDockTab}
          onBottomDockTabChange={setActiveBottomDockTab}
          activeCenterTab={activeCenterTab}
          onCenterTabChange={setActiveCenterTab}
          isRightPanelOpen={isRightPanelOpen}
          activeTaskTitle={
            taskHeaderVisible && agent.isLoading ? (activeChat?.title ?? 'Active Task') : undefined
          }
          activeTaskStatus={taskHeaderVisible && agent.isLoading ? 'running' : undefined}
          changedFilesCount={pendingChangedFilesCount}
          onReviewChanges={() => {
            setActiveCenterTab('diff')
            openChatInspectorSurface('artifacts')
          }}
          onStopAgent={() => agent.stop?.()}
          onStartAgent={() => {
            setIsRightPanelOpen(true)
            setRightPanelTab('chat')
          }}
        />
        <ComposerOverlay
          isOpen={isComposerOpen}
          onClose={() => setIsComposerOpen(false)}
          onSubmit={(prompt, ctx) => handleSendMessage(prompt, 'build', ctx)}
          isStreaming={agent.isLoading}
        />
        <ShortcutHelpOverlay open={isShortcutHelpOpen} onOpenChange={setIsShortcutHelpOpen} />
        <CommandPalette projectId={projectId} files={files.map((file) => ({ path: file.path }))} />
      </div>
    </WorkspaceProvider>
  )
}
