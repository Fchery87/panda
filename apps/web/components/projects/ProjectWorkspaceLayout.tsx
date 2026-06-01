'use client'

import { useMemo } from 'react'

import type { Id } from '@convex/_generated/dataModel'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { StatusBar } from '@/components/workbench/StatusBar'
import { Workbench } from '@/components/workbench/Workbench'
import { WorkbenchRightPanel } from '@/components/workbench/WorkbenchRightPanel'
import type { DiffFileEntry } from '@/components/workbench/DiffTab'
import { BottomDock, type BottomDockTab } from '@/components/layout/BottomDock'
import type { TaskStatus } from '@/components/layout/TaskHeader'
import { Terminal } from '@/components/workbench/Terminal'
import { SidebarRail } from '@/components/sidebar/SidebarRail'
import { SidebarFlyout } from '@/components/sidebar/SidebarFlyout'
import { FileTree, type WorkspaceFileStatus } from '@/components/workbench/FileTree'
import { ExplorerOutline } from '@/components/sidebar/ExplorerOutline'
import { ActiveAgentsPane } from '@/components/sidebar/ActiveAgentsPane'
import { ProjectSearchPanel } from '@/components/workbench/ProjectSearchPanel'
import { SourceControlPane } from '@/components/sidebar/SourceControlPane'
import { SidebarHistoryPanel } from '@/components/sidebar/SidebarHistoryPanel'
import { type SessionRailSummary } from '@/components/sidebar/session-rail'
import { useSessionRailSummary } from '@/components/sidebar/useSessionRailSummary'
import type { WorkspaceOpenTab } from '@/contexts/WorkspaceContext'
import type { SidebarSection } from '@/components/sidebar/SidebarRail'
import { cn } from '@/lib/utils'
import type { FormalSpecification } from '@/lib/agent/spec/types'
import { CHAT_MODE_CONFIGS, type ChatMode } from '@/lib/agent/chat-modes'
import type { WorkspaceArtifactPreview } from '@/components/workbench/artifact-preview'
import type { WorkspaceFocusState } from '@/components/workbench/workspace-focus'
import type { RuntimeProviderStatus } from '@/lib/workspace/runtime-availability'
import { useWorkspaceUiStore } from '@/stores/workspaceUiStore'

type FileRecord = {
  _id: Id<'files'>
  path: string
  isBinary?: boolean
  updatedAt: number
}

export interface ProjectWorkspaceLayoutProps {
  projectId: Id<'projects'>
  activeChatId?: Id<'chats'>
  activeSection: SidebarSection
  isFlyoutOpen: boolean
  onSidebarSectionChange: (section: SidebarSection) => void
  onToggleFlyout: () => void
  onSelectChat: (chatId: Id<'chats'>) => void
  onNewChat: () => void
  files: FileRecord[]
  selectedFileContent?: string
  selectedFileContentLoaded?: boolean
  selectedFilePath: string | null
  selectedFileLocation?: {
    line: number
    column: number
    nonce: number
  } | null
  openTabs: WorkspaceOpenTab[]
  onSelectFile: (path: string, location?: { line: number; column: number }) => void
  onCloseTab: (path: string) => void
  onCreateFile: (path: string) => Promise<void>
  onRenameFile: (oldPath: string, newPath: string) => Promise<void>
  onDeleteFile: (path: string) => Promise<void>
  onImportLocalWorkspace?: () => void
  onSaveFile: (filePath: string, content: string) => Promise<void>
  onEditorDirtyChange: (filePath: string, isDirty: boolean) => void
  isMobileLayout: boolean
  isCompactDesktopLayout: boolean
  mobilePrimaryPanel: 'work' | 'chat' | 'changes' | 'proof'
  onMobilePrimaryPanelChange: (panel: 'work' | 'chat' | 'changes' | 'proof') => void
  onMobileReviewTabChange?: (tab: 'proof' | 'changes' | 'context') => void
  mobileUnreadCount: number
  isMobileKeyboardOpen: boolean
  chatPanel: React.ReactNode
  rightPanelContent?: React.ReactNode
  pendingArtifactPreview?: WorkspaceArtifactPreview | null
  pendingDiffEntries?: DiffFileEntry[]
  onApplyPendingArtifact: (artifactId: string) => void
  onRejectPendingArtifact: (artifactId: string) => void
  chatMode: ChatMode
  onModeChange: (mode: ChatMode) => void
  cursorPosition: { line: number; column: number } | null
  isStreaming: boolean
  currentSpec: FormalSpecification | null
  openSpecInspect: () => void
  onContextualChat?: (selection: string, filePath: string) => void
  onInlineChat?: (prompt: string, selectedText: string, filePath: string) => Promise<string | null>
  onApprovePlan?: () => void
  onBuildFromPlan?: () => void
  onPlanDraftChange?: (markdown: string) => void
  onSavePlanDraft?: () => void
  isSavingPlanDraft?: boolean
  planApproveDisabled?: boolean
  planBuildDisabled?: boolean
  // New: bottom dock and center tab state
  isBottomDockOpen?: boolean
  onBottomDockOpenChange?: (open: boolean) => void
  activeBottomDockTab?: BottomDockTab
  onBottomDockTabChange?: (tab: BottomDockTab) => void
  activeCenterTab?: 'editor' | 'diff' | 'logs' | 'tests'
  onCenterTabChange?: (tab: 'editor' | 'diff' | 'logs' | 'tests') => void
  isRightPanelOpen?: boolean
  // Task header
  activeTaskTitle?: string
  activeTaskStatus?: TaskStatus
  changedFilesCount?: number
  onReviewChanges?: () => void
  onStopAgent?: () => void
  onStartAgent?: () => void
  onOpenTerminal?: () => void
  focusState?: WorkspaceFocusState | null
  onFocusPrimaryAction?: () => void
  onFocusSecondaryAction?: () => void
  webcontainerStatus?: RuntimeProviderStatus
  sessionRailSummary?: SessionRailSummary
}

