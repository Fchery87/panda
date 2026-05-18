'use client'
import type { Id } from '@convex/_generated/dataModel'
import { CommandPalette } from '@/components/command-palette/CommandPalette'
import { ComposerOverlay } from '@/components/chat/ComposerOverlay'
import { PermissionDialog } from '@/components/chat/PermissionDialog'
import { ProjectShareDialog } from '@/components/projects/ProjectShareDialog'
import { ProjectWorkspaceLayout } from '@/components/projects/ProjectWorkspaceLayout'
import { ShortcutHelpOverlay } from '@/components/workbench/ShortcutHelpOverlay'
import { WorkbenchTopBar } from '@/components/workbench/WorkbenchTopBar'
import { useWorkspaceRuntime } from '@/contexts/WorkspaceRuntimeContext'
import { useEditorContextStore } from '@/stores/editorContextStore'
import { useWorkspaceUiStore } from '@/stores/workspaceUiStore'

interface ProjectWorkspaceShellProps {
  projectId: Id<'projects'>
  layoutProps: Parameters<typeof ProjectWorkspaceLayout>[0]
  shareDialogOpen: boolean
  onShareDialogOpenChange: (open: boolean) => void
  activeChatId?: Id<'chats'>
  activeChatTitle?: string
}

export function ProjectWorkspaceShell({
  projectId,
  layoutProps,
  shareDialogOpen,
  onShareDialogOpenChange,
  activeChatId,
  activeChatTitle,
}: ProjectWorkspaceShellProps) {
  const {
    projectName,
    gitStatus,
    selectedModel,
    isAgentRunning,
    githubShellSummary,
    isAnyJobRunning,
    healthStatus,
    healthDetail,
    isFlyoutOpen,
    isRuntimeRunning,
    onToggleFlyout,
    onToggleRightPanel,
    onNewTask,
    onStartRuntime,
    onStopRuntime,
    onResetWorkspace,
    onRevealInExplorer,
    onOpenCommandPalette,
    activeSection,
    onSidebarSectionChange,
    filesForPalette,
    composerOpen,
    onComposerOpenChange,
    onComposerSubmit,
    isStreaming,
    shortcutHelpOpen,
    onShortcutHelpOpenChange,
    yoloCommandMode,
    onToggleYolo,
  } = useWorkspaceRuntime()

  const selectedFilePath = useEditorContextStore((s) => s.selectedFilePath)
  const isRightPanelOpen = useWorkspaceUiStore((s) => s.isRightPanelOpen)

  return (
    <div
      data-testid="workspace-shell"
      className="dot-grid fixed inset-0 top-0 z-10 overflow-hidden bg-background p-2 text-foreground sm:p-3 lg:p-4"
    >
      <div
        className={`pointer-events-none absolute inset-x-0 z-40 px-3 py-2 ${layoutProps.focusState ? 'top-20' : 'top-11'}`}
      >
        <PermissionDialog className="pointer-events-auto ml-auto max-w-xl" />
      </div>
      <ProjectShareDialog
        open={shareDialogOpen}
        onOpenChange={onShareDialogOpenChange}
        chatId={activeChatId}
        chatTitle={activeChatTitle}
      />
      <div className="bg-background/92 shadow-sharp-lg mx-auto flex h-full min-h-0 max-w-[1680px] flex-col overflow-hidden border border-foreground">
        <WorkbenchTopBar
          projectName={projectName}
          projectId={projectId}
          selectedFilePath={selectedFilePath}
          gitStatus={gitStatus as Parameters<typeof WorkbenchTopBar>[0]['gitStatus']}
          githubShellSummary={
            githubShellSummary as Parameters<typeof WorkbenchTopBar>[0]['githubShellSummary']
          }
          selectedModel={selectedModel}
          isAgentRunning={isAgentRunning}
          isAnyJobRunning={isAnyJobRunning}
          healthStatus={healthStatus}
          healthDetail={healthDetail}
          isRightPanelOpen={isRightPanelOpen}
          isFlyoutOpen={isFlyoutOpen}
          isRuntimeRunning={isRuntimeRunning}
          onToggleFlyout={onToggleFlyout}
          onToggleRightPanel={onToggleRightPanel}
          onNewTask={onNewTask}
          onStartRuntime={onStartRuntime}
          onStopRuntime={onStopRuntime}
          onResetWorkspace={onResetWorkspace}
          onOpenShareDialog={() => onShareDialogOpenChange(true)}
          onRevealInExplorer={onRevealInExplorer}
          onOpenCommandPalette={onOpenCommandPalette}
          activeSidebarSection={activeSection}
          onSidebarSectionChange={onSidebarSectionChange}
          focusState={layoutProps.focusState}
          onFocusPrimaryAction={layoutProps.onFocusPrimaryAction}
          onFocusSecondaryAction={layoutProps.onFocusSecondaryAction}
          yoloCommandMode={yoloCommandMode}
          onToggleYolo={onToggleYolo}
        />

        <ProjectWorkspaceLayout {...layoutProps} />
      </div>
      <ComposerOverlay
        isOpen={composerOpen}
        onClose={() => onComposerOpenChange(false)}
        onSubmit={onComposerSubmit}
        isStreaming={isStreaming}
      />
      <ShortcutHelpOverlay open={shortcutHelpOpen} onOpenChange={onShortcutHelpOpenChange} />
      <CommandPalette projectId={projectId} files={filesForPalette} />
    </div>
  )
}
