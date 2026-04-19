import type { ComponentProps } from 'react'
import type { WorkspaceContextValue } from '@/contexts/WorkspaceContext'
import type { ProjectWorkspaceLayout } from '@/components/projects/ProjectWorkspaceLayout'

type LayoutProps = ComponentProps<typeof ProjectWorkspaceLayout>

interface ProjectWorkspaceShellPropsParams {
  workspaceContextValue: WorkspaceContextValue
  projectName: string
  projectId: LayoutProps['projectId']
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
  activeSidebarSection: ComponentProps<
    typeof import('@/components/workbench/WorkbenchTopBar').WorkbenchTopBar
  >['activeSidebarSection']
  onSidebarSectionChange: ComponentProps<
    typeof import('@/components/workbench/WorkbenchTopBar').WorkbenchTopBar
  >['onSidebarSectionChange']
  shareDialogOpen: boolean
  onShareDialogOpenChange: (open: boolean) => void
  activeChatId?: LayoutProps['activeChatId']
  activeChatTitle?: string
  filesForPalette: Array<{ path: string }>
  layoutProps: LayoutProps
  composerOpen: boolean
  onComposerOpenChange: (open: boolean) => void
  onComposerSubmit: (prompt: string, ctx?: string[]) => Promise<void>
  shortcutHelpOpen: boolean
  onShortcutHelpOpenChange: (open: boolean) => void
}

export function buildProjectWorkspaceShellProps(params: ProjectWorkspaceShellPropsParams) {
  return params
}