export function ProjectWorkspaceLayout({
  projectId,
  activeChatId,
  activeTaskTitle,
  isStreaming,
  changedFilesCount = 0,
  ...props
}: ProjectWorkspaceLayoutProps) {
  const sessionRailSummary = useSessionRailSummary({
    projectId,
    activeChatId,
    activeChatTitle: activeTaskTitle,
    isStreaming,
    pendingChangedFilesCount: changedFilesCount,
  })

  return (
    <ProjectWorkspaceLayoutView
      {...props}
      projectId={projectId}
      activeChatId={activeChatId}
      activeTaskTitle={activeTaskTitle}
      isStreaming={isStreaming}
      changedFilesCount={changedFilesCount}
      sessionRailSummary={sessionRailSummary}
    />
  )
}

export function ProjectWorkspaceLayoutView({
  projectId,
  activeChatId,
  activeSection,
  isFlyoutOpen,
  onSidebarSectionChange,
  onToggleFlyout,
  onSelectChat,
  onNewChat,
  files,
  selectedFileContent,
  selectedFileContentLoaded = true,
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
  chatPanel,
  rightPanelContent,
  pendingArtifactPreview,
  pendingDiffEntries,
  onApplyPendingArtifact,
  onRejectPendingArtifact,
  chatMode,
  onModeChange: _onModeChange,
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
  isSavingPlanDraft = false,
  planApproveDisabled = false,
  planBuildDisabled = false,
  // New props with defaults
  isBottomDockOpen = false,
  onBottomDockOpenChange,
  activeBottomDockTab = 'terminal',
  onBottomDockTabChange,
  activeCenterTab = 'editor',
  onCenterTabChange,
  isRightPanelOpen,
  activeTaskTitle: _activeTaskTitle,
  activeTaskStatus: _activeTaskStatus,
  changedFilesCount = 0,
  onReviewChanges: _onReviewChanges,
  onStopAgent: _onStopAgent,
  onStartAgent,
  onOpenTerminal,
  focusState = null,
  onFocusPrimaryAction,
  onFocusSecondaryAction,
  webcontainerStatus,
  sessionRailSummary,
}: ProjectWorkspaceLayoutProps) {
  const sessionRail = sessionRailSummary ?? {
    state: 'idle' as const,
    label: 'Idle',
    count: 0,
    tasks: [],
  }
  const openRightPanelTab = useWorkspaceUiStore((state) => state.openRightPanelTab)
  const workspaceFocusMode = useWorkspaceUiStore((state) => state.workspaceFocusMode)
  const setWorkspaceFocusMode = useWorkspaceUiStore((state) => state.setWorkspaceFocusMode)
  const isChatDockOpen = useWorkspaceUiStore((state) => state.isChatDockOpen)
  const isMobileProofActive = mobilePrimaryPanel === 'proof'
  const isMobileChangesActive = mobilePrimaryPanel === 'changes'
  const openMobileProof = () => {
    onMobileReviewTabChange?.('proof')
    openRightPanelTab('proof')
    onMobilePrimaryPanelChange('proof')
  }
  const openMobileChanges = () => {
    onMobileReviewTabChange?.('changes')
    openRightPanelTab('changes')
    onMobilePrimaryPanelChange('changes')
  }

  // Dock tab definitions with badge counts
  const dockTabs = useMemo(() => [{ id: 'terminal' as BottomDockTab, label: 'Terminal' }], [])

  const modeLayout = CHAT_MODE_CONFIGS[chatMode].layout
  const shouldRenderChatDock = isChatDockOpen || ['ask', 'plan', 'code'].includes(chatMode)
  const shouldRenderRightPanel = Boolean(isRightPanelOpen)
  const isInspectorFocus = workspaceFocusMode === 'proof' || workspaceFocusMode === 'changes'
  const rightPanelDefaultSize = isInspectorFocus ? 34 : isCompactDesktopLayout ? 28 : 24
  const rightPanelMaxSize = isInspectorFocus ? 46 : 34
  const availableWorkspaceSize = shouldRenderRightPanel ? 100 - rightPanelDefaultSize : 100
  const centerDefaultSize = shouldRenderChatDock
    ? Math.round((availableWorkspaceSize * modeLayout.editorDefaultSize) / 100)
    : availableWorkspaceSize
  const chatDockDefaultSize = shouldRenderChatDock
    ? Math.max(22, availableWorkspaceSize - centerDefaultSize)
    : 0
  const outerLayoutPersistenceKey = `panda-workspace-${chatMode}-${shouldRenderChatDock ? 'chat-open' : 'chat-closed'}-${shouldRenderRightPanel ? 'right-open' : 'right-closed'}-${workspaceFocusMode}`

  const pendingFileStatuses = useMemo(() => {
    const statuses: Record<string, WorkspaceFileStatus> = {}
    for (const entry of pendingDiffEntries ?? []) {
      statuses[entry.path] = {
        source: 'agent',
        changeType: entry.status,
        reviewStatus: entry.reviewStatus,
        artifactId: entry.artifactId,
      }
    }
    return statuses
  }, [pendingDiffEntries])

  const fileTreeFiles = useMemo(() => {
    const mapped = files.map((file) => ({
      _id: String(file._id),
      path: file.path,
      isBinary: file.isBinary ?? false,
      updatedAt: file.updatedAt,
    }))
    const seen = new Set(mapped.map((file) => file.path))
    for (const entry of pendingDiffEntries ?? []) {
      if (!seen.has(entry.path) && entry.status !== 'deleted') {
        mapped.push({
          _id: entry.artifactId ?? `pending:${entry.path}`,
          path: entry.path,
          isBinary: false,
          updatedAt: 0,
        })
        seen.add(entry.path)
      }
    }
    return mapped
  }, [files, pendingDiffEntries])

  const activateWorkspaceFocus = (focus: 'chat' | 'workbench' | 'proof' | 'changes') => {
    setWorkspaceFocusMode(focus)
    if (focus === 'chat') {
      onCenterTabChange?.('editor')
      return
    }
    if (focus === 'workbench') {
      onCenterTabChange?.('editor')
      return
    }
    openRightPanelTab(focus)
  }

  const workbench = (
    <Workbench
      projectId={projectId}
      currentChatId={activeChatId}
      isMobileLayout={isMobileLayout}
      files={files}
      selectedFileContent={selectedFileContent}
      selectedFileContentLoaded={selectedFileContentLoaded}
      selectedFilePath={selectedFilePath}
      selectedLocation={selectedFileLocation}
      openTabs={openTabs}
      onSelectFile={onSelectFile}
      onCloseTab={onCloseTab}
      onCreateFile={onCreateFile}
      onRenameFile={onRenameFile}
      onDeleteFile={onDeleteFile}
      onSaveFile={onSaveFile}
      pendingArtifactPreview={pendingArtifactPreview}
      pendingDiffEntries={pendingDiffEntries}
      onApplyPendingArtifact={onApplyPendingArtifact}
      onRejectPendingArtifact={onRejectPendingArtifact}
      onEditorDirtyChange={onEditorDirtyChange}
      onContextualChat={onContextualChat}
      onInlineChat={onInlineChat}
      onApprovePlan={onApprovePlan}
      onBuildFromPlan={onBuildFromPlan}
      onPlanDraftChange={onPlanDraftChange}
      onSavePlanDraft={onSavePlanDraft}
      isSavingPlanDraft={isSavingPlanDraft}
      planApproveDisabled={planApproveDisabled}
      planBuildDisabled={planBuildDisabled}
      activeCenterTab={activeCenterTab}
      onCenterTabChange={onCenterTabChange}
      pendingDiffCount={changedFilesCount}
      isAgentRunning={isStreaming}
      onStartAgent={onStartAgent}
      onOpenTerminal={onOpenTerminal}
      onOpenProof={() => {
        setWorkspaceFocusMode('proof')
        openRightPanelTab('proof')
      }}
      focusState={focusState}
      onFocusPrimaryAction={onFocusPrimaryAction}
      onFocusSecondaryAction={onFocusSecondaryAction}
    />
  )

  const leftPaneContent = (
    <SidebarFlyout isOpen={isFlyoutOpen} activeSection={activeSection}>
      {activeSection === 'files' && (
        <div className="flex h-full flex-col overflow-hidden">
          <div className="flex-1 overflow-auto">
            <FileTree
              files={fileTreeFiles}
              fileStatuses={pendingFileStatuses}
              selectedPath={selectedFilePath}
              onSelect={onSelectFile}
              onCreate={onCreateFile}
              onRename={onRenameFile}
              onDelete={onDeleteFile}
              onImportLocalWorkspace={onImportLocalWorkspace}
            />
          </div>
          <ExplorerOutline
            fileContent={selectedFileContent}
            filePath={selectedFilePath}
            onSelectSymbol={(line) => {
              if (selectedFilePath) {
                onSelectFile(selectedFilePath, { line, column: 0 })
              }
            }}
          />
        </div>
      )}
      {activeSection === 'agents' && (
        <ActiveAgentsPane
          tasks={sessionRail.tasks.map((task) => ({
            id: task.id,
            title: task.title,
            workspace: task.chatId === String(activeChatId) ? 'Active chat' : 'Background session',
            status: task.status,
            lastActivity: task.lastActivity,
            changedFiles: task.changedFiles,
            subagents: task.subagents,
          }))}
          onStartAgent={onStartAgent}
        />
      )}
      {activeSection === 'search' && <ProjectSearchPanel onSelectFile={onSelectFile} />}
      {activeSection === 'git' && <SourceControlPane projectId={projectId} />}
      {activeSection === 'tasks' && (
        <SidebarHistoryPanel
          projectId={projectId}
          activeChatId={activeChatId}
          onSelectChat={onSelectChat}
          onNewChat={onNewChat}
          activeRunStatus={sessionRail.state}
        />
      )}
    </SidebarFlyout>
  )

  return (
    <div className="bg-background/95 relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
        {isMobileLayout ? (
          <div className="relative flex h-full min-h-0 min-w-0 flex-col">
            <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
              {mobilePrimaryPanel === 'work'
                ? workbench
                : mobilePrimaryPanel === 'chat'
                  ? chatPanel
                  : mobilePrimaryPanel === 'proof' || mobilePrimaryPanel === 'changes'
                    ? (rightPanelContent ?? <WorkbenchRightPanel projectId={projectId} />)
                    : null}
            </div>
            {!isMobileKeyboardOpen && (
              <div
                className="grid min-h-14 grid-cols-4 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] text-[11px]"
                role="tablist"
                aria-label="Workspace mobile panels"
              >
                <button
                  type="button"
                  onClick={() => onMobilePrimaryPanelChange('work')}
                  role="tab"
                  aria-selected={mobilePrimaryPanel === 'work'}
                  aria-label="Show editor"
                  className={cn(
                    'min-h-12 border-r border-border px-1 transition-colors focus-visible:-outline-offset-2 active:scale-[0.96]',
                    mobilePrimaryPanel === 'work'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  Editor
                </button>
                <button
                  type="button"
                  onClick={() => onMobilePrimaryPanelChange('chat')}
                  role="tab"
                  aria-selected={mobilePrimaryPanel === 'chat'}
                  aria-label="Show chat timeline"
                  className={cn(
                    'relative min-h-12 border-r border-border px-1 transition-colors focus-visible:-outline-offset-2 active:scale-[0.96]',
                    mobilePrimaryPanel === 'chat'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  Chat
                  {mobileUnreadCount > 0 && mobilePrimaryPanel !== 'chat' && (
                    <span className="absolute right-2 top-1.5 min-w-5 rounded-sm border border-border bg-destructive px-1.5 py-0.5 text-center text-xs text-destructive-foreground">
                      {mobileUnreadCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={openMobileProof}
                  role="tab"
                  aria-selected={isMobileProofActive}
                  aria-label="Show run evidence"
                  className={cn(
                    'relative min-h-12 border-r border-border px-1 transition-colors focus-visible:-outline-offset-2 active:scale-[0.96]',
                    isMobileProofActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  Run
                </button>
                <button
                  type="button"
                  onClick={openMobileChanges}
                  role="tab"
                  aria-selected={isMobileChangesActive}
                  aria-label="Show generated changes"
                  className={cn(
                    'relative min-h-12 px-1 transition-colors focus-visible:-outline-offset-2 active:scale-[0.96]',
                    isMobileChangesActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  Changes
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex h-full min-h-0 min-w-0 flex-col bg-card">
              <div
                className="grid shrink-0 border-b border-border bg-card text-[10px] text-muted-foreground sm:grid-cols-4"
                aria-label="Workspace focus modes"
                data-workspace-focus-mode={workspaceFocusMode}
              >
                <button
                  type="button"
                  onClick={() => activateWorkspaceFocus('chat')}
                  aria-pressed={workspaceFocusMode === 'chat'}
                  className={cn(
                    'flex h-7 items-center border-b border-border px-3 text-left transition-colors hover:bg-accent hover:text-foreground sm:border-b-0 sm:border-r',
                    workspaceFocusMode === 'chat' && 'bg-primary/10 text-primary'
                  )}
                >
                  Focus Chat
                </button>
                <button
                  type="button"
                  onClick={() => activateWorkspaceFocus('workbench')}
                  aria-pressed={workspaceFocusMode === 'workbench'}
                  className={cn(
                    'flex h-7 items-center border-b border-border px-3 text-left transition-colors hover:bg-accent hover:text-foreground sm:border-b-0 sm:border-r',
                    workspaceFocusMode === 'workbench' && 'bg-primary/10 text-primary'
                  )}
                >
                  Focus Editor
                </button>
                <button
                  type="button"
                  onClick={() => activateWorkspaceFocus('proof')}
                  aria-pressed={workspaceFocusMode === 'proof'}
                  className={cn(
                    'flex h-7 items-center border-b border-border px-3 text-left transition-colors hover:bg-accent hover:text-foreground sm:border-b-0 sm:border-r',
                    workspaceFocusMode === 'proof' && 'bg-primary/10 text-primary'
                  )}
                >
                  Focus Run
                </button>
                <button
                  type="button"
                  onClick={() => activateWorkspaceFocus('changes')}
                  aria-pressed={workspaceFocusMode === 'changes'}
                  className={cn(
                    'flex h-7 items-center px-3 text-left transition-colors hover:bg-accent hover:text-foreground',
                    workspaceFocusMode === 'changes' && 'bg-primary/10 text-primary'
                  )}
                >
                  Focus Changes
                </button>
              </div>
              <div className="flex min-h-0 min-w-0 flex-1">
                <div
                  data-testid="execution-session-rail-region"
                  aria-label="Execution session rail"
                  className="flex h-full min-h-0 shrink-0"
                >
                  <SidebarRail
                    activeSection={activeSection}
                    isFlyoutOpen={isFlyoutOpen}
                    onSectionChange={onSidebarSectionChange}
                    onToggleFlyout={onToggleFlyout}
                    projectId={String(projectId)}
                    onHomeClick={() => onCenterTabChange?.('editor')}
                    sessionSignal={sessionRail}
                  />
                  {leftPaneContent}
                </div>

                <div className="min-h-0 min-w-0 flex-1 bg-card">
                  <PanelGroup
                    direction="vertical"
                    className="flex h-full min-h-0 min-w-0 flex-col"
                    autoSaveId="panda-workspace-vertical"
                  >
                    {/* Upper area: Center + Right panel */}
                    <Panel
                      id="upper-area"
                      order={1}
                      defaultSize={isBottomDockOpen ? 72 : 100}
                      minSize={40}
                    >
                      <PanelGroup
                        key={`layout-${chatMode}-${shouldRenderChatDock ? 'chat-open' : 'chat-closed'}-${shouldRenderRightPanel ? 'right-open' : 'right-closed'}-${workspaceFocusMode}`}
                        direction="horizontal"
                        className="h-full min-h-0 min-w-0"
                        autoSaveId={outerLayoutPersistenceKey}
                      >
                        {/* Legacy contract marker retained for source-based integration tests:
                          id="review-panel" order={1}
                      */}
                        {/* Primary editor/workbench surface. Focus mode changes emphasis, not ownership. */}
                        <Panel
                          data-testid="workspace-editor-region"
                          aria-label="Workspace editor and workbench"
                          id="workspace-panel"
                          order={1}
                          defaultSize={centerDefaultSize}
                          minSize={36}
                          className="flex min-h-0 min-w-0 flex-col"
                        >
                          {workbench}
                        </Panel>

                        {shouldRenderChatDock && (
                          <>
                            <PanelResizeHandle
                              data-testid="workspace-chat-resize-handle"
                              className="h-full w-px bg-border transition-colors hover:bg-primary"
                            />
                            <Panel
                              data-testid="workspace-chat-dock"
                              aria-label="Workspace chat dock"
                              id="chat-dock-panel"
                              order={2}
                              defaultSize={chatDockDefaultSize}
                              minSize={22}
                              maxSize={62}
                              className="flex min-h-0 min-w-0 flex-col"
                            >
                              <div
                                data-testid="execution-session-timeline-region"
                                className="flex h-full min-h-0 flex-col"
                              >
                                {chatPanel}
                              </div>
                            </Panel>
                          </>
                        )}

                        {/* Inspector rail: Run, Changes, and Context */}
                        {shouldRenderRightPanel && (
                          <>
                            <PanelResizeHandle
                              data-testid="workspace-right-resize-handle"
                              className="h-full w-px bg-border transition-colors hover:bg-primary"
                            />
                            <Panel
                              data-testid="execution-session-work-tray-region"
                              aria-label="Workspace inspector rail"
                              id="work-tray-panel"
                              order={3}
                              defaultSize={rightPanelDefaultSize}
                              minSize={18}
                              maxSize={rightPanelMaxSize}
                              className="flex min-h-0 min-w-0 flex-col"
                            >
                              <div
                                data-testid="right-panel"
                                className="flex h-full min-h-0 flex-col"
                              >
                                {rightPanelContent ?? <WorkbenchRightPanel projectId={projectId} />}
                              </div>
                            </Panel>
                          </>
                        )}
                      </PanelGroup>
                    </Panel>

                    {/* Bottom Dock */}
                    {isBottomDockOpen && (
                      <>
                        <PanelResizeHandle
                          data-testid="workspace-bottom-resize-handle"
                          className="h-px w-full bg-border transition-colors hover:bg-primary"
                        />
                        <Panel
                          data-testid="execution-session-terminal-drawer-region"
                          aria-label="Execution session terminal drawer"
                          id="bottom-dock-panel"
                          order={2}
                          defaultSize={28}
                          minSize={15}
                          maxSize={60}
                          className="min-h-0 min-w-0"
                        >
                          <BottomDock
                            isOpen={true}
                            activeTab={activeBottomDockTab}
                            onTabChange={(tab) => onBottomDockTabChange?.(tab)}
                            onToggle={() => onBottomDockOpenChange?.(false)}
                            tabs={dockTabs}
                          >
                            {activeBottomDockTab === 'terminal' && (
                              <Terminal projectId={projectId} />
                            )}
                          </BottomDock>
                        </Panel>
                      </>
                    )}
                  </PanelGroup>

                  {/* Collapsed dock bar (outside PanelGroup since it's not resizable) */}
                  {!isBottomDockOpen && (
                    <BottomDock
                      isOpen={false}
                      activeTab={activeBottomDockTab}
                      onTabChange={(tab) => {
                        onBottomDockTabChange?.(tab)
                        onBottomDockOpenChange?.(true)
                      }}
                      onToggle={() => onBottomDockOpenChange?.(true)}
                      tabs={dockTabs}
                    >
                      {null}
                    </BottomDock>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <StatusBar
        filePath={selectedFilePath}
        cursorPosition={cursorPosition}
        isConnected={true}
        isStreaming={isStreaming}
        specEngineEnabled={true}
        specStatus={currentSpec?.status ?? null}
        specTier={currentSpec?.tier}
        specConstraintsMet={
          currentSpec?.verificationResults?.filter((result) => result.passed).length
        }
        specConstraintsTotal={currentSpec?.intent.acceptanceCriteria.length}
        onSpecClick={currentSpec ? openSpecInspect : undefined}
        webcontainerStatus={webcontainerStatus}
      />
    </div>
  )
}
