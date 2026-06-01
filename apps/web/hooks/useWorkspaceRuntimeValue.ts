'use client'

import { useMemo } from 'react'

import type { WorkspaceRuntimeValue } from '@/contexts/WorkspaceRuntimeContext'
import type { ChatMode } from '@/lib/agent/prompt-library'
import { resolveExplorerRevealTarget } from '@/lib/workbench-navigation'
import { useWorkspaceUiStore } from '@/stores/workspaceUiStore'

interface RuntimeFilePath {
  path: string
}

interface UseWorkspaceRuntimeValueArgs extends Omit<
  WorkspaceRuntimeValue,
  | 'filePaths'
  | 'filesForPalette'
  | 'onStopStreaming'
  | 'onSavePlanDraft'
  | 'onClearPlanningIntake'
  | 'onNewChat'
  | 'onToggleInspector'
  | 'onOpenHistory'
  | 'onComposerSubmit'
  | 'onToggleRightPanel'
  | 'onNewTask'
  | 'onStartRuntime'
  | 'onStopRuntime'
  | 'onRevealInExplorer'
> {
  files: RuntimeFilePath[]
  stopStreaming?: (() => void) | null
  savePlanDraft: () => void | Promise<void>
  hasActivePlanningSession: boolean
  clearPlanningIntake: () => Promise<unknown>
  newChat: () => void | Promise<void>
  sendComposerMessage: (prompt: string, mode: ChatMode, contextFiles?: string[]) => Promise<void>
  startRuntime: () => void | Promise<void>
  stopRuntime: () => void | Promise<void>
  isMobileLayout: boolean
  setSelectedFilePath: (path: string) => void
  setSelectedFileLocation: (location: null) => void
  setCursorPosition: (position: null) => void
}

