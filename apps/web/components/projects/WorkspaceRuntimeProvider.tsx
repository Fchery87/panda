'use client'

import { useCallback, useMemo, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useMutation, useQuery } from 'convex/react'
import { toast } from 'sonner'

import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'

import { ProjectWorkspaceShell } from '@/components/projects/ProjectWorkspaceShell'
import { derivePlanningSessionDebugSummary } from '@/components/plan/PlanningSessionDebugCard'
import {
  findLatestRecoverableCheckpoint,
  type RuntimeCheckpointSummary,
} from '@/components/chat/runtime-checkpoints'
import { AgentRuntimeProvider } from '@/contexts/AgentRuntimeContext'
import { WorkspaceRuntimeProvider as WorkspaceRuntimeContextProvider } from '@/contexts/WorkspaceRuntimeContext'
import { useCommandPaletteStore } from '@/stores/commandPaletteStore'
import { useChatSessionStore } from '@/stores/chatSessionStore'
import { useEditorContextStore } from '@/stores/editorContextStore'

import { useGit } from '@/hooks/useGit'
import { useJobs } from '@/hooks/useJobs'
import { useAgent } from '@/hooks/useAgent'
import { useSidebar } from '@/hooks/useSidebar'
import { useProjectChatSession } from '@/hooks/useProjectChatSession'
import { useProjectMessageWorkflow } from '@/hooks/useProjectMessageWorkflow'
import { getAuthoritativePlanDraftValue, useProjectPlanDraft } from '@/hooks/useProjectPlanDraft'
import { useProjectPlanningSession } from '@/hooks/useProjectPlanningSession'
import { useProjectWorkbenchFiles } from '@/hooks/useProjectWorkbenchFiles'
import { useArtifactLifecycle } from '@/hooks/useArtifactLifecycle'
import { usePlanArtifactSync } from '@/hooks/usePlanArtifactSync'
import { useWorkbenchChatState } from '@/hooks/useWorkbenchChatState'
import { useWorkbenchPanelState } from '@/hooks/useWorkbenchPanelState'
import { useProjectInlineEditing } from '@/hooks/useProjectInlineEditing'
import { useProjectPlanningIntake } from '@/hooks/useProjectPlanningIntake'
import { useProjectRuntimeControls } from '@/hooks/useProjectRuntimeControls'
import { useProjectRequestedFileSync } from '@/hooks/useProjectRequestedFileSync'
import { useProjectWorkspaceActions } from '@/hooks/useProjectWorkspaceActions'
import { useProjectAgentRunCallbacks } from '@/hooks/useProjectAgentRunCallbacks'
import { useProjectShellWiring } from '@/hooks/useProjectShellWiring'
import { useProjectShellUiState } from '@/hooks/useProjectShellUiState'
import { useExecutionSessionFocusState } from '@/hooks/useExecutionSessionFocusState'
import { useProjectRuntimeFileMount } from '@/hooks/useProjectRuntimeFileMount'
import { useImportLocalWorkspace } from '@/hooks/useImportLocalWorkspace'
import { useWorkspaceShellHotkeys } from '@/hooks/useWorkspaceShellHotkeys'
import { useProjectWorkspaceLayoutProps } from '@/hooks/useProjectWorkspaceLayoutProps'
import { useWorkspaceRuntimeValue } from '@/hooks/useWorkspaceRuntimeValue'
import { useWebcontainer } from '@/lib/webcontainer/WebcontainerProvider'
import { writeFileToContainer } from '@/lib/webcontainer/fs-sync'
import type { PlanStatus } from '@/lib/chat/planDraft'
import { resolveAgentPolicy } from '@/lib/chat/agentPolicy'
import type { AgentPolicy } from '@/lib/agent/automationPolicy'
import type { ChatMode } from '@/lib/agent/prompt-library'
import type { LLMProvider } from '@/lib/llm/types'
import { buildDefaultPlanningQuestions } from '@/lib/planning/question-engine'
import type { Message } from '@/components/chat/types'
import { resolveRuntimeAvailability } from '@/lib/workspace/runtime-availability'
import { buildExecutionSessionViewModel } from '@/lib/workspace/execution-session-view-model'

