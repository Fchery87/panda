'use client'

import { useCallback, useEffect, useMemo, useRef, type SetStateAction } from 'react'
import { useSearchParams } from 'next/navigation'
import { useConvex, useMutation, useQuery } from 'convex/react'
import { toast } from 'sonner'
import { useHotkeys } from 'react-hotkeys-hook'

import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'

import { ProjectWorkspaceShell } from '@/components/projects/ProjectWorkspaceShell'
import { ProjectChatPanel } from '@/components/projects/ProjectChatPanel'
import { WorkbenchRightPanel } from '@/components/workbench/WorkbenchRightPanel'
import { derivePlanningSessionDebugSummary } from '@/components/plan/PlanningSessionDebugCard'
import { AgentRuntimeProvider } from '@/contexts/AgentRuntimeContext'
import { WorkspaceRuntimeProvider as WorkspaceRuntimeContextProvider } from '@/contexts/WorkspaceRuntimeContext'
import { useCommandPaletteStore } from '@/stores/commandPaletteStore'
import { useChatSessionStore } from '@/stores/chatSessionStore'
import { useEditorContextStore } from '@/stores/editorContextStore'
import { useWorkspaceUiStore, type RightPanelTab } from '@/stores/workspaceUiStore'
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
import { useWebcontainer } from '@/lib/webcontainer/WebcontainerProvider'
import { mountProjectFiles, writeFileToContainer } from '@/lib/webcontainer/fs-sync'
import type { PlanStatus } from '@/lib/chat/planDraft'
import { resolveAgentPolicy } from '@/lib/chat/agentPolicy'
import type { AgentPolicy } from '@/lib/agent/automationPolicy'
import type { ChatMode } from '@/lib/agent/prompt-library'
import type { LLMProvider } from '@/lib/llm/types'
import { resolveExplorerRevealTarget } from '@/lib/workbench-navigation'
import { buildDefaultPlanningQuestions } from '@/lib/planning/question-engine'
import type { WorkspaceFocusState } from '@/components/workbench/workspace-focus'
import type { Message } from '@/components/chat/types'
import { resolveRuntimeAvailability } from '@/lib/workspace/runtime-availability'

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
  const convex = useConvex()
  const webcontainer = useWebcontainer()
  const mountedRuntimeProjectRef = useRef<string | null>(null)

  const openCommandPalette = useCommandPaletteStore((state) => state.open)
  const { status: gitStatus, refreshStatus: refreshGitStatus } = useGit()

  const {
    isMobileLayout,
    isCompactDesktopLayout,
    mobilePrimaryPanel,
    setMobilePrimaryPanel,
    mobileUnreadCount,
    setMobileUnreadCount,
    isMobileKeyboardOpen,
    setIsMobileKeyboardOpen,
    setSpecSurfaceMode,
    isShareDialogOpen,
    setShareDialogOpen,
    isComposerOpen,
    setComposerOpen,
    isShortcutHelpOpen,
    setShortcutHelpOpen,
    isBottomDockOpen: _isBottomDockOpen,
    setBottomDockOpen,
    activeBottomDockTab,
    setActiveBottomDockTab,
    activeCenterTab,
    setActiveCenterTab,
    isRightPanelOpen,
    setRightPanelOpen,
    setRightPanelTab,
  } = useWorkspaceUiStore()

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

  const handleSetRightPanelTab = useCallback(
    (tab: SetStateAction<RightPanelTab>) => {
      const next =
        typeof tab === 'function' ? tab(useWorkspaceUiStore.getState().rightPanelTab) : tab
      if (next !== useWorkspaceUiStore.getState().rightPanelTab) setRightPanelTab(next)
    },
    [setRightPanelTab]
  )
  const handleSetRightPanelOpen = useCallback(
    (open: boolean | ((prev: boolean) => boolean)) => {
      const prev = useWorkspaceUiStore.getState().isRightPanelOpen
      const next = typeof open === 'function' ? open(prev) : open
      if (next !== prev) setRightPanelOpen(next)
    },
    [setRightPanelOpen]
  )
  const handleSetBottomDockOpen = useCallback(
    (open: boolean | ((prev: boolean) => boolean)) => {
      const prev = useWorkspaceUiStore.getState().isBottomDockOpen
      const next = typeof open === 'function' ? open(prev) : open
      if (next !== prev) setBottomDockOpen(next)
    },
    [setBottomDockOpen]
  )
  const handleSetMobilePrimaryPanel = useCallback(
    (panel: SetStateAction<typeof mobilePrimaryPanel>) => {
      const prev = useWorkspaceUiStore.getState().mobilePrimaryPanel
      const next = typeof panel === 'function' ? panel(prev) : panel
      if (next !== prev) setMobilePrimaryPanel(next)
      if (next === 'review') {
        const state = useWorkspaceUiStore.getState()
        if (state.rightPanelTab === 'chat') {
          setRightPanelTab('run')
        }
      }
    },
    [setMobilePrimaryPanel, setRightPanelTab]
  )
  const handleSetMobileKeyboardOpen = useCallback(
    (open: SetStateAction<boolean>) => {
      const prev = useWorkspaceUiStore.getState().isMobileKeyboardOpen
      const next = typeof open === 'function' ? open(prev) : open
      if (next !== prev) setIsMobileKeyboardOpen(next)
    },
    [setIsMobileKeyboardOpen]
  )
  const handleSetMobileUnreadCount = useCallback(
    (count: SetStateAction<number>) => {
      const prev = useWorkspaceUiStore.getState().mobileUnreadCount
      const next = typeof count === 'function' ? count(prev) : count
      if (next !== prev) setMobileUnreadCount(next)
    },
    [setMobileUnreadCount]
  )

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

  useHotkeys(
    'mod+i',
    (e) => {
      e.preventDefault()
      const state = useWorkspaceUiStore.getState()
      state.setComposerOpen(!state.isComposerOpen)
    },
    { enableOnFormTags: ['INPUT', 'TEXTAREA'] }
  )
  useHotkeys(
    'mod+/',
    (e) => {
      e.preventDefault()
      const state = useWorkspaceUiStore.getState()
      state.setShortcutHelpOpen(!state.isShortcutHelpOpen)
    },
    { enableOnFormTags: ['INPUT', 'TEXTAREA'] }
  )

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
    uiSelectedModel,
    provider,
    selectedModel,
    availableModels,
    supportsReasoning,
    effectiveAutomationPolicy,
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
    specApprovalMode: agentPolicy.specApprovalMode,
    onRunCreated: handleRunCreated,
    onRunCompleted: handleRunCompleted,
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
    : agent.isLoading
      ? ('issues' as const)
      : ('ready' as const)
  const healthDetail = agent.error
    ? 'Agent execution encountered an error'
    : agent.isLoading
      ? 'Agent is actively working'
      : 'Workspace systems nominal'

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
    openTabs,
    setOpenTabs,
    setSelectedFilePath,
    setSelectedFileLocation,
    setCursorPosition,
    setMobilePrimaryPanel,
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
    setMobilePrimaryPanel,
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
    setIsRightPanelOpen: handleSetRightPanelOpen,
    setRightPanelTab: handleSetRightPanelTab,
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

  useEffect(() => {
    if (webcontainer.status !== 'ready' || !webcontainer.instance) return
    if (mountedRuntimeProjectRef.current === projectId) return

    mountedRuntimeProjectRef.current = projectId
    const instance = webcontainer.instance
    const filePaths = files.map((file) => file.path)

    void convex
      .query(api.files.batchGet, { projectId, paths: filePaths })
      .then((runtimeFiles) => {
        const filesToMount = runtimeFiles
          .filter((file) => file.exists && file.content !== null)
          .map((file) => ({ path: file.path, content: file.content }))

        return mountProjectFiles(instance, filesToMount)
      })
      .catch((error) => {
        mountedRuntimeProjectRef.current = null
        toast.error('Failed to mount project files', {
          description: error instanceof Error ? error.message : 'Unknown error',
        })
      })
  }, [convex, files, projectId, webcontainer.instance, webcontainer.status])

  const { handleContextualChat, handleInlineChat } = useProjectInlineEditing({
    projectId: String(projectId),
    isRightPanelOpen,
    isMobileLayout,
    setContextualPrompt,
    setIsRightPanelOpen: handleSetRightPanelOpen,
    setRightPanelTab: handleSetRightPanelTab,
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

  // --- Assemble context value ---

  const runtimeValue = useMemo(
    () => ({
      // Identity
      projectId,
      projectName: project.name,

      // Active chat
      activeChatId: activeChat?._id,
      activeChatTitle: activeChat?.title,
      activeChatExists: Boolean(activeChat?._id),
      activeChatPlanStatus: normalizedPlanStatus,
      activeChatPlanUpdatedAt: activePlanningSession?.updatedAt,
      activeChatPlanLastGeneratedAt: activePlanningSession?.generatedPlan?.generatedAt,

      // Chat state
      chatMessages,
      runEvents,
      latestRunReceipt,
      liveSteps: liveRunSteps,
      snapshotEvents: snapshotRunEvents,
      subagentToolCalls,
      inlineRateLimitError,
      lastUserPrompt: latestUserPrompt,
      lastAssistantReply: latestAssistantReply,

      // Agent state
      isStreaming: agent.isLoading,
      currentSpec: agent.currentSpec,
      memoryBank: agent.memoryBank,
      tracePersistenceStatus: agent.tracePersistenceStatus,

      // Model / provider
      model: selectedChatModel,
      selectedModel,
      availableModels,
      supportsReasoning,
      hasProvider: provider !== null,

      // Files
      filePaths: files.map((f) => f.path),
      filesForPalette: files.map((f) => ({ path: f.path })),

      // Plan state
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

      // Planning session
      planningSession: activePlanningSession ?? null,
      planningCurrentQuestion: planningSession.currentQuestion,

      // Runtime / system
      isAnyJobRunning,
      isRuntimeRunning,
      isAgentRunning: agent.isLoading,
      gitStatus,
      healthStatus,
      healthDetail,

      // Shell UI state
      composerOpen: isComposerOpen,
      shortcutHelpOpen: isShortcutHelpOpen,
      isFlyoutOpen,
      activeSection,

      // Navigation helper
      openRightPanelTab,

      // Callbacks: message / mode
      onSendMessage: handleSendMessage,
      onSuggestedAction: handleSuggestedAction,
      onModeChange: handleModeChange,
      onStopStreaming: agent.stop ?? (() => {}),
      onResumeRuntimeSession: agent.resumeRuntimeSession,
      onRunEvalScenario: agent.runEvalScenario,
      onSaveMemoryBank: agent.updateMemoryBank,

      // Callbacks: plan
      onPlanApprove: handleApprovePlan,
      onBuildFromPlan: handleBuildFromPlan,
      onPlanDraftChange: setPlanDraft,
      onSavePlanDraft: () => {
        void handleSavePlanDraft()
      },

      // Callbacks: planning session
      onStartPlanningIntake: handleStartPlanningIntake,
      onAnswerPlanningQuestion: planningSession.answerQuestion,
      onClearPlanningIntake: () =>
        activePlanningSession?.sessionId ? planningSession.clearIntake() : Promise.resolve(null),

      // Callbacks: navigation / workspace
      onOpenFile: handleFileSelect,
      onResetWorkspace: handleResetWorkspace,
      onNewChat: () => {
        void handleNewChat()
      },
      onToggleInspector: () => openRightPanelTab('run'),
      onOpenHistory: () => openRightPanelTab('run'),
      onComposerSubmit: (prompt: string, contextFiles?: string[]) =>
        handleSendMessage(prompt, 'build', contextFiles),

      // Callbacks: shell
      onToggleFlyout: toggleFlyout,
      onToggleRightPanel: () => {
        const s = useWorkspaceUiStore.getState()
        if (!s.isRightPanelOpen) {
          s.setRightPanelTab('chat')
          if (isMobileLayout) {
            s.setMobilePrimaryPanel('chat')
          }
        } else if (isMobileLayout && s.mobilePrimaryPanel === 'chat') {
          s.setMobilePrimaryPanel('workspace')
        }
        s.setRightPanelOpen(!s.isRightPanelOpen)
      },
      onNewTask: () => {
        void handleNewChat()
      },
      onStartRuntime: () => {
        void handleStartRuntime()
      },
      onStopRuntime: () => {
        void handleStopRuntime()
      },
      onRevealInExplorer: (folderPath: string) => {
        const revealTarget = resolveExplorerRevealTarget({ folderPath, files })
        if (!revealTarget) return
        handleSectionChange('files')
        if (!isFlyoutOpen) toggleFlyout()
        setSelectedFilePath(revealTarget)
        setSelectedFileLocation(null)
        setCursorPosition(null)
      },
      onOpenCommandPalette: openCommandPalette,
      onSidebarSectionChange: handleSectionChange,
      onComposerOpenChange: setComposerOpen,
      onShortcutHelpOpenChange: setShortcutHelpOpen,
      writeFileToRuntime,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      projectId,
      project.name,
      activeChat,
      chatMessages,
      runEvents,
      latestRunReceipt,
      liveRunSteps,
      snapshotRunEvents,
      subagentToolCalls,
      inlineRateLimitError,
      latestUserPrompt,
      latestAssistantReply,
      agent.isLoading,
      agent.currentSpec,
      agent.memoryBank,
      agent.tracePersistenceStatus,
      agent.stop,
      agent.resumeRuntimeSession,
      agent.runEvalScenario,
      agent.updateMemoryBank,
      selectedChatModel,
      selectedModel,
      availableModels,
      supportsReasoning,
      provider,
      files,
      planDraft,
      isSavingPlanDraft,
      canApproveCurrentPlan,
      canBuildCurrentPlan,
      agentPolicy.showPlanReview,
      planningDebug,
      activePlanningSession,
      planningSession.currentQuestion,
      planningSession.answerQuestion,
      planningSession.clearIntake,
      isAnyJobRunning,
      isRuntimeRunning,
      gitStatus,
      healthStatus,
      healthDetail,
      isComposerOpen,
      isShortcutHelpOpen,
      isFlyoutOpen,
      activeSection,
      openRightPanelTab,
      handleSendMessage,
      handleSuggestedAction,
      handleModeChange,
      handleApprovePlan,
      handleBuildFromPlan,
      setPlanDraft,
      handleSavePlanDraft,
      handleStartPlanningIntake,
      handleFileSelect,
      handleResetWorkspace,
      handleNewChat,
      toggleFlyout,
      handleStartRuntime,
      handleStopRuntime,
      handleSectionChange,
      openCommandPalette,
      setSelectedFilePath,
      setSelectedFileLocation,
      setCursorPosition,
      writeFileToRuntime,
    ]
  )

  const workspaceFocusState = useMemo<WorkspaceFocusState | null>(() => {
    if (agent.isLoading) {
      const latestStep = [...liveRunSteps].reverse().find((step) => step.content?.trim())
      return {
        kind: 'executing',
        kicker: 'Run',
        objective:
          latestUserPrompt?.trim() ||
          activeChat?.title ||
          activePlanningSession?.generatedPlan?.title ||
          'Executing current task',
        statusLabel: 'Executing',
        tone: 'progress',
        detail:
          latestStep?.content?.trim() ||
          'Panda is actively working through the current task in this project.',
        nextStep: 'Monitor progress or open the run rail for more detail.',
        primaryAction: { id: 'open_run', label: 'Open Run' },
      }
    }

    if (planningSession.currentQuestion) {
      return {
        kind: 'planning-intake',
        kicker: 'Planning',
        objective: activeChat?.title || 'Define the implementation plan',
        statusLabel: 'Intake active',
        tone: 'attention',
        detail: planningSession.currentQuestion.prompt,
        nextStep: 'Answer the next planning question so Panda can draft a grounded plan.',
        primaryAction: { id: 'open_plan', label: 'Continue Planning' },
      }
    }

    if (canApproveCurrentPlan && activePlanningSession?.generatedPlan) {
      return {
        kind: 'plan-review',
        kicker: 'Plan',
        objective: activePlanningSession.generatedPlan.title,
        statusLabel: 'Ready for review',
        tone: 'attention',
        detail: 'A generated implementation plan is ready to inspect before execution starts.',
        nextStep: 'Review the plan, confirm the scope, then approve it when you are satisfied.',
        primaryAction: { id: 'open_plan', label: 'Review Plan' },
      }
    }

    if (canBuildCurrentPlan && activePlanningSession?.generatedPlan) {
      return {
        kind: 'plan-approved',
        kicker: 'Execution',
        objective: activePlanningSession.generatedPlan.title,
        statusLabel: 'Ready to build',
        tone: 'progress',
        detail: 'The approved plan is ready to execute from the current project context.',
        nextStep: 'Start the build from the approved plan when you are ready.',
        primaryAction: { id: 'build_from_plan', label: 'Build from Plan' },
        secondaryAction: { id: 'open_plan', label: 'Open Plan' },
      }
    }

    if (pendingChangedFilesCount > 0) {
      return {
        kind: 'review-ready',
        kicker: 'Review',
        objective: activeChat?.title || 'Inspect the latest results',
        statusLabel: 'Changes ready',
        tone: 'success',
        detail: `${pendingChangedFilesCount} changed file${pendingChangedFilesCount !== 1 ? 's are' : ' is'} ready for inspection in the diff view.`,
        nextStep: 'Inspect the latest changes before continuing with the next task.',
        primaryAction: { id: 'review_changes', label: 'Inspect Changes' },
      }
    }

    return null
  }, [
    activeChat?.title,
    activePlanningSession?.generatedPlan,
    agent.isLoading,
    canApproveCurrentPlan,
    canBuildCurrentPlan,
    latestUserPrompt,
    liveRunSteps,
    pendingChangedFilesCount,
    planningSession.currentQuestion,
  ])

  const handleFocusPrimaryAction = useCallback(() => {
    const actionId = workspaceFocusState?.primaryAction?.id
    if (!actionId) return

    switch (actionId) {
      case 'open_plan':
        openRightPanelTab('context')
        break
      case 'build_from_plan':
        void handleBuildFromPlan()
        break
      case 'open_run':
        openRightPanelTab('run')
        break
      case 'review_changes':
        setActiveCenterTab('diff')
        openRightPanelTab('changes')
        break
    }
  }, [handleBuildFromPlan, openRightPanelTab, setActiveCenterTab, workspaceFocusState])

  const handleFocusSecondaryAction = useCallback(() => {
    const actionId = workspaceFocusState?.secondaryAction?.id
    if (!actionId) return

    switch (actionId) {
      case 'open_plan':
        openRightPanelTab('context')
        break
      case 'review_changes':
        setActiveCenterTab('diff')
        openRightPanelTab('changes')
        break
      case 'open_run':
        openRightPanelTab('run')
        break
      case 'build_from_plan':
        void handleBuildFromPlan()
        break
    }
  }, [handleBuildFromPlan, openRightPanelTab, setActiveCenterTab, workspaceFocusState])

  // --- Assemble layout props ---

  const layoutProps = {
    projectId,
    activeChatId: activeChat?._id,
    activeSection,
    isFlyoutOpen,
    onSidebarSectionChange: handleSectionChange,
    onToggleFlyout: toggleFlyout,
    onSelectChat: handleSelectChat,
    onNewChat: () => {
      void handleNewChat()
    },
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
    onSaveFile: handleEditorSave,
    onEditorDirtyChange: handleEditorDirtyChange,
    isMobileLayout,
    isCompactDesktopLayout,
    mobilePrimaryPanel,
    onMobilePrimaryPanelChange: setMobilePrimaryPanel,
    onMobileReviewTabChange: setRightPanelTab,
    mobileUnreadCount,
    isMobileKeyboardOpen,
    // Chat and right panel rendered here with zero props — they read from context
    chatPanel: <ProjectChatPanel projectId={projectId} />,
    rightPanelContent: <WorkbenchRightPanel projectId={projectId} />,
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
    planApproveDisabled: !canApproveCurrentPlan || agent.isLoading,
    planBuildDisabled: !canBuildCurrentPlan || agent.isLoading,
    isBottomDockOpen: _isBottomDockOpen,
    onBottomDockOpenChange: setBottomDockOpen,
    activeBottomDockTab,
    onBottomDockTabChange: setActiveBottomDockTab,
    activeCenterTab,
    onCenterTabChange: setActiveCenterTab,
    isRightPanelOpen,
    activeTaskTitle: agent.isLoading ? (activeChat?.title ?? 'Active Task') : undefined,
    activeTaskStatus: agent.isLoading ? ('running' as const) : undefined,
    changedFilesCount: pendingChangedFilesCount,
    onReviewChanges: () => {
      setActiveCenterTab('diff')
      openRightPanelTab('changes')
    },
    onStopAgent: () => agent.stop?.(),
    onStartAgent: () => {
      void handleNewChat()
    },
    onOpenTerminal: handleOpenTerminal,
    focusState: workspaceFocusState,
    onFocusPrimaryAction: handleFocusPrimaryAction,
    onFocusSecondaryAction: handleFocusSecondaryAction,
    webcontainerStatus: runtimeAvailability.providerStatus,
  }

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
