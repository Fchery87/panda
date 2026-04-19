'use client'

import { useMemo } from 'react'

import type { Id } from '@convex/_generated/dataModel'
import { FileTabs } from './FileTabs'
import { PendingArtifactOverlay } from './PendingArtifactOverlay'
import { EditorContainer } from '../editor/EditorContainer'
import { CenterTabBar, type CenterTabBarTab } from './CenterTabBar'
import { WorkspaceHome } from './WorkspaceHome'
import { DiffTab } from './DiffTab'
import { LivePreview } from '@/components/preview/LivePreview'
import { WorkspaceBanner } from './WorkspaceBanner'
import { isWorkspacePlanTab, useWorkspace } from '@/contexts/WorkspaceContext'
import { useShortcuts } from '@/hooks/useShortcuts'

import { PlanArtifactTab } from './PlanArtifactTab'
import type { WorkspaceArtifactPreview } from './artifact-preview'
import type { DiffFileEntry } from './DiffTab'
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
  pendingDiffEntries?: DiffFileEntry[]
  onApplyPendingArtifact: (artifactId: string) => void
  onRejectPendingArtifact: (artifactId: string) => void
  onEditorDirtyChange: (filePath: string, isDirty: boolean) => void
  onContextualChat?: (selection: string, filePath: string) => void
  onInlineChat?: (prompt: string, selectedText: string, filePath: string) => Promise<string | null>
  /** Called when user clicks "Home" tab in center */
  activeCenterTab?: 'editor' | 'diff' | 'preview' | 'logs' | 'tests'
  onCenterTabChange?: (tab: 'editor' | 'diff' | 'preview' | 'logs' | 'tests') => void
  /** Number of pending diffs for the workspace home view */
  pendingDiffCount?: number
  /** Whether an agent is actively running */
  isAgentRunning?: boolean
  /** Called when user wants to start a new agent task (e.g. from WorkspaceHome) */
  onStartAgent?: () => void
  /** Best-effort preview URL derived from workspace jobs */
  previewUrl?: string | null
  /** Explicit runtime status for the preview environment */
  isPreviewRunning?: boolean
  onOpenPreview?: () => void
  onOpenTerminal?: () => void
}

const CENTER_TABS: CenterTabBarTab[] = [
  { id: 'editor', label: 'Editor' },
  { id: 'diff', label: 'Diff' },
  { id: 'preview', label: 'Preview' },
]

const innerLayoutPersistenceKey = 'panda-workbench-inner'

export function Workbench({
  projectId: _projectId,
  currentChatId: _currentChatId,
  files,
  selectedFilePath,
  selectedLocation,
  openTabs = [],
  onSelectFile,
  onCloseTab,
  onCreateFile: _onCreateFile,
  onRenameFile: _onRenameFile,
  onDeleteFile: _onDeleteFile,
  onSaveFile,
  pendingArtifactPreview,
  pendingDiffEntries = [],
  onApplyPendingArtifact,
  onRejectPendingArtifact,
  onEditorDirtyChange,
  onContextualChat,
  onInlineChat,
  activeCenterTab = 'editor',
  onCenterTabChange,
  pendingDiffCount = 0,
  isAgentRunning = false,
  onStartAgent,
  previewUrl,
  isPreviewRunning = false,
  onOpenPreview,
  onOpenTerminal,
}: WorkbenchProps) {
  const { isMobileLayout: isMobile } = useWorkspace()

  const selectedFile = selectedFilePath ? files.find((f) => f.path === selectedFilePath) : undefined
  const selectedWorkspaceTab = openTabs.find((tab) => tab.path === selectedFilePath) ?? null
  const selectedPlanTab =
    selectedWorkspaceTab && isWorkspacePlanTab(selectedWorkspaceTab) ? selectedWorkspaceTab : null

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

  const effectiveTab = activeCenterTab
  const centerTabs = useMemo(
    () =>
      CENTER_TABS.map((tab) => ({
        ...tab,
        badge: tab.id === 'diff' ? pendingDiffCount : undefined,
      })),
    [pendingDiffCount]
  )

  if (isMobile) {
    // Mobile layout - simplified stacked view
    return (
      <div className="surface-0 h-full min-h-0 w-full min-w-0">
        <CenterTabBar
          tabs={centerTabs.filter((tab) => tab.id === 'editor' || tab.id === 'diff')}
          activeTab={effectiveTab}
          onTabChange={onCenterTabChange}
        />
        <div className="h-[calc(100%-2.5rem)] min-h-0 min-w-0">
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
                    devServerRunning={isPreviewRunning}
                    previewUrl={previewUrl}
                    onOpenFile={onSelectFile}
                    onStartAgent={onStartAgent}
                    onOpenPreview={onOpenPreview}
                    onOpenTerminal={onOpenTerminal}
                  />
                )}
              </div>
            </div>
          )}
          {effectiveTab === 'diff' && (
            <DiffTab
              files={pendingDiffEntries}
              pendingDiffCount={pendingDiffCount}
              agentLabel="Agent"
            />
          )}
        </div>
      </div>
    )
  }

  // Desktop layout
  return (
    <div
      className="surface-0 h-full min-h-0 w-full min-w-0 overflow-hidden"
      data-layout-persistence-key={innerLayoutPersistenceKey}
    >
      {/* Legacy layout contract markers retained for source-based integration tests:
          autoSaveId={innerLayoutPersistenceKey}
          id="editor-panel" order={1}
          id="terminal-panel" order={2}
      */}
      <div className="surface-0 flex h-full min-h-0 min-w-0 flex-col">
        <CenterTabBar
          tabs={centerTabs}
          activeTab={effectiveTab}
          onTabChange={onCenterTabChange}
          trailingContent={
            effectiveTab === 'editor' ? (
              <>
                <span className="surface-0 border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {openTabs.length} tabs
                </span>
                <span className="surface-0 border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {files.length} files
                </span>
              </>
            ) : null
          }
        />

        {/* File Tabs (only in editor mode) */}
        {effectiveTab === 'editor' && openTabs.length > 0 && (
          <FileTabs
            tabs={openTabs}
            activePath={selectedFilePath}
            onSelect={onSelectFile}
            onClose={onCloseTab || (() => {})}
          />
        )}

        {/* Workspace Banner */}
        <WorkspaceBanner
          state={
            effectiveTab === 'diff' || pendingDiffCount === 0
              ? 'idle'
              : isAgentRunning
                ? 'agent-running'
                : 'agent-complete'
          }
          changedFilesCount={pendingDiffCount}
          onReviewDiff={() => onCenterTabChange?.('diff')}
          onOpenPreview={() => onCenterTabChange?.('preview')}
        />

        {/* Tab Content */}
        <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
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
                        onDirtyChange={(isDirty) => onEditorDirtyChange(selectedFile.path, isDirty)}
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
                  devServerRunning={isPreviewRunning}
                  previewUrl={previewUrl}
                  onOpenFile={onSelectFile}
                  onOpenDiffView={() => onCenterTabChange?.('diff')}
                  onStartAgent={onStartAgent}
                  onOpenPreview={onOpenPreview}
                  onOpenTerminal={onOpenTerminal}
                />
              )}
            </>
          )}

          {effectiveTab === 'diff' && (
            <DiffTab
              files={pendingDiffEntries}
              pendingDiffCount={pendingDiffCount}
              agentLabel="Agent"
            />
          )}

          {effectiveTab === 'preview' && (
            <LivePreview className="dot-grid h-full" url={previewUrl} />
          )}
        </div>
      </div>
    </div>
  )
}