interface ProjectFileMetadata {
  _id: Id<'files'>
  _creationTime: number
  projectId: Id<'projects'>
  path: string
  content?: string | null
  isBinary?: boolean
  updatedAt: number
}

interface Chat {
  _id: Id<'chats'>
  _creationTime: number
  projectId: Id<'projects'>
  title?: string
  mode: ChatMode
  createdAt: number
  updatedAt: number
}

interface Project {
  _id: Id<'projects'>
  name: string
  description?: string
  agentPolicy?: AgentPolicy
  agentDefaults?: AgentPolicy
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
  config: { provider: 'anthropic', auth: { apiKey: '' } },
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

interface WorkspaceRuntimeProviderProps {
  projectId: Id<'projects'>
  project: Project
  files: ProjectFileMetadata[]
  chats: Chat[] | undefined
}

export function WorkspaceRuntimeProvider({
  projectId,
  project,
  files,
  chats,
}: WorkspaceRuntimeProviderProps) {
  const searchParams = useSearchParams()
  const webcontainer = useWebcontainer()

  const openCommandPalette = useCommandPaletteStore((state) => state.open)
  const { status: gitStatus, refreshStatus: refreshGitStatus } = useGit()
  const githubShellSummary = useQuery(api.githubConnections.getProjectShellSummary, { projectId })

  const {
    isMobileLayout,
    isCompactDesktopLayout,
    mobilePrimaryPanel,
    mobileUnreadCount,
    isMobileKeyboardOpen,
    setSpecSurfaceMode,
    isShareDialogOpen,
    setShareDialogOpen,
    isComposerOpen,
    setComposerOpen,
    isShortcutHelpOpen,
    setShortcutHelpOpen,
    isBottomDockOpen: _isBottomDockOpen,
    activeBottomDockTab,
    setActiveBottomDockTab,
    activeCenterTab,
    setActiveCenterTab,
    isRightPanelOpen,
    setRightPanelTab,
    setRightPanelTabFromAction: handleSetRightPanelTab,
    setRightPanelOpenFromAction: handleSetRightPanelOpen,
    setBottomDockOpenFromAction: handleSetBottomDockOpen,
    setMobilePrimaryPanelFromAction: handleSetMobilePrimaryPanel,
    setMobileKeyboardOpenFromAction: handleSetMobileKeyboardOpen,
    setMobileUnreadCountFromAction: handleSetMobileUnreadCount,
    setWorkspaceFocusMode,
  } = useProjectShellUiState()

  const { oversightLevel, setContextualPrompt } = useChatSessionStore()

  const {
    selectedFilePath,
    selectedFileLocation,
    openTabs,
    cursorPosition,
    setSelectedFilePath,
    setSelectedFileLocation,
    setOpenTabs,
    setCursorPosition,
  } = useEditorContextStore()

  const { openRightPanelTab } = useWorkbenchPanelState({
    isMobileLayout,
    setRightPanelTab: handleSetRightPanelTab,
    setIsRightPanelOpen: handleSetRightPanelOpen,
    setMobilePrimaryPanel: handleSetMobilePrimaryPanel,
    setIsMobileKeyboardOpen: handleSetMobileKeyboardOpen,
  })

  const { activeSection, isFlyoutOpen, handleSectionChange, toggleFlyout } = useSidebar()

  const approvedPlanRunSessionsRef = useRef(new Map<string, string>())
  const promptHistoryMessagesRef = useRef<Message[]>([])

  const writeFileToRuntime = useMemo(
    () =>
      webcontainer.status === 'ready' && webcontainer.instance
        ? (path: string, nextContent: string) =>
            writeFileToContainer(webcontainer.instance!, path, nextContent)
        : undefined,
    [webcontainer.instance, webcontainer.status]
  )
  const runtimeAvailability = useMemo(
    () => resolveRuntimeAvailability({ status: webcontainer.status, error: webcontainer.error }),
    [webcontainer.error, webcontainer.status]
  )

  useWorkspaceShellHotkeys()

  const projectAgentPolicy = readAgentPolicyField(project, 'agentPolicy')
  const createChatMutation = useMutation(api.chats.create)
  const addMessageMutation = useMutation(api.messages.add)
  const updateChatMutation = useMutation(api.chats.update)
  const importWorkspaceFileMutation = useMutation(api.files.upsert)
  const updateProjectMutation = useMutation(api.projects.update)

  const {
    setActiveChatId,
    activeChat,
    chatMode,
    setChatMode,
    architectBrainstormEnabled,
    uiSelectedModel,
    provider,
    selectedModel,
    availableModels,
    supportsReasoning,
    effectiveAutomationPolicy,
    effectiveCommandFamilyPolicy,
    autoModeSwitchPolicy,
  } = useProjectChatSession({ projectId, chats, projectAgentPolicy })

  const planningSession = useProjectPlanningSession({ activeChatId: activeChat?._id ?? null })
  const activePlanningSession = planningSession.session
  const planningQuestions =
    activePlanningSession?.questions ?? buildDefaultPlanningQuestions({ projectName: project.name })

  const agentPolicy = useMemo(
    () => resolveAgentPolicy({ chatMode, oversightLevel }),
    [chatMode, oversightLevel]
  )

  const persistedPlanDraft = getAuthoritativePlanDraftValue({
    activePlanningSession: activePlanningSession
      ? {
          sessionId: activePlanningSession.sessionId,
          generatedPlan: activePlanningSession.generatedPlan,
        }
      : null,
  })

  const { handleRunCreated, handleRunCompleted } = useProjectAgentRunCallbacks({
    activePlanningSession,
    markPlanningExecutionState: planningSession.markExecutionState,
    approvedPlanRunSessionsRef,
  })

  const handleAutoModeSwitch = useCallback(
    async ({
      toMode,
    }: {
      fromMode: ChatMode
      toMode: ChatMode
      confidence: string
      rationale: string
    }) => {
      setChatMode(toMode)
      if (activeChat && activeChat.mode !== toMode) {
        await updateChatMutation({ id: activeChat._id, mode: toMode })
      }
    },
    [activeChat, setChatMode, updateChatMutation]
  )

  const agent = useAgent({
    chatId: activeChat?._id as Id<'chats'>,
    projectId,
    projectName: project.name,
    projectDescription: project.description,
    mode: chatMode,
    architectBrainstormEnabled,
    provider: provider ?? FALLBACK_PROVIDER,
    model: selectedModel,
    planDraft: persistedPlanDraft,
    hydratePersistedMessages: false,
    getPromptHistoryMessages: () =>
      promptHistoryMessagesRef.current.map((message) => ({
        role: message.role === 'system' ? 'assistant' : message.role,
        content: message.content,
        mode: message.annotations?.mode,
        toolCalls: message.toolCalls,
      })),
    automationPolicy: effectiveAutomationPolicy,
    commandFamilyPolicy: effectiveCommandFamilyPolicy,
    specApprovalMode: agentPolicy.specApprovalMode,
    autoModeSwitchPolicy,
    onRunCreated: handleRunCreated,
    onRunCompleted: handleRunCompleted,
    onAutoModeSwitch: handleAutoModeSwitch,
    webcontainer: webcontainer.status === 'ready' ? webcontainer.instance : null,
  })

  const selectedChatModel = uiSelectedModel || selectedModel

  const { planDraft, setPlanDraft, isSavingPlanDraft, handleSavePlanDraft, handleApprovePlan } =
    useProjectPlanDraft({
      activeChat,
      activePlanningSession,
      chatMode,
      architectBrainstormEnabled,
      agentStatus: agent.status,
      agentMessages: agent.messages,
      acceptPlanningSession: planningSession.acceptPlan,
    })

  const canApproveCurrentPlan = planningSession.canApprove
  const canBuildCurrentPlan = planningSession.canBuild

  const normalizedPlanStatus: PlanStatus | undefined = planningSession.canApprove
    ? 'awaiting_review'
    : planningSession.generatedPlan?.status === 'accepted'
      ? 'approved'
      : planningSession.generatedPlan?.status === 'executing'
        ? 'executing'
        : planningSession.generatedPlan?.status === 'completed'
          ? 'completed'
          : planningSession.generatedPlan?.status === 'failed'
            ? 'failed'
            : undefined

  const healthStatus = agent.error
    ? ('error' as const)
    : agent.isLoading || !runtimeAvailability.canUseBrowserRuntime
      ? ('issues' as const)
      : ('ready' as const)
  const runtimeHealthDetail = runtimeAvailability.canUseBrowserRuntime
    ? 'Browser runtime ready'
    : `Browser runtime unavailable; using ${runtimeAvailability.label.toLowerCase()} fallback${
        runtimeAvailability.detail ? ` (${runtimeAvailability.detail})` : ''
      }`
  const healthDetail = agent.error
    ? `Agent execution encountered an error • ${runtimeHealthDetail}`
    : agent.isLoading
      ? `Agent is actively working • ${runtimeHealthDetail}`
      : `Workspace systems nominal • ${runtimeHealthDetail}`

  const { handleSendMessage, handleSuggestedAction, handleBuildFromPlan, handleModeChange } =
    useProjectMessageWorkflow({
      projectId,
      activeChat,
      chatMode,
      setChatMode,
      approvedPlanArtifact: activePlanningSession?.generatedPlan ?? null,
      activePlanningSessionId: activePlanningSession?.sessionId ?? null,
      providerAvailable: Boolean(provider),
      createChatMutation,
      updateChatMutation,
      markPlanningExecutionState: ({ sessionId, state }) =>
        planningSession.markExecutionState({ sessionId, state }),
      sendAgentMessage: agent.sendMessage,
      setActiveChatId,
      setMobilePrimaryPanel: handleSetMobilePrimaryPanel,
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
    autoApply: false,
    selectedFilePath,
    writeFileToRuntime,
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
    setMobilePrimaryPanel: handleSetMobilePrimaryPanel,
    setWorkspaceFocusMode,
    setActiveCenterTab,
  })

  const requestedFilePath = searchParams.get('filePath')
  const selectedFile = useQuery(
    api.files.getByPath,
    selectedFilePath ? { projectId, path: selectedFilePath } : 'skip'
  )
  const selectedFileContentLoaded = !selectedFilePath || selectedFile !== undefined
  const selectedFileContent = selectedFile?.content ?? ''

  useProjectRequestedFileSync({
    files,
    requestedFilePath,
    selectedFilePath,
    openTabs,
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
    latestRunReceipt,
    chatMessages,
    liveRunSteps,
    snapshotRunEvents,
    subagentToolCalls,
    latestUserPrompt,
    latestAssistantReply,
    inlineRateLimitError,
  } = useWorkbenchChatState({
    activeChat,
    chatMode,
    agent,
    onPersistedMessagesChange: (messages) => {
      promptHistoryMessagesRef.current = messages
    },
    isMobileLayout,
    mobilePrimaryPanel,
    setMobileUnreadCount: handleSetMobileUnreadCount,
    _setIsRightPanelOpen: handleSetRightPanelOpen,
    _setMobilePrimaryPanel: handleSetMobilePrimaryPanel,
    _setRightPanelTab: handleSetRightPanelTab,
  })

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
    setMobilePrimaryPanel: handleSetMobilePrimaryPanel,
    setWorkspaceFocusMode,
    setActiveCenterTab,
    writeFileToRuntime,
  })

