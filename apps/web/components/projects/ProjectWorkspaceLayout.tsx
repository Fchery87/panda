'use client'

import { useMemo } from 'react'

import type { Id } from '@convex/_generated/dataModel'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { StatusBar } from '@/components/workbench/StatusBar'
import { Workbench } from '@/components/workbench/Workbench'
import type { DiffFileEntry } from '@/components/workbench/DiffTab'
import { BottomDock, type BottomDockTab } from '@/components/layout/BottomDock'
import type { TaskStatus } from '@/components/layout/TaskHeader'
import { Terminal } from '@/components/workbench/Terminal'
import { AgentEventsPanel } from '@/components/panels/AgentEventsPanel'
import { SidebarRail } from '@/components/sidebar/SidebarRail'
import { SidebarFlyout } from '@/components/sidebar/SidebarFlyout'
import { FileTree } from '@/components/workbench/FileTree'
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
import type { ChatMode } from '@/lib/agent/prompt-library'
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

interface ProjectWorkspaceLayoutProps {
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
  onSaveFile: (filePath: string, content: string) => Promise<void>
  onEditorDirtyChange: (filePath: string, isDirty: boolean) => void
  isMobileLayout: boolean
  isCompactDesktopLayout: boolean
  mobilePrimaryPanel: 'workspace' | 'chat' | 'review'
  onMobilePrimaryPanelChange: (panel: 'workspace' | 'chat' | 'review') => void
  onMobileReviewTabChange?: (tab: 'run' | 'changes' | 'context' | 'preview') => void
  mobileUnreadCount: number
  isMobileKeyboardOpen: boolean
  chatPanel: React.ReactNode
  rightPanelContent: React.ReactNode
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
  chatMode: _chatMode,
  onModeChange: _onModeChange,
  cursorPosition,
  isStreaming,
  currentSpec,
  openSpecInspect,
  onContextualChat,
  onInlineChat,
  onApprovePlan,
  onBuildFromPlan,
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
  const activeReviewTab = useWorkspaceUiStore((state) => state.rightPanelTab)
  const isMobileReviewPanelActive = mobilePrimaryPanel === 'review'
  const isMobileProofActive = isMobileReviewPanelActive && activeReviewTab !== 'preview'
  const isMobilePreviewActive = isMobileReviewPanelActive && activeReviewTab === 'preview'
  const openMobileProof = () => {
    onMobileReviewTabChange?.('run')
    onMobilePrimaryPanelChange('review')
  }

  const openMobilePreview = () => {
    onMobileReviewTabChange?.('preview')
    onMobilePrimaryPanelChange('review')
  }

  // Dock tab definitions with badge counts
  const dockTabs = useMemo(
    () => [
      { id: 'terminal' as BottomDockTab, label: 'Terminal' },
      {
        id: 'agent-events' as BottomDockTab,
        label: 'Agent Events',
        badge: isStreaming ? 1 : 0,
        badgeSeverity: 'info' as const,
      },
    ],
    [isStreaming]
  )

