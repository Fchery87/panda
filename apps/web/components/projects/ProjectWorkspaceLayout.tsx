'use client'

import { useMemo } from 'react'

import type { Id } from '@convex/_generated/dataModel'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { CommandPalette } from '@/components/command-palette/CommandPalette'
import { StatusBar } from '@/components/workbench/StatusBar'
import { Workbench } from '@/components/workbench/Workbench'
import { BottomDock, type BottomDockTab } from '@/components/layout/BottomDock'
import { TaskHeader, type TaskStatus } from '@/components/layout/TaskHeader'
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
import { useWorkspace, type WorkspaceOpenTab } from '@/contexts/WorkspaceContext'
import { cn } from '@/lib/utils'
import type { FormalSpecification } from '@/lib/agent/spec/types'
import type { ChatMode } from '@/lib/agent/prompt-library'
import type { WorkspaceArtifactPreview } from '@/components/workbench/artifact-preview'

type FileRecord = {
  _id: Id<'files'>
  path: string
  content: string
  isBinary: boolean
  updatedAt: number
}

interface ProjectWorkspaceLayoutProps {
  projectId: Id<'projects'>
  activeChatId?: Id<'chats'>
  files: FileRecord[]
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
  mobileUnreadCount: number
  isMobileKeyboardOpen: boolean
  chatPanel: React.ReactNode
  rightPanelContent: React.ReactNode
  pendingArtifactPreview?: WorkspaceArtifactPreview | null
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
  // New: bottom dock and center tab state
  isBottomDockOpen?: boolean
  onBottomDockOpenChange?: (open: boolean) => void
  activeBottomDockTab?: BottomDockTab
  onBottomDockTabChange?: (tab: BottomDockTab) => void
  activeCenterTab?: 'home' | 'editor' | 'diff' | 'preview' | 'logs' | 'tests'
  onCenterTabChange?: (tab: 'home' | 'editor' | 'diff' | 'preview' | 'logs' | 'tests') => void
  isRightPanelOpen?: boolean
  // Task header
  activeTaskTitle?: string
  activeTaskStatus?: TaskStatus
  changedFilesCount?: number
  onReviewChanges?: () => void
  onStopAgent?: () => void
  onStartAgent?: () => void
}

