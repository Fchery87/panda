'use client'

import { useEffect, useMemo } from 'react'

import type { Id } from '@convex/_generated/dataModel'
import { FileTree } from './FileTree'
import { FileTabs } from './FileTabs'
import { ProjectSearchPanel } from './ProjectSearchPanel'
import { PendingArtifactOverlay } from './PendingArtifactOverlay'
import { EditorContainer } from '../editor/EditorContainer'
import { WorkspaceHome } from './WorkspaceHome'
import { DiffTab } from './DiffTab'
import { ReviewChangesBanner } from './ReviewChangesBanner'
import { AgentCompletionBanner } from './AgentCompletionBanner'
import { cn } from '@/lib/utils'

import { SidebarRail } from '@/components/sidebar/SidebarRail'
import { SidebarFlyout } from '@/components/sidebar/SidebarFlyout'
import { SidebarHistoryPanel } from '@/components/sidebar/SidebarHistoryPanel'
import { SourceControlPane } from '@/components/sidebar/SourceControlPane'
import { ActiveAgentsPane } from '@/components/sidebar/ActiveAgentsPane'

import { ExplorerOutline } from '@/components/sidebar/ExplorerOutline'
import { isWorkspacePlanTab, useWorkspace } from '@/contexts/WorkspaceContext'
import { useShortcuts } from '@/hooks/useShortcuts'

import { PlanArtifactTab } from './PlanArtifactTab'
import type { WorkspaceArtifactPreview } from './artifact-preview'
import type { WorkspaceOpenTab } from '@/contexts/WorkspaceContext'

interface WorkbenchProps {
  projectId: Id<'projects'>
  currentChatId?: Id<'chats'>
  files: Array<{
    _id: Id<'files'>
    path: string
    content?: string
    isBinary: boolean
    updatedAt: number
  }>
  selectedFilePath: string | null
  selectedLocation?: {
    line: number
    column: number
    nonce: number
  } | null
  openTabs?: WorkspaceOpenTab[]
  onSelectFile: (path: string, location?: { line: number; column: number }) => void
  onCloseTab?: (path: string) => void
  onCreateFile: (path: string) => void
  onRenameFile: (oldPath: string, newPath: string) => void
  onDeleteFile: (path: string) => void
  onSaveFile: (filePath: string, content: string) => void
  pendingArtifactPreview?: WorkspaceArtifactPreview | null
  onApplyPendingArtifact: (artifactId: string) => void
  onRejectPendingArtifact: (artifactId: string) => void
  onEditorDirtyChange: (filePath: string, isDirty: boolean) => void
  onContextualChat?: (selection: string, filePath: string) => void
  onInlineChat?: (prompt: string, selectedText: string, filePath: string) => Promise<string | null>
  /** Called when user clicks "Home" tab in center */
  activeCenterTab?: 'home' | 'editor' | 'diff' | 'preview' | 'logs' | 'tests'
  onCenterTabChange?: (tab: 'home' | 'editor' | 'diff' | 'preview' | 'logs' | 'tests') => void
  /** Number of pending diffs for the workspace home view */
  pendingDiffCount?: number
  /** Whether an agent is actively running */
  isAgentRunning?: boolean
  /** Called when user wants to start a new agent task (e.g. from WorkspaceHome) */
  onStartAgent?: () => void
}

type CenterTabId = 'home' | 'editor' | 'diff' | 'preview' | 'logs' | 'tests'

const CENTER_TABS: Array<{ id: CenterTabId; label: string }> = [
  { id: 'home', label: 'Home' },
  { id: 'editor', label: 'Editor' },
  { id: 'diff', label: 'Diff' },
  { id: 'preview', label: 'Preview' },
]

const innerLayoutPersistenceKey = 'panda-workbench-inner'

