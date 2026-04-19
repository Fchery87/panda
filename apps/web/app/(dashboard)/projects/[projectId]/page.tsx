'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { toast } from 'sonner'

// Components
import { useHotkeys } from 'react-hotkeys-hook'
import { ProjectChatPanel } from '@/components/projects/ProjectChatPanel'
import { ProjectLoadingGuard, ProjectNotFoundGuard } from '@/components/projects/ProjectPageGuards'
import { ProjectWorkspaceShell } from '@/components/projects/ProjectWorkspaceShell'
import { WorkbenchRightPanel } from '@/components/workbench/WorkbenchRightPanel'
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
import { useProjectInlineEditing } from '@/hooks/useProjectInlineEditing'
import { useProjectPlanningIntake } from '@/hooks/useProjectPlanningIntake'
import { useProjectRuntimeControls } from '@/hooks/useProjectRuntimeControls'
import { useProjectRequestedFileSync } from '@/hooks/useProjectRequestedFileSync'
import { useProjectWorkspaceActions } from '@/hooks/useProjectWorkspaceActions'
import { buildProjectWorkspaceShellProps } from '@/hooks/useProjectWorkspaceShellProps'
import { buildProjectChatPanelProps } from '@/hooks/buildProjectChatPanelProps'
import { buildWorkbenchRightPanelProps } from '@/hooks/buildWorkbenchRightPanelProps'
import { buildWorkspaceContextValue } from '@/hooks/buildWorkspaceContextValue'
import { useProjectAgentRunCallbacks } from '@/hooks/useProjectAgentRunCallbacks'
import { buildProjectWorkspaceDerivedState } from '@/hooks/buildProjectWorkspaceDerivedState'
import { buildProjectWorkspaceLayoutProps } from '@/hooks/buildProjectWorkspaceLayoutProps'

import { canApprovePlan, canBuildFromPlan, type PlanStatus } from '@/lib/chat/planDraft'
import { resolveAgentPolicy } from '@/lib/chat/agentPolicy'
import type { AgentPolicy } from '@/lib/agent/automationPolicy'
import { type ChatMode } from '@/lib/agent/prompt-library'
import type { LLMProvider } from '@/lib/llm/types'

