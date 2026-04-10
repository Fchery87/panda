'use client'

import { useMemo } from 'react'

import type { Id } from '@convex/_generated/dataModel'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { CommandPalette } from '@/components/command-palette/CommandPalette'
import { RightPanel, type RightPanelTabId } from '@/components/panels/RightPanel'
import { SpecDrawer } from '@/components/chat/SpecDrawer'
import { StatusBar } from '@/components/workbench/StatusBar'
import { Workbench } from '@/components/workbench/Workbench'
import { BottomDock, type BottomDockTab } from '@/components/layout/BottomDock'
import { TaskHeader, type TaskStatus } from '@/components/layout/TaskHeader'
import { Terminal } from '@/components/workbench/Terminal'
import { AgentEventsPanel } from '@/components/panels/AgentEventsPanel'
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
  reviewPanel: React.ReactNode
  isReviewPanelOpen: boolean
  onReviewPanelOpenChange: (open: boolean) => void
  isChatPanelOpen: boolean
  pendingArtifactPreview?: WorkspaceArtifactPreview | null
  onApplyPendingArtifact: (artifactId: string) => void
  onRejectPendingArtifact: (artifactId: string) => void
  chatMode: ChatMode
  onModeChange: (mode: ChatMode) => void
  cursorPosition: { line: number; column: number } | null
  isStreaming: boolean
  currentSpec: FormalSpecification | null
  isSpecDrawerOpen: boolean
  onSpecDrawerOpenChange: (open: boolean) => void
  onContextualChat?: (selection: string, filePath: string) => void
  onInlineChat?: (prompt: string, selectedText: string, filePath: string) => Promise<string | null>
  // New: bottom dock and center tab state
  isBottomDockOpen?: boolean
  onBottomDockOpenChange?: (open: boolean) => void
  activeBottomDockTab?: BottomDockTab
  onBottomDockTabChange?: (tab: BottomDockTab) => void
  activeCenterTab?: 'home' | 'editor' | 'diff' | 'preview' | 'logs' | 'tests'
  onCenterTabChange?: (tab: 'home' | 'editor' | 'diff' | 'preview' | 'logs' | 'tests') => void
  // New: right panel replaces chat panel as primary right context
  isRightPanelOpen?: boolean
  onRightPanelOpenChange?: (open: boolean) => void
  rightPanelTab?: RightPanelTabId
  onRightPanelTabChange?: (tab: RightPanelTabId) => void
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
  reviewPanel,
  isReviewPanelOpen,
  onReviewPanelOpenChange,
  isChatPanelOpen: _isChatPanelOpen,
  pendingArtifactPreview,
  onApplyPendingArtifact,
  onRejectPendingArtifact,
  chatMode,
  onModeChange,
  cursorPosition,
  isStreaming,
  currentSpec,
  isSpecDrawerOpen,
  onSpecDrawerOpenChange,
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
  onRightPanelOpenChange: _onRightPanelOpenChange,
  rightPanelTab,
  onRightPanelTabChange,
  activeTaskTitle,
  activeTaskStatus,
  changedFilesCount = 0,
  onReviewChanges,
  onStopAgent,
  onStartAgent,
}: ProjectWorkspaceLayoutProps) {
  const { handleSectionChange: _handleSectionChange } = useWorkspace()
  void _handleSectionChange

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
                    ? reviewPanel
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
            {/* Desktop: Three-zone + dock layout */}
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
                  {/* Review panel - left side when open */}
                  {isReviewPanelOpen && (
                    <>
                      <Panel
                        id="review-panel"
                        order={1}
                        defaultSize={24}
                        minSize={20}
                        maxSize={35}
                        className="flex min-h-0 min-w-0 flex-col"
                      >
                        <div className="flex h-full min-h-0 min-w-0 flex-col bg-background">
                          <div className="surface-1 flex min-h-9 items-center justify-between border-b border-border px-3 font-mono text-[10px] uppercase tracking-[0.18em]">
                            <span className="text-foreground">Review</span>
                            <button
                              onClick={() => onReviewPanelOpenChange(false)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              ✕
                            </button>
                          </div>
                          <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
                            {reviewPanel}
                          </div>
                        </div>
                      </Panel>
                      <PanelResizeHandle className="h-full w-px bg-border transition-colors hover:bg-primary" />
                    </>
                  )}

                  {/* Center workspace - dominant panel */}
                  <Panel
                    id="workspace-panel"
                    order={2}
                    defaultSize={isRightPanelOpen ? 50 : isReviewPanelOpen ? 76 : 100}
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
                        <RightPanel
                          chatContent={chatPanel}
                          activeTab={rightPanelTab}
                          onTabChange={onRightPanelTabChange}
                        />
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
        specConstraintsMet={
          currentSpec?.verificationResults?.filter((result) => result.passed).length
        }
        specConstraintsTotal={currentSpec?.intent.acceptanceCriteria.length}
        onSpecClick={currentSpec ? () => onSpecDrawerOpenChange(true) : undefined}
      />
      <SpecDrawer
        spec={currentSpec}
        isOpen={isSpecDrawerOpen}
        onClose={() => onSpecDrawerOpenChange(false)}
      />
    </div>
  )
}