  const { jobs, isAnyJobRunning, createAndExecute, cancelJob } = useJobs(projectId)

  const { isRuntimeRunning, handleOpenTerminal, handleStartRuntime, handleStopRuntime } =
    useProjectRuntimeControls({
      projectId,
      files,
      jobs,
      createAndExecute,
      cancelJob,
      setIsBottomDockOpen: handleSetBottomDockOpen,
      setActiveBottomDockTab,
      toast,
    })

  useProjectRuntimeFileMount({
    projectId,
    files,
    webcontainerStatus: webcontainer.status,
    webcontainerInstance: webcontainer.instance,
  })

  const { handleContextualChat, handleInlineChat } = useProjectInlineEditing({
    projectId: String(projectId),
    isMobileLayout,
    setContextualPrompt,
    setMobilePrimaryPanel: handleSetMobilePrimaryPanel,
    runEvalScenario: agent.runEvalScenario,
  })

  const handleStartPlanningIntake = useProjectPlanningIntake({
    activeChatId: activeChat?._id,
    planningQuestions,
    startIntake: planningSession.startIntake,
    addMessage: addMessageMutation,
    openRightPanelTab,
  })

  useProjectShellWiring({
    projectId,
    agentIsLoading: agent.isLoading,
    refreshGitStatus,
  })