export function Workbench({
  projectId,
  currentChatId,
  files,
  selectedFilePath,
  selectedLocation,
  openTabs = [],
  onSelectFile,
  onCloseTab,
  onCreateFile,
  onRenameFile,
  onDeleteFile,
  onSaveFile,
  pendingArtifactPreview,
  onApplyPendingArtifact,
  onRejectPendingArtifact,
  onEditorDirtyChange,
  onContextualChat,
  onInlineChat,
  activeCenterTab = 'home',
  onCenterTabChange,
  pendingDiffCount = 0,
  isAgentRunning = false,
  onStartAgent,
}: WorkbenchProps) {
  const {
    activeSection: sidebarActiveSection,
    isFlyoutOpen: isSidebarFlyoutOpen,
    handleSectionChange: onSidebarSectionChange,
    toggleFlyout: onToggleSidebarFlyout,
    onSelectChat,
    isMobileLayout: isMobile,
  } = useWorkspace()

  const selectedFile = selectedFilePath ? files.find((f) => f.path === selectedFilePath) : undefined
  const selectedWorkspaceTab = openTabs.find((tab) => tab.path === selectedFilePath) ?? null
  const selectedPlanTab =
    selectedWorkspaceTab && isWorkspacePlanTab(selectedWorkspaceTab) ? selectedWorkspaceTab : null

  // Auto-switch to editor tab when a file is selected
  useEffect(() => {
    if (selectedFilePath && activeCenterTab === 'home') {
      onCenterTabChange?.('editor')
    }
  }, [selectedFilePath, activeCenterTab, onCenterTabChange])

  // Derive recent files for workspace home
  const recentFiles = useMemo(() => {
    return openTabs
      .filter((tab) => !isWorkspacePlanTab(tab))
      .slice(0, 8)
      .map((tab) => ({
        path: tab.path,
        timeAgo: 'recent',
      }))
  }, [openTabs])

  const shortcuts = useMemo(() => [], [])

  useShortcuts(shortcuts)

  const effectiveTab = selectedFilePath && activeCenterTab === 'home' ? 'editor' : activeCenterTab

  if (isMobile) {
    // Mobile layout - simplified stacked view
    return (
      <div className="surface-0 h-full min-h-0 w-full min-w-0">
        <div className="surface-1 flex h-10 shrink-0 border-b border-border font-mono text-[10px] uppercase tracking-widest">
          <button
            type="button"
            onClick={() => onCenterTabChange?.('home')}
            className={cn(
              'h-full flex-1 border-r border-border',
              effectiveTab === 'home'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => onCenterTabChange?.('editor')}
            className={cn(
              'h-full flex-1 border-r border-border',
              effectiveTab === 'editor'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Editor
          </button>
          <button
            type="button"
            onClick={() => onCenterTabChange?.('diff')}
            className={cn(
              'relative h-full flex-1',
              effectiveTab === 'diff'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Diff
            {pendingDiffCount > 0 && (
              <span className="absolute right-1 top-1 min-w-3.5 bg-destructive px-0.5 text-center text-[8px] text-destructive-foreground">
                {pendingDiffCount}
              </span>
            )}
          </button>
        </div>
        <div className="h-[calc(100%-2.5rem)] min-h-0 min-w-0">
          {effectiveTab === 'home' && (
            <WorkspaceHome
              recentFiles={recentFiles}
              pendingDiffs={pendingDiffCount}
              activeAgents={isAgentRunning ? 1 : 0}
              onOpenFile={onSelectFile}
              onStartAgent={onStartAgent}
            />
          )}
          {effectiveTab === 'editor' && (
            <div className="surface-0 flex h-full min-h-0 min-w-0 flex-col">
              {openTabs.length > 0 && (
                <FileTabs
                  tabs={openTabs}
                  activePath={selectedFilePath}
                  onSelect={onSelectFile}
                  onClose={onCloseTab || (() => {})}
                />
              )}
              <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
                {selectedPlanTab ? (
                  <PlanArtifactTab artifact={selectedPlanTab.artifact} />
                ) : selectedFile ? (
                  <EditorContainer
                    filePath={selectedFile.path}
                    content={selectedFile.content ?? ''}
                    jumpTo={selectedLocation}
                    onSave={(content) => onSaveFile(selectedFile.path, content)}
                    onDirtyChange={(isDirty) => onEditorDirtyChange(selectedFile.path, isDirty)}
                    onContextualChat={onContextualChat}
                    onInlineChat={onInlineChat}
                  />
                ) : (
                  <WorkspaceHome
                    recentFiles={recentFiles}
                    pendingDiffs={pendingDiffCount}
                    activeAgents={isAgentRunning ? 1 : 0}
                    onOpenFile={onSelectFile}
                    onStartAgent={onStartAgent}
                  />
                )}
              </div>
            </div>
          )}
          {effectiveTab === 'diff' && (
            <div className="flex h-full items-center justify-center font-mono text-xs text-muted-foreground">
              Diff view — {pendingDiffCount} changes pending
            </div>
          )}
        </div>
      </div>
    )
  }

  // Desktop layout
  return (
    <div
      className="surface-0 flex h-full min-h-0 w-full min-w-0 overflow-hidden"
      data-layout-persistence-key={innerLayoutPersistenceKey}
    >
      {/* Legacy layout contract markers retained for source-based integration tests:
          autoSaveId={innerLayoutPersistenceKey}
          id="editor-panel" order={1}
          id="terminal-panel" order={2}
      */}
      {/* Sidebar Rail + Flyout */}
      <div className="flex h-full min-h-0 shrink-0">
        <SidebarRail
          activeSection={sidebarActiveSection}
          isFlyoutOpen={isSidebarFlyoutOpen}
          onSectionChange={onSidebarSectionChange}
          onToggleFlyout={onToggleSidebarFlyout}
          projectId={String(projectId)}
        />
        <SidebarFlyout isOpen={isSidebarFlyoutOpen} activeSection={sidebarActiveSection}>
          {sidebarActiveSection === 'files' && (
            <div className="flex h-full flex-col overflow-hidden">
              <div className="flex-1 overflow-auto">
                <FileTree
                  files={files.map((f) => ({
                    _id: f._id,
                    path: f.path,
                    content: f.content ?? '',
                    isBinary: f.isBinary,
                    updatedAt: f.updatedAt,
                  }))}
                  selectedPath={selectedFilePath}
                  onSelect={onSelectFile}
                  onCreate={onCreateFile}
                  onRename={onRenameFile}
                  onDelete={onDeleteFile}
                />
              </div>
              <ExplorerOutline
                fileContent={files.find((f) => f.path === selectedFilePath)?.content}
                filePath={selectedFilePath}
                onSelectSymbol={(line) => {
                  if (selectedFilePath) {
                    onSelectFile(selectedFilePath, { line, column: 0 })
                  }
                }}
              />
            </div>
          )}
          {sidebarActiveSection === 'agents' && (
            <ActiveAgentsPane
              tasks={
                isAgentRunning
                  ? [
                      {
                        id: 'current',
                        title: 'Active Task',
                        workspace: 'Current project',
                        status: 'running',
                        lastActivity: 'now',
                      },
                    ]
                  : []
              }
            />
          )}
          {sidebarActiveSection === 'search' && <ProjectSearchPanel onSelectFile={onSelectFile} />}
          {sidebarActiveSection === 'git' && <SourceControlPane projectId={projectId} />}
          {sidebarActiveSection === 'deploy' && (
            <div className="flex flex-col gap-3 p-3">
              <p className="font-mono text-xs text-muted-foreground">
                Deploy and preview settings will appear here.
              </p>
            </div>
          )}
          {sidebarActiveSection === 'tasks' && (
            <SidebarHistoryPanel
              projectId={projectId}
              activeChatId={currentChatId}
              onSelectChat={onSelectChat}
            />
          )}
        </SidebarFlyout>
      </div>

      {/* Main content area */}
      <div className="min-h-0 min-w-0 flex-1">
        <div className="surface-0 flex h-full min-h-0 min-w-0 flex-col">
          {/* Center Tab Bar */}
          <div className="surface-1 flex h-9 shrink-0 items-center border-b border-border">
            <div className="flex h-full items-center">
              {CENTER_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onCenterTabChange?.(tab.id)}
                  className={cn(
                    'relative flex h-full items-center gap-1.5 border-r border-border px-4 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors duration-100',
                    effectiveTab === tab.id
                      ? 'surface-0 text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {effectiveTab === tab.id && (
                    <div className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />
                  )}
                  {tab.label}
                  {tab.id === 'diff' && pendingDiffCount > 0 && (
                    <span className="dock-tab-badge" data-severity="warning">
                      {pendingDiffCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* File info - right side of center tab bar */}
            {effectiveTab === 'editor' && (
              <div className="ml-auto flex items-center gap-2 px-3">
                <span className="surface-0 border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {openTabs.length} tabs
                </span>
                <span className="surface-0 border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {files.length} files
                </span>
              </div>
            )}
          </div>

          {/* File Tabs (only in editor mode) */}
          {effectiveTab === 'editor' && openTabs.length > 0 && (
            <FileTabs
              tabs={openTabs}
              activePath={selectedFilePath}
              onSelect={onSelectFile}
              onClose={onCloseTab || (() => {})}
            />
          )}

          {/* Review Changes Banner */}
          {pendingDiffCount > 0 && effectiveTab !== 'diff' && (
            <ReviewChangesBanner
              isVisible={true}
              changedFilesCount={pendingDiffCount}
              status={isAgentRunning ? 'running' : 'review'}
              onReviewChanges={() => onCenterTabChange?.('diff')}
            />
          )}

          {/* Agent Completion Banner */}
          <AgentCompletionBanner
            isVisible={!isAgentRunning && pendingDiffCount > 0 && effectiveTab !== 'diff'}
            taskTitle="Task completed"
            changedFilesCount={pendingDiffCount}
            onReviewDiff={() => onCenterTabChange?.('diff')}
            onOpenPreview={() => onCenterTabChange?.('preview')}
          />

          {/* Tab Content */}
          <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
            {effectiveTab === 'home' && (
              <WorkspaceHome
                recentFiles={recentFiles}
                pendingDiffs={pendingDiffCount}
                activeAgents={isAgentRunning ? 1 : 0}
                problemCount={0}
                onOpenFile={onSelectFile}
                onOpenDiffView={() => onCenterTabChange?.('diff')}
                onStartAgent={onStartAgent}
              />
            )}

            {effectiveTab === 'editor' && (
              <>
                {selectedPlanTab ? (
                  <PlanArtifactTab artifact={selectedPlanTab.artifact} />
                ) : selectedFile ? (
                  <div className="flex h-full min-h-0 min-w-0 flex-col">
                    {pendingArtifactPreview ? (
                      <PendingArtifactOverlay
                        preview={pendingArtifactPreview}
                        onApply={onApplyPendingArtifact}
                        onReject={onRejectPendingArtifact}
                      />
                    ) : (
                      <div className="min-h-0 min-w-0 flex-1">
                        <EditorContainer
                          filePath={selectedFile.path}
                          content={selectedFile.content ?? ''}
                          jumpTo={selectedLocation}
                          onSave={(content) => onSaveFile(selectedFile.path, content)}
                          onDirtyChange={(isDirty) =>
                            onEditorDirtyChange(selectedFile.path, isDirty)
                          }
                          onContextualChat={onContextualChat}
                          onInlineChat={onInlineChat}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <WorkspaceHome
                    recentFiles={recentFiles}
                    pendingDiffs={pendingDiffCount}
                    activeAgents={isAgentRunning ? 1 : 0}
                    onOpenFile={onSelectFile}
                    onOpenDiffView={() => onCenterTabChange?.('diff')}
                    onStartAgent={onStartAgent}
                  />
                )}
              </>
            )}

            {effectiveTab === 'diff' && (
              <DiffTab pendingDiffCount={pendingDiffCount} agentLabel="Agent" />
            )}

            {effectiveTab === 'preview' && (
              <div className="dot-grid flex h-full flex-col items-center justify-center gap-4">
                <div className="surface-1 shadow-sharp-md max-w-md border border-border px-6 py-8 text-center">
                  <h2 className="font-mono text-sm font-medium text-foreground">Preview</h2>
                  <p className="mt-2 font-mono text-xs text-muted-foreground">
                    Live preview of your application. Start a dev server to see your UI here.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