  const outerLayoutPersistenceKey = `panda-workspace-${isRightPanelOpen ? 'right-open' : 'right-closed'}`

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
      planApproveDisabled={planApproveDisabled}
      planBuildDisabled={planBuildDisabled}
      activeCenterTab={activeCenterTab}
      onCenterTabChange={onCenterTabChange}
      pendingDiffCount={changedFilesCount}
      isAgentRunning={isStreaming}
      onStartAgent={onStartAgent}
      onOpenTerminal={onOpenTerminal}
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
              files={files.map((file) => ({
                _id: file._id,
                path: file.path,
                isBinary: file.isBinary ?? false,
                updatedAt: file.updatedAt,
              }))}
              selectedPath={selectedFilePath}
              onSelect={onSelectFile}
              onCreate={onCreateFile}
              onRename={onRenameFile}
              onDelete={onDeleteFile}
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
          }))}
          onStartAgent={onStartAgent}
        />
      )}
      {activeSection === 'search' && <ProjectSearchPanel onSelectFile={onSelectFile} />}
      {activeSection === 'git' && <SourceControlPane projectId={projectId} />}
      {activeSection === 'deploy' && (
        <div className="flex flex-col gap-3 p-3">
          <p className="font-mono text-xs text-muted-foreground">
            Deploy and preview settings will appear here.
          </p>
        </div>
      )}
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
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
        {isMobileLayout ? (
          <div className="relative flex h-full min-h-0 min-w-0 flex-col">
            <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
              {mobilePrimaryPanel === 'workspace'
                ? workbench
                : mobilePrimaryPanel === 'chat'
                  ? chatPanel
                  : mobilePrimaryPanel === 'review'
                    ? rightPanelContent
                    : null}
            </div>
            {!isMobileKeyboardOpen && (
              <div
                className="surface-1 grid min-h-14 grid-cols-4 border-t border-border pb-[env(safe-area-inset-bottom)] font-mono text-[10px] uppercase tracking-[0.18em]"
                role="tablist"
                aria-label="Workspace mobile panels"
              >
                <button
                  type="button"
                  onClick={() => onMobilePrimaryPanelChange('workspace')}
                  role="tab"
                  aria-selected={mobilePrimaryPanel === 'workspace'}
                  aria-label="Show session workspace"
                  className={cn(
                    'min-h-12 border-r border-border px-1 transition-colors focus-visible:-outline-offset-2 active:scale-[0.96]',
                    mobilePrimaryPanel === 'workspace'
                      ? 'bg-primary text-primary-foreground shadow-[inset_0_-2px_0_hsl(var(--foreground)/0.18)]'
                      : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                  )}
                >
                  Session
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
                      ? 'bg-primary text-primary-foreground shadow-[inset_0_-2px_0_hsl(var(--foreground)/0.18)]'
                      : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                  )}
                >
                  Chat
                  {mobileUnreadCount > 0 && mobilePrimaryPanel !== 'chat' && (
                    <span className="absolute right-2 top-1.5 min-w-5 border border-border bg-destructive px-1.5 py-0.5 text-center font-mono text-xs text-destructive-foreground">
                      {mobileUnreadCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={openMobileProof}
                  role="tab"
                  aria-selected={isMobileProofActive}
                  aria-label="Show run proof"
                  className={cn(
                    'relative min-h-12 border-r border-border px-1 transition-colors focus-visible:-outline-offset-2 active:scale-[0.96]',
                    isMobileProofActive
                      ? 'bg-primary text-primary-foreground shadow-[inset_0_-2px_0_hsl(var(--foreground)/0.18)]'
                      : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                  )}
                >
                  Proof
                </button>
                <button
                  type="button"
                  onClick={openMobilePreview}
                  role="tab"
                  aria-selected={isMobilePreviewActive}
                  aria-label="Show runtime preview"
                  className={cn(
                    'relative min-h-12 px-1 transition-colors focus-visible:-outline-offset-2 active:scale-[0.96]',
                    isMobilePreviewActive
                      ? 'bg-primary text-primary-foreground shadow-[inset_0_-2px_0_hsl(var(--foreground)/0.18)]'
                      : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                  )}
                >
                  Preview
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex h-full min-h-0 min-w-0">
              <div className="flex h-full min-h-0 shrink-0">
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

              <div className="min-h-0 min-w-0 flex-1">
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
                      key={`layout-${isRightPanelOpen ? 'right-open' : 'right-closed'}`}
                      direction="horizontal"
                      className="h-full min-h-0 min-w-0"
                      autoSaveId={outerLayoutPersistenceKey}
                    >
                      {/* Legacy contract marker retained for source-based integration tests:
                          id="review-panel" order={1}
                      */}
                      {/* Center workspace - dominant panel */}
                      <Panel
                        id="workspace-panel"
                        order={2}
                        defaultSize={isRightPanelOpen ? 50 : 100}
                        minSize={35}
                        className="flex min-h-0 min-w-0 flex-col"
                      >
                        {workbench}
                      </Panel>

                      {/* Right context panel - chat + context */}
                      {isRightPanelOpen && (
                        <>
                          <PanelResizeHandle
                            data-testid="workspace-right-resize-handle"
                            className="h-full w-px bg-border transition-colors hover:bg-primary"
                          />
                          <Panel
                            id="chat-panel"
                            order={3}
                            defaultSize={isCompactDesktopLayout ? 32 : 26}
                            minSize={22}
                            maxSize={40}
                            className="flex min-h-0 min-w-0 flex-col"
                          >
                            <div data-testid="right-panel" className="flex h-full min-h-0 flex-col">
                              {rightPanelContent}
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
                          {activeBottomDockTab === 'terminal' && <Terminal projectId={projectId} />}
                          {activeBottomDockTab === 'agent-events' && <AgentEventsPanel />}
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