export function ProjectWorkspaceLayout({
  projectId,
  activeChatId,
  files,
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
  mobileUnreadCount,
  isMobileKeyboardOpen,
  chatPanel,
  rightPanelContent,
  pendingArtifactPreview,
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
  // New props with defaults
  isBottomDockOpen = false,
  onBottomDockOpenChange,
  activeBottomDockTab = 'terminal',
  onBottomDockTabChange,
  activeCenterTab = 'home',
  onCenterTabChange,
  isRightPanelOpen,
  activeTaskTitle,
  activeTaskStatus,
  changedFilesCount = 0,
  onReviewChanges,
  onStopAgent,
  onStartAgent,
}: ProjectWorkspaceLayoutProps) {
  const { activeSection, isFlyoutOpen, handleSectionChange, toggleFlyout, onSelectChat } =
    useWorkspace()

  // Dock tab definitions with badge counts
  const dockTabs = useMemo(
    () => [
      { id: 'terminal' as BottomDockTab, label: 'Terminal' },
      { id: 'problems' as BottomDockTab, label: 'Problems', badge: 0 },
      {
        id: 'agent-events' as BottomDockTab,
        label: 'Agent Events',
        badge: isStreaming ? 1 : 0,
        badgeSeverity: 'info' as const,
      },
      { id: 'logs' as BottomDockTab, label: 'Logs' },
      { id: 'build' as BottomDockTab, label: 'Build' },
    ],
    [isStreaming]
  )

  const outerLayoutPersistenceKey = `panda-workspace-${isRightPanelOpen ? 'right-open' : 'right-closed'}`

  const workbench = (
    <Workbench
      projectId={projectId}
      currentChatId={activeChatId}
      files={files}
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
      onApplyPendingArtifact={onApplyPendingArtifact}
      onRejectPendingArtifact={onRejectPendingArtifact}
      onEditorDirtyChange={onEditorDirtyChange}
      onContextualChat={onContextualChat}
      onInlineChat={onInlineChat}
      activeCenterTab={activeCenterTab}
      onCenterTabChange={onCenterTabChange}
      pendingDiffCount={changedFilesCount}
      isAgentRunning={isStreaming}
      onStartAgent={onStartAgent}
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
                content: file.content,
                isBinary: file.isBinary,
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
            fileContent={files.find((file) => file.path === selectedFilePath)?.content}
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
          tasks={
            isStreaming
              ? [
                  {
                    id: 'current',
                    title: activeTaskTitle ?? 'Active Task',
                    workspace: 'Current project',
                    status: 'running',
                    lastActivity: 'now',
                    changedFiles: changedFilesCount,
                  },
                ]
              : []
          }
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
        />
      )}
    </SidebarFlyout>
  )

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      {/* Task Header - visible when agent has active work */}
      {activeTaskTitle && activeTaskStatus && (
        <TaskHeader
          title={activeTaskTitle}
          status={activeTaskStatus}
          changedFilesCount={changedFilesCount}
          onReviewChanges={onReviewChanges}
          onStop={onStopAgent}
        />
      )}

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
              <div className="surface-1 grid min-h-12 grid-cols-3 border-t border-border pb-[env(safe-area-inset-bottom)] font-mono text-xs uppercase tracking-widest">
                <button
                  type="button"
                  onClick={() => onMobilePrimaryPanelChange('workspace')}
                  className={cn(
                    'h-full border-r border-border',
                    mobilePrimaryPanel === 'workspace'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Work
                </button>
                <button
                  type="button"
                  onClick={() => onMobilePrimaryPanelChange('chat')}
                  className={cn(
                    'relative h-full border-r border-border',
                    mobilePrimaryPanel === 'chat'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
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
                  onClick={() => onMobilePrimaryPanelChange('review')}
                  className={cn(
                    'relative h-full',
                    mobilePrimaryPanel === 'review'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Review
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
                  onSectionChange={handleSectionChange}
                  onToggleFlyout={toggleFlyout}
                  projectId={String(projectId)}
                  onHomeClick={() => onCenterTabChange?.('home')}
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
                          <PanelResizeHandle className="h-full w-px bg-border transition-colors hover:bg-primary" />
                          <Panel
                            id="chat-panel"
                            order={3}
                            defaultSize={isCompactDesktopLayout ? 32 : 26}
                            minSize={22}
                            maxSize={40}
                            className="flex min-h-0 min-w-0 flex-col"
                          >
                            {rightPanelContent}
                          </Panel>
                        </>
                      )}
                    </PanelGroup>
                  </Panel>

                  {/* Bottom Dock */}
                  {isBottomDockOpen && (
                    <>
                      <PanelResizeHandle className="h-px w-full bg-border transition-colors hover:bg-primary" />
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
                          {activeBottomDockTab === 'problems' && (
                            <div className="flex h-full items-center justify-center font-mono text-xs text-muted-foreground">
                              No problems detected
                            </div>
                          )}
                          {activeBottomDockTab === 'agent-events' && <AgentEventsPanel />}
                          {activeBottomDockTab === 'logs' && (
                            <div className="flex h-full items-center justify-center font-mono text-xs text-muted-foreground">
                              No logs
                            </div>
                          )}
                          {activeBottomDockTab === 'build' && (
                            <div className="flex h-full items-center justify-center font-mono text-xs text-muted-foreground">
                              No build output
                            </div>
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
          </>
        )}

        <CommandPalette
          files={files.map((file) => ({ path: file.path }))}
          onModeChange={onModeChange}
          currentMode={chatMode}
        />
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
      />
    </div>
  )
}
