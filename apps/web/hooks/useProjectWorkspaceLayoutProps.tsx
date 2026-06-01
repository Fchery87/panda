'use client'

import { useMemo } from 'react'

import type { Id } from '@convex/_generated/dataModel'
import { ProjectChatPanel } from '@/components/projects/ProjectChatPanel'
import type { ProjectWorkspaceLayoutProps } from '@/components/projects/ProjectWorkspaceLayout'
import type { ChatMode } from '@/lib/agent/chat-modes'
import type { RuntimeProviderStatus } from '@/lib/workspace/runtime-availability'

interface UseProjectWorkspaceLayoutPropsArgs {
  projectId: Id<'projects'>
  activeChatId?: Id<'chats'>
  activeChatTitle?: string
  activeSection: ProjectWorkspaceLayoutProps['activeSection']
  isFlyoutOpen: boolean
  onSidebarSectionChange: ProjectWorkspaceLayoutProps['onSidebarSectionChange']
  onToggleFlyout: () => void
  onSelectChat: ProjectWorkspaceLayoutProps['onSelectChat']
  onNewChat: () => void | Promise<void>
  files: ProjectWorkspaceLayoutProps['files']
  selectedFileContent: string
  selectedFileContentLoaded: boolean
  selectedFilePath: string | null
  selectedFileLocation: ProjectWorkspaceLayoutProps['selectedFileLocation']
  openTabs: ProjectWorkspaceLayoutProps['openTabs']
  onSelectFile: ProjectWorkspaceLayoutProps['onSelectFile']
  onCloseTab: ProjectWorkspaceLayoutProps['onCloseTab']
  onCreateFile: ProjectWorkspaceLayoutProps['onCreateFile']
  onRenameFile: ProjectWorkspaceLayoutProps['onRenameFile']
  onDeleteFile: ProjectWorkspaceLayoutProps['onDeleteFile']
  onImportLocalWorkspace?: () => void
  onSaveFile: ProjectWorkspaceLayoutProps['onSaveFile']
  onEditorDirtyChange: ProjectWorkspaceLayoutProps['onEditorDirtyChange']
  isMobileLayout: boolean
  isCompactDesktopLayout: boolean
  mobilePrimaryPanel: ProjectWorkspaceLayoutProps['mobilePrimaryPanel']
  onMobilePrimaryPanelChange: ProjectWorkspaceLayoutProps['onMobilePrimaryPanelChange']
  onMobileReviewTabChange: NonNullable<ProjectWorkspaceLayoutProps['onMobileReviewTabChange']>
  mobileUnreadCount: number
  isMobileKeyboardOpen: boolean
  pendingArtifactPreview: ProjectWorkspaceLayoutProps['pendingArtifactPreview']
  pendingDiffEntries: ProjectWorkspaceLayoutProps['pendingDiffEntries']
  onApplyPendingArtifact: ProjectWorkspaceLayoutProps['onApplyPendingArtifact']
  onRejectPendingArtifact: ProjectWorkspaceLayoutProps['onRejectPendingArtifact']
  chatMode: ChatMode
  onModeChange: ProjectWorkspaceLayoutProps['onModeChange']
  cursorPosition: ProjectWorkspaceLayoutProps['cursorPosition']
  isStreaming: boolean
  currentSpec: ProjectWorkspaceLayoutProps['currentSpec']
  openSpecInspect: () => void
  onContextualChat: ProjectWorkspaceLayoutProps['onContextualChat']
  onInlineChat: ProjectWorkspaceLayoutProps['onInlineChat']
  onApprovePlan: ProjectWorkspaceLayoutProps['onApprovePlan']
  onBuildFromPlan: ProjectWorkspaceLayoutProps['onBuildFromPlan']
  onPlanDraftChange: ProjectWorkspaceLayoutProps['onPlanDraftChange']
  onSavePlanDraft: ProjectWorkspaceLayoutProps['onSavePlanDraft']
  isSavingPlanDraft: boolean
  planApproveDisabled: boolean
  planBuildDisabled: boolean
  isBottomDockOpen: boolean
  onBottomDockOpenChange: NonNullable<ProjectWorkspaceLayoutProps['onBottomDockOpenChange']>
  activeBottomDockTab: ProjectWorkspaceLayoutProps['activeBottomDockTab']
  onBottomDockTabChange: ProjectWorkspaceLayoutProps['onBottomDockTabChange']
  activeCenterTab: ProjectWorkspaceLayoutProps['activeCenterTab']
  onCenterTabChange: ProjectWorkspaceLayoutProps['onCenterTabChange']
  isRightPanelOpen: boolean
  activeTaskStatus?: ProjectWorkspaceLayoutProps['activeTaskStatus']
  changedFilesCount: number
  onReviewChanges: ProjectWorkspaceLayoutProps['onReviewChanges']
  onStopAgent: ProjectWorkspaceLayoutProps['onStopAgent']
  onStartAgent: () => void | Promise<void>
  onOpenTerminal: ProjectWorkspaceLayoutProps['onOpenTerminal']
  focusState: ProjectWorkspaceLayoutProps['focusState']
  onFocusPrimaryAction: ProjectWorkspaceLayoutProps['onFocusPrimaryAction']
  onFocusSecondaryAction: ProjectWorkspaceLayoutProps['onFocusSecondaryAction']
  webcontainerStatus: RuntimeProviderStatus
}