  const runtimeCheckpoints = useQuery(
    api.agentRuns.listRuntimeCheckpointSummaries,
    activeChat?._id ? { chatId: activeChat._id, limit: 6 } : 'skip'
  ) as RuntimeCheckpointSummary[] | undefined

  const latestRecoverableCheckpoint = findLatestRecoverableCheckpoint(runtimeCheckpoints)

  const executionSession = useMemo(() => {
    const latestStep = [...liveRunSteps].reverse().find((step) => step.content?.trim())

    return buildExecutionSessionViewModel({
      chatTitle: activeChat?.title,
      latestUserPrompt,
      planningQuestion: planningSession.currentQuestion,
      generatedPlan: activePlanningSession?.generatedPlan ?? null,
      canApprovePlan: canApproveCurrentPlan,
      canBuildPlan: canBuildCurrentPlan,
      isExecuting: agent.isLoading,
      latestRunStep: latestStep?.content,
      changedFilesCount: pendingChangedFilesCount,
      runtimeAvailability,
      tracePersistenceStatus: agent.tracePersistenceStatus,
      latestRuntimeCheckpoint: latestRecoverableCheckpoint,
    })
  }, [
    activeChat?.title,
    activePlanningSession?.generatedPlan,
    agent.isLoading,
    canApproveCurrentPlan,
    canBuildCurrentPlan,
    latestUserPrompt,
    latestRecoverableCheckpoint,
    liveRunSteps,
    pendingChangedFilesCount,
    planningSession.currentQuestion,
    runtimeAvailability,
    agent.tracePersistenceStatus,
  ])