export function useWorkspaceRuntimeValue({
  projectId,
  projectName,
  activeChatId,
  activeChatTitle,
  activeChatExists,
  activeChatPlanStatus,
  activeChatPlanUpdatedAt,
  activeChatPlanLastGeneratedAt,
  executionSession,
  chatMessages,
  runEvents,
  latestRunReceipt,
  liveSteps,
  snapshotEvents,
  subagentToolCalls,
  inlineRateLimitError,
  lastUserPrompt,
  lastAssistantReply,
  isStreaming,
  workspaceReady,
  currentSpec,
  memoryBank,
  tracePersistenceStatus,
  runtimeCheckpoints,
  model,
  selectedModel,
  availableModels,
  supportsReasoning,
  hasProvider,
  yoloCommandMode,
  onToggleYolo,
  files,
  pendingDiffEntries,
  planDraft,
  isSavingPlanDraft,
  planApproveDisabled,
  planBuildDisabled,
  showInlinePlanReview,
  planStatus,
  canApprovePlan,
  canBuildPlan,
  lastSavedAt,
  lastGeneratedAt,
  planningDebug,
  planningSession,
  planningCurrentQuestion,
  isAnyJobRunning,
  isRuntimeRunning,
  isAgentRunning,
  gitStatus,
  githubShellSummary,
  healthStatus,
  healthDetail,
  composerOpen,
  shortcutHelpOpen,
  isFlyoutOpen,
  activeSection,
  openRightPanelTab,
  onSendMessage,
  onSuggestedAction,
  onAskUserAnswer,
  onModeChange,
  stopStreaming,
  onResumeRuntimeSession,
  onRunEvalScenario,
  onSaveMemoryBank,
  onPlanApprove,
  onBuildFromPlan,
  onPlanDraftChange,
  savePlanDraft,
  onStartPlanningIntake,
  onAnswerPlanningQuestion,
  hasActivePlanningSession,
  clearPlanningIntake,
  onOpenFile,
  onResetWorkspace,
  newChat,
  sendComposerMessage,
  onToggleFlyout,
  startRuntime,
  stopRuntime,
  isMobileLayout,
  onOpenCommandPalette,
  onSidebarSectionChange,
  onComposerOpenChange,
  onShortcutHelpOpenChange,
  writeFileToRuntime,
  setSelectedFilePath,
  setSelectedFileLocation,
  setCursorPosition,
}: UseWorkspaceRuntimeValueArgs): WorkspaceRuntimeValue {
  return useMemo(
    () => ({
      // Identity
      projectId,
      projectName,

      // Active chat
      activeChatId,
      activeChatTitle,
      activeChatExists,
      activeChatPlanStatus,
      activeChatPlanUpdatedAt,
      activeChatPlanLastGeneratedAt,
      executionSession,

      // Chat state
      chatMessages,
      runEvents,
      latestRunReceipt,
      liveSteps,
      snapshotEvents,
      subagentToolCalls,
      inlineRateLimitError,
      lastUserPrompt,
      lastAssistantReply,

      // Agent state
      isStreaming,
      workspaceReady,
      currentSpec,
      memoryBank,
      tracePersistenceStatus,
      runtimeCheckpoints,

      // Model / provider
      model,
      selectedModel,
      availableModels,
      supportsReasoning,
      hasProvider,

      // YOLO mode
      yoloCommandMode,
      onToggleYolo,

      // Files
      filePaths: files.map((file) => file.path),
      filesForPalette: files.map((file) => ({ path: file.path })),
      pendingDiffEntries,

      // Plan state
      planDraft,
      isSavingPlanDraft,
      planApproveDisabled,
      planBuildDisabled,
      showInlinePlanReview,
      planStatus,
      canApprovePlan,
      canBuildPlan,
      lastSavedAt,
      lastGeneratedAt,
      planningDebug,

      // Planning session
      planningSession,
      planningCurrentQuestion,

      // Runtime / system
      isAnyJobRunning,
      isRuntimeRunning,
      isAgentRunning,
      gitStatus,
      githubShellSummary,
      healthStatus,
      healthDetail,

      // Shell UI state
      composerOpen,
      shortcutHelpOpen,
      isFlyoutOpen,
      activeSection,

      // Navigation helper
      openRightPanelTab,

      // Callbacks: message / mode
      onSendMessage,
      onSuggestedAction,
      onAskUserAnswer,
      onModeChange,
      onStopStreaming: stopStreaming ?? (() => {}),
      onResumeRuntimeSession,
      onRunEvalScenario,
      onSaveMemoryBank,

      // Callbacks: plan
      onPlanApprove,
      onBuildFromPlan,
      onPlanDraftChange,
      onSavePlanDraft: () => {
        void savePlanDraft()
      },

      // Callbacks: planning session
      onStartPlanningIntake,
      onAnswerPlanningQuestion,
      onClearPlanningIntake: () =>
        hasActivePlanningSession ? clearPlanningIntake() : Promise.resolve(null),

      // Callbacks: navigation / workspace
      onOpenFile,
      onResetWorkspace,
      onNewChat: () => {
        void newChat()
      },
      onToggleInspector: () => openRightPanelTab('proof'),
      onOpenHistory: () => openRightPanelTab('proof'),
      onComposerSubmit: (prompt: string, contextFiles?: string[]) =>
        sendComposerMessage(prompt, 'build', contextFiles),

      // Callbacks: shell
      onToggleFlyout,
      onToggleRightPanel: () => {
        const state = useWorkspaceUiStore.getState()
        if (!state.isRightPanelOpen) {
          state.setRightPanelTab('proof')
          if (isMobileLayout) state.setMobilePrimaryPanel('proof')
        } else if (isMobileLayout && state.mobilePrimaryPanel === 'chat') {
          state.setMobilePrimaryPanel('work')
        }
        state.setRightPanelOpen(!state.isRightPanelOpen)
      },
      onNewTask: () => {
        void newChat()
      },
      onStartRuntime: () => {
        void startRuntime()
      },
      onStopRuntime: () => {
        void stopRuntime()
      },
      onRevealInExplorer: (folderPath: string) => {
        const revealTarget = resolveExplorerRevealTarget({ folderPath, files })
        if (!revealTarget) return
        onSidebarSectionChange('files')
        if (!isFlyoutOpen) onToggleFlyout()
        setSelectedFilePath(revealTarget)
        setSelectedFileLocation(null)
        setCursorPosition(null)
      },
      onOpenCommandPalette,
      onSidebarSectionChange,
      onComposerOpenChange,
      onShortcutHelpOpenChange,
      writeFileToRuntime,
    }),
    [
      activeChatExists,
      activeChatId,
      activeChatPlanLastGeneratedAt,
      activeChatPlanStatus,
      activeChatPlanUpdatedAt,
      activeChatTitle,
      activeSection,
      availableModels,
      canApprovePlan,
      canBuildPlan,
      chatMessages,
      clearPlanningIntake,
      composerOpen,
      currentSpec,
      executionSession,
      files,
      gitStatus,
      githubShellSummary,
      hasActivePlanningSession,
      hasProvider,
      healthDetail,
      healthStatus,
      inlineRateLimitError,
      isAgentRunning,
      isAnyJobRunning,
      isFlyoutOpen,
      isMobileLayout,
      isRuntimeRunning,
      isSavingPlanDraft,
      isStreaming,
      lastAssistantReply,
      lastGeneratedAt,
      lastSavedAt,
      lastUserPrompt,
      latestRunReceipt,
      liveSteps,
      memoryBank,
      model,
      newChat,
      onAnswerPlanningQuestion,
      onBuildFromPlan,
      onComposerOpenChange,
      onModeChange,
      onOpenCommandPalette,
      onOpenFile,
      onPlanApprove,
      onPlanDraftChange,
      onResetWorkspace,
      onResumeRuntimeSession,
      onRunEvalScenario,
      onSaveMemoryBank,
      onSendMessage,
      onShortcutHelpOpenChange,
      onSidebarSectionChange,
      onStartPlanningIntake,
      onSuggestedAction,
      onAskUserAnswer,
      onToggleFlyout,
      onToggleYolo,
      openRightPanelTab,
      pendingDiffEntries,
      planApproveDisabled,
      planBuildDisabled,
      planDraft,
      planningCurrentQuestion,
      planningDebug,
      planningSession,
      planStatus,
      projectId,
      projectName,
      runEvents,
      runtimeCheckpoints,
      savePlanDraft,
      selectedModel,
      sendComposerMessage,
      setCursorPosition,
      setSelectedFileLocation,
      setSelectedFilePath,
      shortcutHelpOpen,
      showInlinePlanReview,
      snapshotEvents,
      startRuntime,
      stopRuntime,
      stopStreaming,
      subagentToolCalls,
      supportsReasoning,
      tracePersistenceStatus,
      workspaceReady,
      writeFileToRuntime,
      yoloCommandMode,
    ]
  )
}