export function useProjectWorkspaceLayoutProps({
  projectId,
  activeChatId,
  activeChatTitle,
  activeSection,
  isFlyoutOpen,
  onSidebarSectionChange,
  onToggleFlyout,
  onSelectChat,
  onNewChat,
  files,
  selectedFileContent,
  selectedFileContentLoaded,
  selectedFilePath,
  selectedFileLocation,
  openTabs,
  onSelectFile,
  onCloseTab,
  onCreateFile,
  onRenameFile,
  onDeleteFile,
  onImportLocalWorkspace,
  onSaveFile,
  onEditorDirtyChange,
  isMobileLayout,
  isCompactDesktopLayout,
  mobilePrimaryPanel,
  onMobilePrimaryPanelChange,
  onMobileReviewTabChange,
  mobileUnreadCount,
  isMobileKeyboardOpen,
  pendingArtifactPreview,
  pendingDiffEntries,
  onApplyPendingArtifact,
  onRejectPendingArtifact,
  chatMode,
  onModeChange,
  cursorPosition,
  isStreaming,
  currentSpec,
  openSpecInspect,
  onContextualChat,
  onInlineChat,
  onApprovePlan,
  onBuildFromPlan,
  onPlanDraftChange,
  onSavePlanDraft,
  isSavingPlanDraft,
  planApproveDisabled,
  planBuildDisabled,
  isBottomDockOpen,
  onBottomDockOpenChange,
  activeBottomDockTab,
  onBottomDockTabChange,
  activeCenterTab,
  onCenterTabChange,
  isRightPanelOpen,
  activeTaskStatus,
  changedFilesCount,
  onReviewChanges,
  onStopAgent,
  onStartAgent,
  onOpenTerminal,
  focusState,
  onFocusPrimaryAction,
  onFocusSecondaryAction,
  webcontainerStatus,
}: UseProjectWorkspaceLayoutPropsArgs): ProjectWorkspaceLayoutProps {
  return useMemo(
    () => ({
      projectId,
      activeChatId,
      activeSection,
      isFlyoutOpen,
      onSidebarSectionChange,
      onToggleFlyout,
      onSelectChat,
      onNewChat: () => {
        void onNewChat()
      },
      files,
      selectedFileContent,
      selectedFileContentLoaded,
      selectedFilePath,
      selectedFileLocation,
      openTabs,
      onSelectFile,
      onCloseTab,
      onCreateFile,
      onRenameFile,
      onDeleteFile,
      onImportLocalWorkspace,
      onSaveFile,
      onEditorDirtyChange,
      isMobileLayout,
      isCompactDesktopLayout,
      mobilePrimaryPanel,
      onMobilePrimaryPanelChange,
      onMobileReviewTabChange,
      mobileUnreadCount,
      isMobileKeyboardOpen,
      chatPanel: <ProjectChatPanel projectId={projectId} />,
      pendingArtifactPreview,
      pendingDiffEntries,
      onApplyPendingArtifact,
      onRejectPendingArtifact,
      chatMode,
      onModeChange,
      cursorPosition,
      isStreaming,
      currentSpec,
      openSpecInspect,
      onContextualChat,
      onInlineChat,
      onApprovePlan,
      onBuildFromPlan,
      onPlanDraftChange,
      onSavePlanDraft,
      isSavingPlanDraft,
      planApproveDisabled,
      planBuildDisabled,
      isBottomDockOpen,
      onBottomDockOpenChange,
      activeBottomDockTab,
      onBottomDockTabChange,
      activeCenterTab,
      onCenterTabChange,
      isRightPanelOpen,
      activeTaskTitle: isStreaming ? (activeChatTitle ?? 'Active Task') : undefined,
      activeTaskStatus,
      changedFilesCount,
      onReviewChanges,
      onStopAgent,
      onStartAgent: () => {
        void onStartAgent()
      },
      onOpenTerminal,
      focusState,
      onFocusPrimaryAction,
      onFocusSecondaryAction,
      webcontainerStatus,
    }),
    [
      activeBottomDockTab,
      activeCenterTab,
      activeChatId,
      activeChatTitle,
      activeSection,
      activeTaskStatus,
      changedFilesCount,
      chatMode,
      currentSpec,
      cursorPosition,
      files,
      focusState,
      isBottomDockOpen,
      isCompactDesktopLayout,
      isFlyoutOpen,
      isMobileKeyboardOpen,
      isMobileLayout,
      isRightPanelOpen,
      isSavingPlanDraft,
      isStreaming,
      mobilePrimaryPanel,
      mobileUnreadCount,
      onApplyPendingArtifact,
      onBottomDockOpenChange,
      onBottomDockTabChange,
      onBuildFromPlan,
      onCenterTabChange,
      onCloseTab,
      onContextualChat,
      onCreateFile,
      onDeleteFile,
      onEditorDirtyChange,
      onFocusPrimaryAction,
      onFocusSecondaryAction,
      onImportLocalWorkspace,
      onInlineChat,
      onMobilePrimaryPanelChange,
      onMobileReviewTabChange,
      onModeChange,
      onNewChat,
      onOpenTerminal,
      onPlanDraftChange,
      onRejectPendingArtifact,
      onRenameFile,
      onReviewChanges,
      onSaveFile,
      onSavePlanDraft,
      onSelectChat,
      onSelectFile,
      onSidebarSectionChange,
      onStartAgent,
      onStopAgent,
      onToggleFlyout,
      onApprovePlan,
      openSpecInspect,
      openTabs,
      pendingArtifactPreview,
      pendingDiffEntries,
      planApproveDisabled,
      planBuildDisabled,
      projectId,
      selectedFileContent,
      selectedFileContentLoaded,
      selectedFileLocation,
      selectedFilePath,
      webcontainerStatus,
    ]
  )
}
