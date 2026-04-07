'use client'

import { useEffect, useMemo, useState } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import type { Id } from '@convex/_generated/dataModel'
import { FileTree } from './FileTree'
import { FileTabs } from './FileTabs'
import { ProjectSearchPanel } from './ProjectSearchPanel'
import { Terminal } from './Terminal'
import { PendingArtifactOverlay } from './PendingArtifactOverlay'
import { EditorContainer } from '../editor/EditorContainer'
import { cn } from '@/lib/utils'
import {
  FileCode,
  Plus,
  Search,
  Terminal as TerminalIcon,
  Minimize2,
  TerminalSquare,
  ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SpecHistory } from './SpecHistory'
import { SidebarRail } from '@/components/sidebar/SidebarRail'
import { SidebarFlyout } from '@/components/sidebar/SidebarFlyout'
import { SidebarHistoryPanel } from '@/components/sidebar/SidebarHistoryPanel'
import { SidebarGitPanel } from '@/components/sidebar/SidebarGitPanel'
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
}

function GripIndicator({ direction }: { direction: 'vertical' | 'horizontal' }) {
  if (direction === 'vertical') {
    return (
      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <div className="h-1 w-1 bg-muted-foreground/40" />
        <div className="h-1 w-1 bg-muted-foreground/40" />
        <div className="h-1 w-1 bg-muted-foreground/40" />
      </div>
    )
  }
  return (
    <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
      <div className="h-1 w-1 bg-muted-foreground/40" />
      <div className="h-1 w-1 bg-muted-foreground/40" />
      <div className="h-1 w-1 bg-muted-foreground/40" />
    </div>
  )
}

function HorizontalResizeHandle({ className }: { className?: string }) {
  return (
    <PanelResizeHandle className={cn('group relative h-4 cursor-row-resize', className)}>
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border transition-colors group-hover:bg-primary group-data-[resize-handle-state=drag]:bg-primary" />
      <GripIndicator direction="horizontal" />
    </PanelResizeHandle>
  )
}

interface EmptyStateProps {
  onCreateFile?: (path: string) => void
  onOpenSearch?: () => void
  variant?: 'desktop' | 'mobile'
}

function EmptyState({ onCreateFile, onOpenSearch, variant = 'desktop' }: EmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center text-muted-foreground">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-none border border-border bg-muted/50">
          <FileCode className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h3 className="font-mono text-lg font-medium text-foreground">No file selected</h3>
          <p className="max-w-xs text-sm text-muted-foreground">
            {variant === 'mobile'
              ? 'Open Files tab and select a file to edit'
              : 'Select a file from the explorer, or create a new file to get started'}
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        {onCreateFile && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-none font-mono text-xs"
            onClick={() => onCreateFile('')}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New File
          </Button>
        )}
        {onOpenSearch && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-none font-mono text-xs"
            onClick={onOpenSearch}
          >
            <Search className="mr-1.5 h-3.5 w-3.5" />
            Search
          </Button>
        )}
      </div>

      <div className="font-mono text-xs text-muted-foreground/50">
        <kbd className="rounded-none bg-muted px-1.5 py-0.5">Ctrl</kbd>+
        <kbd className="rounded-none bg-muted px-1.5 py-0.5">K</kbd> to open command palette
      </div>
    </div>
  )
}

