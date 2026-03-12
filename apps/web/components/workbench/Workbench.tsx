'use client'

import { useEffect, useState } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { FileTree } from './FileTree'
import { FileTabs } from './FileTabs'
import { ProjectSearchPanel } from './ProjectSearchPanel'
import { Terminal } from './Terminal'
import { EditorContainer } from '../editor/EditorContainer'
import { cn } from '@/lib/utils'
import {
  Code2,
  FileCode,
  Plus,
  Search,
  History,
  Terminal as TerminalIcon,
  ChevronUp,
  Minimize2,
} from 'lucide-react'
import type { Id } from '@convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Timeline } from './Timeline'
import { SpecHistory } from './SpecHistory'
import { ActivityBar, useActivityBarState } from './ActivityBar'

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

function VerticalResizeHandle({ className }: { className?: string }) {
  return (
    <PanelResizeHandle className={cn('group relative w-4 cursor-col-resize', className)}>
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border transition-colors group-hover:bg-primary group-data-[resize-handle-state=drag]:bg-primary" />
      <GripIndicator direction="vertical" />
    </PanelResizeHandle>
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

type EditorTab = 'code' | 'timeline'

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
}: WorkbenchProps) {
  const [activeTab, setActiveTab] = useState<EditorTab>('code')
  const {
    activeTab: activeSidebarTab,
    isExpanded: isSidebarExpanded,
    handleTabChange: handleSidebarTabChange,
    handleToggleExpand: handleToggleSidebar,
  } = useActivityBarState()
  const [mobilePanel, setMobilePanel] = useState<'files' | 'editor' | 'terminal'>('editor')
  const [isMobile, setIsMobile] = useState(false)
  const [isCompactDesktop, setIsCompactDesktop] = useState(false)
  const [isTerminalExpanded, setIsTerminalExpanded] = useState(() => {
    if (typeof window === 'undefined') return false
    const stored = localStorage.getItem(TERMINAL_STORAGE_KEY)
    return stored === 'true'
  })
  const selectedFile = selectedFilePath ? files.find((f) => f.path === selectedFilePath) : undefined

  // Persist terminal state to localStorage
  useEffect(() => {
    localStorage.setItem(TERMINAL_STORAGE_KEY, String(isTerminalExpanded))
  }, [isTerminalExpanded])

  // Listen for terminal toggle event from page.tsx
  useEffect(() => {
    const handleToggleTerminal = () => {
      setIsTerminalExpanded((prev) => !prev)
    }
    window.addEventListener('panda:toggle-terminal', handleToggleTerminal)
    return () => window.removeEventListener('panda:toggle-terminal', handleToggleTerminal)
  }, [])

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
                  onClick={() => handleSidebarTabChange('explorer')}
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
                  onClick={() => handleSidebarTabChange('search')}
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
                  onClick={() => handleSidebarTabChange('specs')}
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
                      onOpenSearch={() => handleSidebarTabChange('search')}
                      variant="mobile"
                    />
                  )
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
      <PanelGroup direction="horizontal" className="h-full" autoSaveId="panda-workbench-inner">
        {/* Activity Bar + Sidebar */}
        <div className="flex h-full">
          <ActivityBar
            activeTab={activeSidebarTab}
            isExpanded={isSidebarExpanded}
            onTabChange={handleSidebarTabChange}
            onToggleExpand={handleToggleSidebar}
            projectId={projectId}
          />

          {isSidebarExpanded && (
            <>
              <Panel
                defaultSize={isCompactDesktop ? 16 : 18}
                minSize={15}
                maxSize={30}
                className="surface-1 border-r border-border"
              >
                <div className="flex h-full flex-col">
                  {/* Sidebar Panel Header */}
                  <div className="panel-header-compact shrink-0">
                    {activeSidebarTab === 'explorer' && 'Explorer'}
                    {activeSidebarTab === 'search' && 'Search'}
                    {activeSidebarTab === 'specs' && 'Specifications'}
                  </div>
                  <div className="flex-1 overflow-auto">
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
            </>
          )}
        </div>

        {/* Main content area - Editor with tabs */}
        <Panel defaultSize={isCompactDesktop ? 84 : 82}>
          <PanelGroup direction="vertical" className="h-full">
            {/* Editor + Timeline (tabbed) */}
            <Panel defaultSize={isCompactDesktop ? 76 : isTerminalExpanded ? 70 : 100}>
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
                        onOpenSearch={() => handleSidebarTabChange('search')}
                        variant="desktop"
                      />
                    )
                  ) : (
                    <Timeline chatId={currentChatId} />
                  )}
                </div>
              </div>
            </Panel>

            {/* Terminal - Collapsible */}
            {isTerminalExpanded ? (
              <>
                <HorizontalResizeHandle />
                <Panel
                  defaultSize={isCompactDesktop ? 24 : 30}
                  minSize={isCompactDesktop ? 12 : 15}
                  className="border-t border-border"
                >
                  <div className="flex h-full flex-col">
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
                    <div className="flex-1 overflow-hidden">
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
        </Panel>
      </PanelGroup>
    </div>
  )
}