  // --- Assemble context value ---

  const handleToggleYolo = useCallback(async () => {
    const next = !(effectiveAutomationPolicy.yoloCommandMode ?? true)
    try {
      await updateProjectMutation({
        id: projectId,
        agentPolicy: {
          ...projectAgentPolicy,
          autoApplyFiles: effectiveAutomationPolicy.autoApplyFiles,
          autoRunCommands: effectiveAutomationPolicy.autoRunCommands,
          allowedCommandPrefixes: effectiveAutomationPolicy.allowedCommandPrefixes,
          yoloCommandMode: next,
        },
      })
    } catch {
      toast.error('Failed to update YOLO mode')
    }
  }, [effectiveAutomationPolicy, projectAgentPolicy, projectId, updateProjectMutation])

  const runtimeValue = useWorkspaceRuntimeValue({
    projectId,
    projectName: project.name,
    activeChatId: activeChat?._id,
    activeChatTitle: activeChat?.title,
    activeChatExists: Boolean(activeChat?._id),
    activeChatPlanStatus: normalizedPlanStatus,
    activeChatPlanUpdatedAt: activePlanningSession?.updatedAt,
    activeChatPlanLastGeneratedAt: activePlanningSession?.generatedPlan?.generatedAt,
    executionSession,
    chatMessages,
    runEvents,
    latestRunReceipt,
    liveSteps: liveRunSteps,
    snapshotEvents: snapshotRunEvents,
    subagentToolCalls,
    inlineRateLimitError,
    lastUserPrompt: latestUserPrompt,
    lastAssistantReply: latestAssistantReply,
    isStreaming: agent.isLoading,
    workspaceReady: agent.workspaceReady,
    currentSpec: agent.currentSpec,
    memoryBank: agent.memoryBank,
    tracePersistenceStatus: agent.tracePersistenceStatus,
    runtimeCheckpoints,
    model: selectedChatModel,
    selectedModel,
    availableModels,
    supportsReasoning,
    hasProvider: provider !== null,
    yoloCommandMode: effectiveAutomationPolicy.yoloCommandMode ?? true,
    onToggleYolo: handleToggleYolo,
    files,
    pendingDiffEntries,
    planDraft,
    isSavingPlanDraft,
    planApproveDisabled: !canApproveCurrentPlan || agent.isLoading,
    planBuildDisabled: !canBuildCurrentPlan || agent.isLoading,
    showInlinePlanReview: agentPolicy.showPlanReview,
    planStatus: normalizedPlanStatus,
    canApprovePlan: canApproveCurrentPlan,
    canBuildPlan: canBuildCurrentPlan,
    lastSavedAt: activePlanningSession?.updatedAt,
    lastGeneratedAt: activePlanningSession?.generatedPlan?.generatedAt,
    planningDebug,
    planningSession: activePlanningSession ?? null,
    planningCurrentQuestion: planningSession.currentQuestion,
    isAnyJobRunning,
    isRuntimeRunning,
    isAgentRunning: agent.isLoading,
    gitStatus,
    githubShellSummary,
    healthStatus,
    healthDetail,
    composerOpen: isComposerOpen,
    shortcutHelpOpen: isShortcutHelpOpen,
    isFlyoutOpen,
    activeSection,
    openRightPanelTab,
    onSendMessage: handleSendMessage,
    onSuggestedAction: handleSuggestedAction,
    onAskUserAnswer: agent.answerAskUser,
    onModeChange: handleModeChange,
    stopStreaming: agent.stop,
    onResumeRuntimeSession: agent.resumeRuntimeSession,
    onRunEvalScenario: agent.runEvalScenario,
    onSaveMemoryBank: agent.updateMemoryBank,
    onPlanApprove: handleApprovePlan,
    onBuildFromPlan: handleBuildFromPlan,
    onPlanDraftChange: setPlanDraft,
    savePlanDraft: handleSavePlanDraft,
    onStartPlanningIntake: handleStartPlanningIntake,
    onAnswerPlanningQuestion: planningSession.answerQuestion,
    hasActivePlanningSession: Boolean(activePlanningSession?.sessionId),
    clearPlanningIntake: planningSession.clearIntake,
    onOpenFile: handleFileSelect,
    onResetWorkspace: handleResetWorkspace,
    newChat: handleNewChat,
    sendComposerMessage: handleSendMessage,
    onToggleFlyout: toggleFlyout,
    startRuntime: handleStartRuntime,
    stopRuntime: handleStopRuntime,
    isMobileLayout,
    onOpenCommandPalette: openCommandPalette,
    onSidebarSectionChange: handleSectionChange,
    onComposerOpenChange: setComposerOpen,
    onShortcutHelpOpenChange: setShortcutHelpOpen,
    writeFileToRuntime,
    setSelectedFilePath,
    setSelectedFileLocation,
    setCursorPosition,
  })