const TERMINAL_STORAGE_KEY = 'panda:terminal-expanded'

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
}: WorkbenchProps) {
  const {
    activeSection: sidebarActiveSection,
    isFlyoutOpen: isSidebarFlyoutOpen,
    handleSectionChange: onSidebarSectionChange,
    toggleFlyout: onToggleSidebarFlyout,
    onSelectChat,
    isMobileLayout: isMobile,
    isCompactDesktopLayout: isCompactDesktop,
  } = useWorkspace()
  const [mobilePanel, setMobilePanel] = useState<'files' | 'editor' | 'terminal'>('editor')
  const [isTerminalExpanded, setIsTerminalExpanded] = useState(() => {
    if (typeof window === 'undefined') return false
    const stored = localStorage.getItem(TERMINAL_STORAGE_KEY)
    return stored === 'true'
  })
  const selectedFile = selectedFilePath ? files.find((f) => f.path === selectedFilePath) : undefined
  const selectedWorkspaceTab = openTabs.find((tab) => tab.path === selectedFilePath) ?? null
  const selectedPlanTab =
    selectedWorkspaceTab && isWorkspacePlanTab(selectedWorkspaceTab) ? selectedWorkspaceTab : null
  const innerLayoutPersistenceKey = `panda-workbench-inner-${
    isTerminalExpanded ? 'terminal-open' : 'terminal-closed'
  }`

  // Persist terminal state to localStorage
  useEffect(() => {
    localStorage.setItem(TERMINAL_STORAGE_KEY, String(isTerminalExpanded))
  }, [isTerminalExpanded])

  const shortcuts = useMemo(
    () => [
      {
        id: 'toggle-terminal',
        keys: 'mod+`',
        label: 'Toggle Terminal',
        handler: () => setIsTerminalExpanded((prev) => !prev),
        category: 'Panels',
      },
    ],
    []
  )

  useShortcuts(shortcuts)

  useEffect(() => {
    if (selectedFilePath) {
      setMobilePanel('editor')
    }
  }, [selectedFilePath])

  if (isMobile) {
    return (
      <div className="surface-0 h-full min-h-0 w-full min-w-0">
        <div className="surface-1 flex h-11 shrink-0 border-b border-border font-mono text-xs uppercase tracking-widest">
          <button
            type="button"
            onClick={() => setMobilePanel('files')}
            className={cn(
              'h-full min-h-11 flex-1 border-r border-border',
              mobilePanel === 'files'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Files
          </button>
          <button
            type="button"
            onClick={() => setMobilePanel('editor')}
            className={cn(
              'h-full min-h-11 flex-1 border-r border-border',
              mobilePanel === 'editor'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Editor
          </button>
          <button
            type="button"
            onClick={() => setMobilePanel('terminal')}
            className={cn(
              'h-full min-h-11 flex-1 border-r border-border',
              mobilePanel === 'terminal'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Terminal
          </button>
        </div>

        <div className="h-[calc(100%-2.75rem)] min-h-0 min-w-0">
          {mobilePanel === 'files' && (
            <div className="surface-1 flex h-full flex-col">
              <div className="flex border-b border-border">
                <button
                  type="button"
                  onClick={() => onSidebarSectionChange('explorer')}
                  className={cn(
                    'min-h-11 flex-1 border-r border-border px-2 py-2 font-mono text-xs uppercase tracking-widest',
                    sidebarActiveSection === 'explorer'
                      ? 'bg-surface-2 text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Explorer
                </button>
                <button
                  type="button"
                  onClick={() => onSidebarSectionChange('search')}
                  className={cn(
                    'min-h-11 flex-1 border-r border-border px-2 py-2 font-mono text-xs uppercase tracking-widest',
                    sidebarActiveSection === 'search'
                      ? 'bg-surface-2 text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Search
                </button>
                <button
                  type="button"
                  onClick={() => onSidebarSectionChange('specs')}
                  className={cn(
                    'min-h-11 flex-1 px-2 py-2 font-mono text-xs uppercase tracking-widest',
                    sidebarActiveSection === 'specs'
                      ? 'bg-surface-2 text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Specs
                </button>
              </div>

              <div className="scrollbar-thin flex-1 overflow-auto">
                {sidebarActiveSection === 'explorer' ? (
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
                ) : sidebarActiveSection === 'search' ? (
                  <ProjectSearchPanel onSelectFile={onSelectFile} />
                ) : sidebarActiveSection === 'git' ? (
                  <SidebarGitPanel projectId={projectId} />
                ) : (
                  <SpecHistory projectId={projectId} />
                )}
              </div>
            </div>
          )}

          {mobilePanel === 'editor' && (
            <div className="surface-0 flex h-full min-h-0 min-w-0 flex-col">
              <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
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
                      <div className="min-h-0 flex-1">
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
                  <EmptyState
                    onCreateFile={onCreateFile}
                    onOpenSearch={() => onSidebarSectionChange('search')}
                    variant="mobile"
                  />
                )}
              </div>
            </div>
          )}

          {mobilePanel === 'terminal' && (
            <div className="surface-1 flex h-full min-h-0 min-w-0 flex-col border-t border-border">
              <div className="panel-header flex items-center justify-between" data-number="03">
                <span>Terminal</span>
              </div>
              <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
                <Terminal projectId={projectId} />
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="surface-0 flex h-full min-h-0 w-full min-w-0 overflow-hidden">
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
          {sidebarActiveSection === 'explorer' && (
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
          {sidebarActiveSection === 'search' && <ProjectSearchPanel onSelectFile={onSelectFile} />}
          {sidebarActiveSection === 'specs' && <SpecHistory projectId={projectId} />}
          {sidebarActiveSection === 'git' && <SidebarGitPanel projectId={projectId} />}
          {sidebarActiveSection === 'history' && (
            <SidebarHistoryPanel
              projectId={projectId}
              activeChatId={currentChatId}
              onSelectChat={onSelectChat}
            />
          )}
          {sidebarActiveSection === 'terminal' && (
            <div className="flex flex-col gap-3 p-3">
              <p className="font-mono text-xs text-muted-foreground">
                The terminal lives in the workspace panel below.
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsTerminalExpanded(true)
                  onToggleSidebarFlyout()
                }}
                className="hover:bg-surface-2 flex items-center justify-center gap-2 border border-border px-3 py-2 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <TerminalSquare className="h-3.5 w-3.5" />
                Open Terminal
              </button>
            </div>
          )}
        </SidebarFlyout>
      </div>

      {/* Main content area - Editor with tabs */}
      <div className="min-h-0 min-w-0 flex-1">
        <PanelGroup
          key={innerLayoutPersistenceKey}
          direction="vertical"
          className="h-full min-h-0 min-w-0"
          autoSaveId={innerLayoutPersistenceKey}
        >
          {/* Editor + Timeline (tabbed) */}
          <Panel
            id="editor-panel"
            order={1}
            defaultSize={isCompactDesktop ? 76 : isTerminalExpanded ? 70 : 100}
            className="min-h-0 min-w-0"
          >
            <div className="surface-0 flex h-full min-h-0 min-w-0 flex-col">
              {/* File Tabs */}
              {openTabs.length > 0 && (
                <FileTabs
                  tabs={openTabs}
                  activePath={selectedFilePath}
                  onSelect={onSelectFile}
                  onClose={onCloseTab || (() => {})}
                />
              )}

              {/* Tab Content */}
              <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
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
                  <EmptyState
                    onCreateFile={onCreateFile}
                    onOpenSearch={() => onSidebarSectionChange('search')}
                    variant="desktop"
                  />
                )}
              </div>
            </div>
          </Panel>

          {/* Terminal - Collapsible */}
          {isTerminalExpanded ? (
            <>
              <HorizontalResizeHandle />
              <Panel
                id="terminal-panel"
                order={2}
                defaultSize={isCompactDesktop ? 24 : 30}
                minSize={isCompactDesktop ? 12 : 15}
                className="min-h-0 min-w-0 border-t border-border"
              >
                <div className="flex h-full min-h-0 min-w-0 flex-col">
                  {/* Terminal Header with Minimize Button */}
                  <div className="surface-1 flex h-8 shrink-0 items-center justify-between border-b border-border px-3">
                    <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                      <TerminalIcon className="h-3.5 w-3.5" />
                      <span>Terminal</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsTerminalExpanded(false)}
                      className="flex h-6 w-6 items-center justify-center rounded-none text-muted-foreground hover:text-foreground"
                      title="Minimize terminal"
                      aria-label="Minimize terminal"
                    >
                      <Minimize2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
                    <Terminal projectId={projectId} />
                  </div>
                </div>
              </Panel>
            </>
          ) : (
            <div className="surface-1 flex h-8 shrink-0 items-center justify-between border-t border-border px-3">
              <button
                type="button"
                onClick={() => setIsTerminalExpanded(true)}
                className="flex items-center gap-2 font-mono text-xs text-muted-foreground hover:text-foreground"
              >
                <ChevronUp className="h-3.5 w-3.5" />
                <TerminalIcon className="h-3.5 w-3.5" />
                <span>Terminal</span>
              </button>
              <span className="font-mono text-[10px] text-muted-foreground/50">
                <kbd className="rounded-none bg-muted px-1">Ctrl</kbd>+
                <kbd className="rounded-none bg-muted px-1">`</kbd>
              </span>
            </div>
          )}
        </PanelGroup>
      </div>
    </div>
  )
}
