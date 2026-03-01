'use client'

import { useEffect, useState } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { FileTree } from './FileTree'
import { FileTabs } from './FileTabs'
import { ProjectSearchPanel } from './ProjectSearchPanel'
import { Terminal } from './Terminal'
import { EditorContainer } from '../editor/EditorContainer'
import { Preview } from './Preview'
import { cn } from '@/lib/utils'
import { Code2, Eye, FileCode, Plus, Search, History } from 'lucide-react'
import type { Id } from '@convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Timeline } from './Timeline'
import { SpecHistory } from './SpecHistory'

interface OpenFileTab {
  path: string
  isDirty?: boolean
}

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
  openTabs?: OpenFileTab[]
  onSelectFile: (path: string, location?: { line: number; column: number }) => void
  onCloseTab?: (path: string) => void
  onCreateFile: (path: string) => void
  onRenameFile: (oldPath: string, newPath: string) => void
  onDeleteFile: (path: string) => void
  onSaveFile: (filePath: string, content: string) => void
}

function VerticalResizeHandle({ className }: { className?: string }) {
  return (
    <PanelResizeHandle className={cn('group relative', className)}>
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border transition-colors group-hover:bg-primary group-data-[resize-handle-state=drag]:bg-primary" />
    </PanelResizeHandle>
  )
}