  const { workspaceFocusState, handleFocusPrimaryAction, handleFocusSecondaryAction } =
    useExecutionSessionFocusState({
      executionSession,
      handleBuildFromPlan,
      openRightPanelTab,
      setActiveCenterTab,
    })

  const handleImportLocalWorkspace = useImportLocalWorkspace({
    projectId,
    importWorkspaceFile: importWorkspaceFileMutation,
  })

  const layoutProps = useProjectWorkspaceLayoutProps({
    projectId,
    activeChatId: activeChat?._id,
    activeChatTitle: activeChat?.title,
    activeSection,
    isFlyoutOpen,
    onSidebarSectionChange: handleSectionChange,
    onToggleFlyout: toggleFlyout,
    onSelectChat: handleSelectChat,
    onNewChat: handleNewChat,
    files,
    selectedFileContent,
    selectedFileContentLoaded,
    selectedFilePath,
    selectedFileLocation,
    openTabs,
    onSelectFile: handleFileSelect,
    onCloseTab: handleTabClose,
    onCreateFile: handleFileCreate,
    onRenameFile: handleFileRename,
    onDeleteFile: handleFileDelete,
    onImportLocalWorkspace: files.length === 0 ? handleImportLocalWorkspace : undefined,
    onSaveFile: handleEditorSave,
    onEditorDirtyChange: handleEditorDirtyChange,
    isMobileLayout,
    isCompactDesktopLayout,
    mobilePrimaryPanel,
    onMobilePrimaryPanelChange: handleSetMobilePrimaryPanel,
    onMobileReviewTabChange: setRightPanelTab,
    mobileUnreadCount,
    isMobileKeyboardOpen,
    pendingArtifactPreview,
    pendingDiffEntries,
    onApplyPendingArtifact: handleApplyPendingArtifact,
    onRejectPendingArtifact: handleRejectPendingArtifact,
    chatMode,
    onModeChange: handleModeChange,
    cursorPosition,
    isStreaming: agent.isLoading,
    currentSpec: agent.currentSpec,
    openSpecInspect: () => setSpecSurfaceMode('inspect'),
    onContextualChat: handleContextualChat,
    onInlineChat: handleInlineChat,
    onApprovePlan: handleApprovePlan,
    onBuildFromPlan: handleBuildFromPlan,
    onPlanDraftChange: setPlanDraft,
    onSavePlanDraft: () => {
      void handleSavePlanDraft()
    },
    isSavingPlanDraft,
    planApproveDisabled: !canApproveCurrentPlan || agent.isLoading,
    planBuildDisabled: !canBuildCurrentPlan || agent.isLoading,
    isBottomDockOpen: _isBottomDockOpen,
    onBottomDockOpenChange: handleSetBottomDockOpen,
    activeBottomDockTab,
    onBottomDockTabChange: setActiveBottomDockTab,
    activeCenterTab,
    onCenterTabChange: setActiveCenterTab,
    isRightPanelOpen,
    activeTaskStatus: agent.isLoading ? 'running' : undefined,
    changedFilesCount: pendingChangedFilesCount,
    onReviewChanges: () => {
      setActiveCenterTab('diff')
      openRightPanelTab('changes')
    },
    onStopAgent: () => agent.stop?.(),
    onStartAgent: handleNewChat,
    onOpenTerminal: handleOpenTerminal,
    focusState: workspaceFocusState,
    onFocusPrimaryAction: handleFocusPrimaryAction,
    onFocusSecondaryAction: handleFocusSecondaryAction,
    webcontainerStatus: runtimeAvailability.providerStatus,
  })

  return (
    <WorkspaceRuntimeContextProvider value={runtimeValue}>
      <AgentRuntimeProvider
        value={{
          agent,
          approvePlan: handleApprovePlan,
          cancelPlan: agent.cancelPendingSpec,
          buildFromPlan: handleBuildFromPlan,
        }}
      >
        <ProjectWorkspaceShell
          projectId={projectId}
          layoutProps={layoutProps}
          shareDialogOpen={isShareDialogOpen}
          onShareDialogOpenChange={setShareDialogOpen}
          activeChatId={activeChat?._id}
          activeChatTitle={activeChat?.title}
        />
      </AgentRuntimeProvider>
    </WorkspaceRuntimeContextProvider>
  )
}