import { derivePlanningSessionDebugSummary } from '@/components/plan/PlanningSessionDebugCard'
import { resolveExplorerRevealTarget } from '@/lib/workbench-navigation'
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
  const { jobs, isAnyJobRunning, createAndExecute, cancelJob } = useJobs(projectId)

  const projectAgentPolicy = readAgentPolicyField(project, 'agentPolicy')
  const createChatMutation = useMutation(api.chats.create)
  const addMessageMutation = useMutation(api.messages.add)
  const updateChatMutation = useMutation(api.chats.update)
  const updateProjectMutation = useMutation(api.projects.update)
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
  const { handleRunCreated, handleRunCompleted } = useProjectAgentRunCallbacks({
    activePlanningSession,
    activeChat,
    updateChatMutation,
    markPlanningExecutionState: planningSession.markExecutionState,
    approvedPlanRunSessionsRef,
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
    onRunCreated: handleRunCreated,
    onRunCompleted: handleRunCompleted,
  })

  const { healthStatus, healthDetail, selectedChatModel } = buildProjectWorkspaceDerivedState({
    agent,
    isAnyJobRunning,
    selectedModel,
    uiSelectedModel,
  })
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
    autoApply: chatMode === 'build',
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

  useProjectRequestedFileSync({
    files,
    requestedFilePath,
    setSelectedFilePath,
    setSelectedFileLocation,
    setCursorPosition,
    setOpenTabs,
  })

  const { handleSelectChat, handleNewChat, handleResetWorkspace } = useProjectWorkspaceActions({
    projectId,
    chatMode,
    createChat: createChatMutation,
    setActiveChatId,
    setIsRightPanelOpen,
    setRightPanelTab,
    agent,
    setPlanDraft,
    setChatMode,
    notifyReset: () => {
      toast.success('Workspace reset', {
        description:
          'Local draft state was cleared. Persisted messages and artifacts remain available.',
      })
    },
  })

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

  const runtimePreview = project?.runtimePreview ?? null
  const {
    previewUrl,
    isPreviewRunning,
    handleOpenPreview,
    handleOpenTerminal,
    handleStartRuntime,
    handleStopRuntime,
  } = useProjectRuntimeControls({
    projectId,
    runtimePreview,
    files,
    jobs,
    createAndExecute,
    cancelJob,
    updateProjectRuntimePreview: (nextRuntimePreview) =>
      updateProjectMutation({ id: projectId, runtimePreview: nextRuntimePreview }),
    setActiveCenterTab,
    setIsBottomDockOpen,
    setActiveBottomDockTab,
    toast,
  })
  const { handleContextualChat, handleInlineChat } = useProjectInlineEditing({
    projectId: String(projectId),
    isRightPanelOpen,
    isMobileLayout,
    setContextualPrompt,
    setIsRightPanelOpen,
    setRightPanelTab,
    setMobilePrimaryPanel,
    runEvalScenario: agent.runEvalScenario,
  })

  const handleStartPlanningIntake = useProjectPlanningIntake({
    activeChatId: activeChat?._id,
    planningQuestions,
    startIntake: planningSession.startIntake,
    addMessage: addMessageMutation,
    setIsChatInspectorOpen,
    setChatInspectorTab,
    openRightPanelTab,
  })

  const chatPanelProps = buildProjectChatPanelProps({
    projectId,
    oversightLevel,
    onOversightLevelChange: setOversightLevel,
    activeChatId: activeChat?._id,
    activeChatPlanStatus: activeChat?.planStatus,
    activeChatPlanUpdatedAt: activeChat?.planUpdatedAt,
    activeChatPlanLastGeneratedAt: activeChat?.planLastGeneratedAt,
    activeChatExists: Boolean(activeChat?._id),
    chatMessages,
    runEvents,
    runHistoryCount: (runEvents ?? []).length,
    chatMode,
    architectBrainstormEnabled,
    onArchitectBrainstormEnabledChange: setArchitectBrainstormEnabled,
    onModeChange: handleModeChange,
    onSendMessage: handleSendMessage,
    onSuggestedAction: handleSuggestedAction,
    isStreaming: agent.isLoading,
    onStopStreaming: agent.stop,
    filePaths: files?.map((f) => f.path) ?? [],
    model: selectedChatModel,
    onModelChange: setUiSelectedModel,
    availableModels,
    variant: reasoningVariant,
    onVariantChange: setReasoningVariant,
    supportsReasoning,
    attachmentsEnabled: true,
    inlineRateLimitError,
    hasProvider: provider !== null,
    onToggleInspector: () => {
      openChatInspectorSurface(chatInspectorSurfaceTab)
    },
    onOpenHistory: () => {
      openChatInspectorSurface('run')
    },
    onOpenShare: () => setIsShareDialogOpen(true),
    onOpenPreview: () => setActiveCenterTab('preview'),
    onResetWorkspace: handleResetWorkspace,
    resetWorkspaceLabel: 'Clear Local Workspace',
    onNewChat: () => {
      void handleNewChat()
    },
    planDraft,
    onPlanReview: () => {
      openRightPanelTab('plan')
    },
    onPlanApprove: () => {
      void handleApprovePlan()
    },
    onBuildFromPlan: () => {
      void handleBuildFromPlan()
    },
    planApproveDisabled: !canApproveCurrentPlan || agent.isLoading,
    planBuildDisabled: !canBuildCurrentPlan || agent.isLoading,
    showInlinePlanReview: agentPolicy.showPlanReview,
    pendingSpec: agent.pendingSpec,
    onSpecApprove: agent.approvePendingSpec,
    onSpecEdit: openSpecApproval,
    onSpecCancel: agent.cancelPendingSpec,
    showInlineSpecReview: agentPolicy.showSpecReview,
    specSurfaceMode,
    onCloseSpecSurface: closeSpecSurface,
    onEditPendingSpec: agent.updatePendingSpecDraft,
    onExecutePendingSpec: (spec) => {
      agent.approvePendingSpec(spec)
      closeSpecSurface()
    },
    isMobileLayout,
    isInspectorOpen: isChatInspectorOpen,
    inspectorTab: chatInspectorSurfaceTab,
    planningSession: activePlanningSession,
    planningCurrentQuestion: planningSession.currentQuestion,
    onStartPlanningIntake: handleStartPlanningIntake,
    onAnswerPlanningQuestion: planningSession.answerQuestion,
    onClearPlanningIntake: () =>
      activePlanningSession?.sessionId ? planningSession.clearIntake() : Promise.resolve(null),
    onInspectorOpenChange: setIsChatInspectorOpen,
    onInspectorTabChange: setChatInspectorTab,
    liveSteps: liveRunSteps,
    tracePersistenceStatus: agent.tracePersistenceStatus,
    onOpenFile: handleFileSelect,
    onOpenArtifacts: () => {
      openRightPanelTab('review')
    },
    currentSpec: agent.currentSpec,
    onSpecClick: openSpecInspect,
    onPlanClick: () => {
      openRightPanelTab('plan')
    },
    onResumeRuntimeSession: agent.resumeRuntimeSession,
    snapshotEvents: snapshotRunEvents,
    subagentToolCalls,
    onPlanDraftChange: setPlanDraft,
    onSavePlanDraft: () => {
      void handleSavePlanDraft()
    },
    isSavingPlanDraft,
    memoryBank: agent.memoryBank,
    onSaveMemoryBank: agent.updateMemoryBank,
    lastUserPrompt: latestUserPrompt,
    onRunEvalScenario: agent.runEvalScenario,
    renderInspectorInline: false,
    contextualPrompt,
    onContextualPromptHandled: () => setContextualPrompt(null),
  })

  const chatPanelContent = <ProjectChatPanel {...chatPanelProps} />

  const rightPanelProps = buildWorkbenchRightPanelProps({
    projectId,
    activeTab: rightPanelTab,
    onTabChange: setRightPanelTab,
    activeChatId: activeChat?._id,
    activeChatPlanStatus: activeChat?.planStatus,
    activeChatPlanUpdatedAt: activeChat?.planUpdatedAt,
    activeChatPlanLastGeneratedAt: activeChat?.planLastGeneratedAt,
    chatMessages,
    runEvents,
    chatMode,
    architectBrainstormEnabled,
    onArchitectBrainstormEnabledChange: setArchitectBrainstormEnabled,
    onModeChange: handleModeChange,
    onSendMessage: handleSendMessage,
    onSuggestedAction: handleSuggestedAction,
    isStreaming: agent.isLoading,
    onStopStreaming: agent.stop ?? (() => {}),
    filePaths: files?.map((f) => f.path) ?? [],
    model: selectedChatModel,
    onModelChange: setUiSelectedModel,
    availableModels,
    variant: reasoningVariant,
    onVariantChange: setReasoningVariant,
    supportsReasoning,
    inlineRateLimitError,
    hasProvider: provider !== null,
    oversightLevel,
    onOversightLevelChange: setOversightLevel,
    isMobileLayout,
    isInspectorOpen: isChatInspectorOpen,
    inspectorTab: chatInspectorSurfaceTab,
    planningSession: activePlanningSession,
    planningCurrentQuestion: planningSession.currentQuestion,
    onStartPlanningIntake: handleStartPlanningIntake,
    onAnswerPlanningQuestion: planningSession.answerQuestion,
    onClearPlanningIntake: () =>
      activePlanningSession?.sessionId ? planningSession.clearIntake() : Promise.resolve(null),
    onInspectorOpenChange: setIsChatInspectorOpen,
    onInspectorTabChange: setChatInspectorTab,
    liveSteps: liveRunSteps,
    tracePersistenceStatus: agent.tracePersistenceStatus,
    onOpenFile: handleFileSelect,
    onOpenArtifacts: () => openRightPanelTab('review'),
    currentSpec: agent.currentSpec,
    onSpecClick: openSpecInspect,
    onPlanClick: () => openRightPanelTab('plan'),
    onResumeRuntimeSession: agent.resumeRuntimeSession,
    snapshotEvents: snapshotRunEvents,
    subagentToolCalls,
    planDraft,
    onPlanDraftChange: setPlanDraft,
    onSavePlanDraft: () => {
      void handleSavePlanDraft()
    },
    isSavingPlanDraft,
    memoryBank: agent.memoryBank,
    onSaveMemoryBank: agent.updateMemoryBank,
    lastUserPrompt: latestUserPrompt,
    lastAssistantReply: latestAssistantReply,
    onRunEvalScenario: agent.runEvalScenario,
    contextualPrompt,
    onContextualPromptHandled: () => setContextualPrompt(null),
    onToggleInspector: () => {
      openChatInspectorSurface(chatInspectorSurfaceTab)
    },
    onOpenHistory: () => {
      openChatInspectorSurface('run')
    },
    onOpenShare: () => setIsShareDialogOpen(true),
    onOpenPreview: () => setActiveCenterTab('preview'),
    onResetWorkspace: handleResetWorkspace,
    onNewChat: () => {
      void handleNewChat()
    },
    onPlanReview: () => {
      openRightPanelTab('plan')
    },
    onPlanApprove: () => {
      void handleApprovePlan()
    },
    onBuildFromPlan: () => {
      void handleBuildFromPlan()
    },
    planApproveDisabled: !canApproveCurrentPlan || agent.isLoading,
    planBuildDisabled: !canBuildCurrentPlan || agent.isLoading,
    showInlinePlanReview: agentPolicy.showPlanReview,
    pendingSpec: agent.pendingSpec,
    onSpecApprove: agent.approvePendingSpec,
    onSpecEdit: openSpecApproval,
    onSpecCancel: agent.cancelPendingSpec,
    showInlineSpecReview: agentPolicy.showSpecReview,
    specSurfaceMode,
    onCloseSpecSurface: closeSpecSurface,
    onEditPendingSpec: agent.updatePendingSpecDraft,
    onExecutePendingSpec: (spec) => {
      agent.approvePendingSpec(spec)
      closeSpecSurface()
    },
    openSpecApproval,
    openSpecInspect,
    planStatus: activeChat?.planStatus,
    canApprovePlan: canApproveCurrentPlan,
    canBuildPlan: canBuildCurrentPlan,
    lastSavedAt: activeChat?.planUpdatedAt,
    lastGeneratedAt: activeChat?.planLastGeneratedAt,
    planningDebug,
  })

  const rightPanelContent = <WorkbenchRightPanel {...rightPanelProps} />

  if (project === null) {
    return <ProjectNotFoundGuard />
  }

  if (project === undefined || !files) {
    return <ProjectLoadingGuard projectLoaded={project !== undefined} />
  }

  const workspaceContextValue = buildWorkspaceContextValue({
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
  })

  const layoutProps = buildProjectWorkspaceLayoutProps({
    projectId,
    activeChatId: activeChat?._id,
    files,
    selectedFilePath,
    selectedFileLocation,
    openTabs,
    onSelectFile: handleFileSelect,
    onCloseTab: handleTabClose,
    onCreateFile: handleFileCreate,
    onRenameFile: handleFileRename,
    onDeleteFile: handleFileDelete,
    onSaveFile: handleEditorSave,
    onEditorDirtyChange: handleEditorDirtyChange,
    isMobileLayout,
    isCompactDesktopLayout,
    mobilePrimaryPanel,
    onMobilePrimaryPanelChange: setMobilePrimaryPanel,
    mobileUnreadCount,
    isMobileKeyboardOpen,
    chatPanel: chatPanelContent,
    rightPanelContent,
    pendingArtifactPreview,
    pendingDiffEntries,
    onApplyPendingArtifact: handleApplyPendingArtifact,
    onRejectPendingArtifact: handleRejectPendingArtifact,
    chatMode,
    onModeChange: handleModeChange,
    cursorPosition,
    isStreaming: agent.isLoading,
    currentSpec: agent.currentSpec,
    openSpecInspect,
    onContextualChat: handleContextualChat,
    onInlineChat: handleInlineChat,
    isBottomDockOpen,
    onBottomDockOpenChange: setIsBottomDockOpen,
    activeBottomDockTab,
    onBottomDockTabChange: setActiveBottomDockTab,
    activeCenterTab,
    onCenterTabChange: setActiveCenterTab,
    isRightPanelOpen,
    activeTaskTitle:
      taskHeaderVisible && agent.isLoading ? (activeChat?.title ?? 'Active Task') : undefined,
    activeTaskStatus: taskHeaderVisible && agent.isLoading ? 'running' : undefined,
    changedFilesCount: pendingChangedFilesCount,
    onReviewChanges: () => {
      setActiveCenterTab('diff')
      openChatInspectorSurface('artifacts')
    },
    onStopAgent: () => agent.stop?.(),
    onStartAgent: () => {
      void handleNewChat()
    },
    previewUrl,
    isPreviewRunning,
    onOpenPreview: handleOpenPreview,
    onOpenTerminal: handleOpenTerminal,
  })

  const shellProps = buildProjectWorkspaceShellProps({
    workspaceContextValue,
    projectName: project.name,
    projectId,
    selectedFilePath,
    gitStatus,
    selectedModel,
    isAgentRunning: agent.isLoading,
    isAnyJobRunning,
    healthStatus,
    healthDetail,
    isRightPanelOpen,
    isFlyoutOpen,
    isRuntimeRunning: isPreviewRunning,
    onToggleFlyout: toggleFlyout,
    onToggleRightPanel: () => setIsRightPanelOpen((prev) => !prev),
    onNewTask: () => {
      void handleNewChat()
    },
    onStartRuntime: () => {
      void handleStartRuntime()
    },
    onStopRuntime: () => {
      void handleStopRuntime()
    },
    onOpenPreview: handleOpenPreview,
    onResetWorkspace: handleResetWorkspace,
    onOpenShareDialog: () => setIsShareDialogOpen(true),
    onRevealInExplorer: (folderPath) => {
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
    },
    onOpenCommandPalette: openCommandPalette,
    activeSidebarSection: activeSection,
    onSidebarSectionChange: handleSectionChange,
    shareDialogOpen: isShareDialogOpen,
    onShareDialogOpenChange: setIsShareDialogOpen,
    activeChatId: activeChat?._id,
    activeChatTitle: activeChat?.title,
    filesForPalette: files.map((file) => ({ path: file.path })),
    layoutProps,
    composerOpen: isComposerOpen,
    onComposerOpenChange: setIsComposerOpen,
    onComposerSubmit: (prompt, ctx) => handleSendMessage(prompt, 'build', ctx),
    shortcutHelpOpen: isShortcutHelpOpen,
    onShortcutHelpOpenChange: setIsShortcutHelpOpen,
  })

  return <ProjectWorkspaceShell {...shellProps} />
}