function HorizontalResizeHandle({ className }: { className?: string }) {
  return (
    <PanelResizeHandle className={cn('group relative h-px', className)}>
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border transition-colors group-hover:bg-primary group-data-[resize-handle-state=drag]:bg-primary" />
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

type EditorTab = 'code' | 'preview' | 'timeline'
type SidebarTab = 'explorer' | 'search' | 'specs'

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
}: WorkbenchProps) {
  const [activeTab, setActiveTab] = useState<EditorTab>('code')
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>('explorer')
  const [mobilePanel, setMobilePanel] = useState<'files' | 'editor' | 'terminal'>('editor')
  const [isMobile, setIsMobile] = useState(false)
  const [isCompactDesktop, setIsCompactDesktop] = useState(false)
  const selectedFile = selectedFilePath ? files.find((f) => f.path === selectedFilePath) : undefined

  useEffect(() => {
    const mobileMedia = window.matchMedia('(max-width: 1023px)')
    const compactDesktopMedia = window.matchMedia('(min-width: 1024px) and (max-width: 1279px)')
    const update = () => {
      setIsMobile(mobileMedia.matches)
      setIsCompactDesktop(compactDesktopMedia.matches)
    }
    update()
    mobileMedia.addEventListener('change', update)
    compactDesktopMedia.addEventListener('change', update)
    return () => {
      mobileMedia.removeEventListener('change', update)
      compactDesktopMedia.removeEventListener('change', update)
    }
  }, [])

  useEffect(() => {
    if (selectedFilePath) {
      setMobilePanel('editor')
    }
  }, [selectedFilePath])

  if (isMobile) {
    return (
      <div className="surface-0 h-full w-full">
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
              'h-full min-h-11 flex-1',
              mobilePanel === 'terminal'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Terminal
          </button>
        </div>

        <div className="h-[calc(100%-2.75rem)]">
          {mobilePanel === 'files' && (
            <div className="surface-1 flex h-full flex-col">
              <div className="flex border-b border-border">
                <button
                  type="button"
                  onClick={() => setActiveSidebarTab('explorer')}
                  className={cn(
                    'min-h-11 flex-1 border-r border-border px-2 py-2 font-mono text-xs uppercase tracking-widest',
                    activeSidebarTab === 'explorer'
                      ? 'bg-surface-2 text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Explorer
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSidebarTab('search')}
                  className={cn(
                    'min-h-11 flex-1 border-r border-border px-2 py-2 font-mono text-xs uppercase tracking-widest',
                    activeSidebarTab === 'search'
                      ? 'bg-surface-2 text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Search
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSidebarTab('specs')}
                  className={cn(
                    'min-h-11 flex-1 px-2 py-2 font-mono text-xs uppercase tracking-widest',
                    activeSidebarTab === 'specs'
                      ? 'bg-surface-2 text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Specs
                </button>
              </div>

              <div className="scrollbar-thin flex-1 overflow-auto">
                {activeSidebarTab === 'explorer' ? (
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
                ) : activeSidebarTab === 'search' ? (
                  <ProjectSearchPanel onSelectFile={onSelectFile} />
                ) : (
                  <SpecHistory projectId={projectId} />
                )}
              </div>
            </div>
          )}

          {mobilePanel === 'editor' && (
            <div className="surface-0 flex h-full flex-col">
              <div className="panel-header flex items-center gap-0 p-0" data-number="02">
                <button
                  onClick={() => setActiveTab('code')}
                  className={cn(
                    'flex min-h-11 items-center gap-2 px-4 py-2 font-mono text-xs uppercase tracking-widest',
                    activeTab === 'code'
                      ? 'border-b-2 border-primary bg-background text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Code2 className="h-3.5 w-3.5" />
                  Code
                </button>
                <button
                  onClick={() => setActiveTab('preview')}
                  className={cn(
                    'flex min-h-11 items-center gap-2 px-4 py-2 font-mono text-xs uppercase tracking-widest',
                    activeTab === 'preview'
                      ? 'border-b-2 border-primary bg-background text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Eye className="h-3.5 w-3.5" />
                  Preview
                </button>
                <button
                  onClick={() => setActiveTab('timeline')}
                  className={cn(
                    'flex min-h-11 items-center gap-2 px-4 py-2 font-mono text-xs uppercase tracking-widest',
                    activeTab === 'timeline'
                      ? 'border-b-2 border-primary bg-background text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <History className="h-3.5 w-3.5" />
                  Timeline
                </button>
              </div>

              <div className="flex-1 overflow-hidden">
                {activeTab === 'code' ? (
                  selectedFile ? (
                    <EditorContainer
                      filePath={selectedFile.path}
                      content={selectedFile.content ?? ''}
                      jumpTo={selectedLocation}
                      onSave={(content) => onSaveFile(selectedFile.path, content)}
                    />
                  ) : (
                    <EmptyState
                      onCreateFile={onCreateFile}
                      onOpenSearch={() => setActiveSidebarTab('search')}
                      variant="mobile"
                    />
                  )
                ) : activeTab === 'preview' ? (
                  <Preview />
                ) : (
                  <Timeline chatId={currentChatId} />
                )}
              </div>
            </div>
          )}

          {mobilePanel === 'terminal' && (
            <div className="surface-1 flex h-full flex-col border-t border-border">
              <div className="panel-header flex items-center justify-between" data-number="03">
                <span>Terminal</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <Terminal projectId={projectId} />
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="surface-0 h-full w-full">
      <PanelGroup direction="horizontal" className="h-full">
        {/* Left sidebar - File Explorer */}
        <Panel
          defaultSize={isCompactDesktop ? 16 : 18}
          minSize={15}
          maxSize={30}
          className="surface-1 border-r border-border"
        >
          <div className="flex h-full flex-col">
            <div className="flex border-b border-border">
              <button
                type="button"
                onClick={() => setActiveSidebarTab('explorer')}
                className={cn(
                  'transition-sharp flex-1 border-r border-border px-2 py-1.5 font-mono text-xs uppercase tracking-widest',
                  activeSidebarTab === 'explorer'
                    ? 'bg-surface-2 text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Explorer
              </button>
              <button
                type="button"
                onClick={() => setActiveSidebarTab('search')}
                className={cn(
                  'transition-sharp flex-1 border-r border-border px-2 py-1.5 font-mono text-xs uppercase tracking-widest',
                  activeSidebarTab === 'search'
                    ? 'bg-surface-2 text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => setActiveSidebarTab('specs')}
                className={cn(
                  'transition-sharp flex-1 px-2 py-1.5 font-mono text-xs uppercase tracking-widest',
                  activeSidebarTab === 'specs'
                    ? 'bg-surface-2 text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Specs
              </button>
            </div>

            {/* Content */}
            <div className="scrollbar-thin flex-1 overflow-auto">
              {activeSidebarTab === 'explorer' ? (
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
              ) : activeSidebarTab === 'search' ? (
                <ProjectSearchPanel onSelectFile={onSelectFile} />
              ) : (
                <SpecHistory projectId={projectId} />
              )}
            </div>
          </div>
        </Panel>

        <VerticalResizeHandle />

        {/* Main content area - Editor with tabs */}
        <Panel defaultSize={isCompactDesktop ? 84 : 82}>
          <PanelGroup direction="vertical" className="h-full">
            {/* Editor + Preview (tabbed) */}
            <Panel defaultSize={isCompactDesktop ? 76 : 70}>
              <div className="surface-0 flex h-full flex-col">
                {/* File Tabs */}
                {openTabs.length > 0 && (
                  <FileTabs
                    tabs={openTabs}
                    activePath={selectedFilePath}
                    onSelect={onSelectFile}
                    onClose={onCloseTab || (() => {})}
                  />
                )}

                {/* Tab Header */}
                <div
                  className={cn(
                    'panel-header flex items-center gap-0 p-0',
                    openTabs.length === 0 && ''
                  )}
                  data-number="02"
                >
                  <button
                    onClick={() => setActiveTab('code')}
                    className={cn(
                      'transition-sharp flex items-center gap-2 px-4 py-2 font-mono text-xs uppercase tracking-widest',
                      activeTab === 'code'
                        ? 'border-b-2 border-primary bg-background text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Code2 className="h-3.5 w-3.5" />
                    Code
                  </button>
                  <button
                    onClick={() => setActiveTab('preview')}
                    className={cn(
                      'transition-sharp flex items-center gap-2 px-4 py-2 font-mono text-xs uppercase tracking-widest',
                      activeTab === 'preview'
                        ? 'border-b-2 border-primary bg-background text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Preview
                  </button>
                  <button
                    onClick={() => setActiveTab('timeline')}
                    className={cn(
                      'transition-sharp flex items-center gap-2 px-4 py-2 font-mono text-xs uppercase tracking-widest',
                      activeTab === 'timeline'
                        ? 'border-b-2 border-primary bg-background text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <History className="h-3.5 w-3.5" />
                    Timeline
                  </button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-hidden">
                  {activeTab === 'code' ? (
                    selectedFile ? (
                      <EditorContainer
                        filePath={selectedFile.path}
                        content={selectedFile.content ?? ''}
                        jumpTo={selectedLocation}
                        onSave={(content) => onSaveFile(selectedFile.path, content)}
                      />
                    ) : (
                      <EmptyState
                        onCreateFile={onCreateFile}
                        onOpenSearch={() => setActiveSidebarTab('search')}
                        variant="desktop"
                      />
                    )
                  ) : activeTab === 'preview' ? (
                    <Preview />
                  ) : (
                    <Timeline chatId={currentChatId} />
                  )}
                </div>
              </div>
            </Panel>

            <HorizontalResizeHandle />

            {/* Terminal */}
            <Panel
              defaultSize={isCompactDesktop ? 24 : 30}
              minSize={isCompactDesktop ? 12 : 15}
              className="border-t border-border"
            >
              <Terminal projectId={projectId} />
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>
    </div>
  )
}
