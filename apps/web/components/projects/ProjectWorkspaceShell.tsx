'use client'
import type { Id } from '@convex/_generated/dataModel'
import { CommandPalette } from '@/components/command-palette/CommandPalette'
import { ComposerOverlay } from '@/components/chat/ComposerOverlay'
import { PermissionDialog } from '@/components/chat/PermissionDialog'
import { ProjectShareDialog } from '@/components/projects/ProjectShareDialog'
import { ProjectWorkspaceLayout } from '@/components/projects/ProjectWorkspaceLayout'
import { ShortcutHelpOverlay } from '@/components/workbench/ShortcutHelpOverlay'
import { WorkbenchTopBar } from '@/components/workbench/WorkbenchTopBar'
import { WorkspaceProvider, type WorkspaceContextValue } from '@/contexts/WorkspaceContext'

interface ProjectWorkspaceShellProps {
  workspaceContextValue: WorkspaceContextValue
  projectName: string
  projectId: Id<'projects'>
  selectedFilePath: string | null
  gitStatus: unknown
  selectedModel: string
  isAgentRunning: boolean
  isAnyJobRunning: boolean
  healthStatus: 'ready' | 'issues' | 'error'
  healthDetail: string
  isRightPanelOpen: boolean
  isFlyoutOpen: boolean
  isRuntimeRunning: boolean
  onToggleFlyout: () => void
  onToggleRightPanel: () => void
  onNewTask: () => void
  onStartRuntime: () => void
  onStopRuntime: () => void
  onOpenPreview: () => void
  onResetWorkspace: () => void
  onOpenShareDialog: () => void
  onRevealInExplorer: (folderPath: string) => void
  onOpenCommandPalette: () => void
  activeSidebarSection: Parameters<typeof WorkbenchTopBar>[0]['activeSidebarSection']
  onSidebarSectionChange: (
    section: Parameters<typeof WorkbenchTopBar>[0]['activeSidebarSection']
  ) => void
  shareDialogOpen: boolean
  onShareDialogOpenChange: (open: boolean) => void
  activeChatId?: Id<'chats'>
  activeChatTitle?: string
  filesForPalette: Array<{ path: string }>
  layoutProps: Parameters<typeof ProjectWorkspaceLayout>[0]
  composerOpen: boolean
  onComposerOpenChange: (open: boolean) => void
  onComposerSubmit: (prompt: string, ctx?: string[]) => Promise<void>
  shortcutHelpOpen: boolean
  onShortcutHelpOpenChange: (open: boolean) => void
}

export function ProjectWorkspaceShell({
  workspaceContextValue,
  projectName,
  projectId,
  selectedFilePath,
  gitStatus,
  selectedModel,
  isAgentRunning,
  isAnyJobRunning,
  healthStatus,
  healthDetail,
  isRightPanelOpen,
  isFlyoutOpen,
  isRuntimeRunning,
  onToggleFlyout,
  onToggleRightPanel,
  onNewTask,
  onStartRuntime,
  onStopRuntime,
  onOpenPreview,
  onResetWorkspace,
  onOpenShareDialog,
  onRevealInExplorer,
  onOpenCommandPalette,
  activeSidebarSection,
  onSidebarSectionChange,
  shareDialogOpen,
  onShareDialogOpenChange,
  activeChatId,
  activeChatTitle,
  filesForPalette,
  layoutProps,
  composerOpen,
  onComposerOpenChange,
  onComposerSubmit,
  shortcutHelpOpen,
  onShortcutHelpOpenChange,
}: ProjectWorkspaceShellProps) {
  return (
    <WorkspaceProvider value={workspaceContextValue}>
      <div className="fixed inset-0 top-0 z-10 flex flex-col overflow-hidden bg-background">
        <div className="pointer-events-none absolute inset-x-0 top-11 z-40 px-3 py-2">
          <PermissionDialog className="pointer-events-auto ml-auto max-w-xl" />
        </div>
        <ProjectShareDialog
          open={shareDialogOpen}
          onOpenChange={onShareDialogOpenChange}
          chatId={activeChatId}
          chatTitle={activeChatTitle}
        />
        <WorkbenchTopBar
          projectName={projectName}
          projectId={projectId}
          selectedFilePath={selectedFilePath}
          gitStatus={gitStatus as Parameters<typeof WorkbenchTopBar>[0]['gitStatus']}
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
          onOpenPreview={onOpenPreview}
          onResetWorkspace={onResetWorkspace}
          onOpenShareDialog={onOpenShareDialog}
          onRevealInExplorer={onRevealInExplorer}
          onOpenCommandPalette={onOpenCommandPalette}
          activeSidebarSection={activeSidebarSection}
          onSidebarSectionChange={onSidebarSectionChange}
        />

        <ProjectWorkspaceLayout {...layoutProps} />
        <ComposerOverlay
          isOpen={composerOpen}
          onClose={() => onComposerOpenChange(false)}
          onSubmit={onComposerSubmit}
          isStreaming={isAgentRunning}
        />
        <ShortcutHelpOverlay open={shortcutHelpOpen} onOpenChange={onShortcutHelpOpenChange} />
        <CommandPalette projectId={projectId} files={filesForPalette} />
      </div>
    </WorkspaceProvider>
  )
}
