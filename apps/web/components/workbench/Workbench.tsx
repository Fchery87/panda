'use client'

import { useEffect, useState } from 'react'
import { useAction } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { FileTree } from './FileTree'
import { ProjectSearchPanel } from './ProjectSearchPanel'
import { Terminal } from './Terminal'
import { EditorContainer } from '../editor/EditorContainer'
import { Preview } from './Preview'
import { cn } from '@/lib/utils'
import { Code2, Eye, Download, Loader2 } from 'lucide-react'
import type { Id } from '@convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface WorkbenchProps {
  projectId: Id<'projects'>
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
  onSelectFile: (path: string, location?: { line: number; column: number }) => void
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

type EditorTab = 'code' | 'preview'
type SidebarTab = 'explorer' | 'search'

export function Workbench({
  projectId,
  files,
  selectedFilePath,
  selectedLocation,
  onSelectFile,
  onCreateFile,
  onRenameFile,
  onDeleteFile,
  onSaveFile,
}: WorkbenchProps) {
  const [activeTab, setActiveTab] = useState<EditorTab>('code')
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>('explorer')
  const [mobilePanel, setMobilePanel] = useState<'files' | 'editor' | 'terminal'>('editor')
  const [isMobile, setIsMobile] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const downloadProject = useAction(api.files.downloadProject)
  const selectedFile = selectedFilePath ? files.find((f) => f.path === selectedFilePath) : undefined

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)')
    const update = () => setIsMobile(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (selectedFilePath) {
      setMobilePanel('editor')
    }
  }, [selectedFilePath])

  const handleDownload = async () => {
    if (isDownloading) return

    setIsDownloading(true)
    try {
      // Call Convex action to generate ZIP
      const result = await downloadProject({ projectId })

      // Convert base64 to blob
      const byteCharacters = atob(result.zipData)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'application/zip' })

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = result.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast.success('Project downloaded successfully')
    } catch (error) {
      toast.error('Failed to download project', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsDownloading(false)
    }
  }

  if (isMobile) {
    return (
      <div className="surface-0 h-full w-full">
        <div className="surface-1 flex h-11 shrink-0 border-b border-border font-mono text-[11px] uppercase tracking-widest">
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
              <div className="panel-header flex items-center justify-between" data-number="01">
                <span>{activeSidebarTab === 'explorer' ? 'Explorer' : 'Search'}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-none"
                  onClick={handleDownload}
                  disabled={isDownloading || files.length === 0}
                  title="Download project as ZIP"
                >
                  {isDownloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="flex border-b border-border">
                <button
                  type="button"
                  onClick={() => setActiveSidebarTab('explorer')}
                  className={cn(
                    'min-h-11 flex-1 border-r border-border px-2 py-2 font-mono text-[11px] uppercase tracking-widest',
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
                    'min-h-11 flex-1 px-2 py-2 font-mono text-[11px] uppercase tracking-widest',
                    activeSidebarTab === 'search'
                      ? 'bg-surface-2 text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Search
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
                ) : (
                  <ProjectSearchPanel onSelectFile={onSelectFile} />
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
                    'min-h-11 flex items-center gap-2 px-4 py-2 font-mono text-xs uppercase tracking-widest',
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
                    'min-h-11 flex items-center gap-2 px-4 py-2 font-mono text-xs uppercase tracking-widest',
                    activeTab === 'preview'
                      ? 'border-b-2 border-primary bg-background text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Eye className="h-3.5 w-3.5" />
                  Preview
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
                    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center text-muted-foreground">
                      <div className="font-mono text-sm">
                        <span className="text-primary">{'{'}</span>
                        <span className="mx-2">No file selected</span>
                        <span className="text-primary">{'}'}</span>
                      </div>
                      <p className="text-xs text-muted-foreground/60">
                        Open Files tab and select a file
                      </p>
                    </div>
                  )
                ) : (
                  <Preview />
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
          defaultSize={18}
          minSize={15}
          maxSize={30}
          className="surface-1 border-r border-border"
        >
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="panel-header flex items-center justify-between" data-number="01">
              <span>{activeSidebarTab === 'explorer' ? 'Explorer' : 'Search'}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-none"
                onClick={handleDownload}
                disabled={isDownloading || files.length === 0}
                title="Download project as ZIP"
              >
                {isDownloading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>

            <div className="flex border-b border-border">
              <button
                type="button"
                onClick={() => setActiveSidebarTab('explorer')}
                className={cn(
                  'transition-sharp flex-1 border-r border-border px-2 py-1.5 font-mono text-[10px] uppercase tracking-widest',
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
                  'transition-sharp flex-1 px-2 py-1.5 font-mono text-[10px] uppercase tracking-widest',
                  activeSidebarTab === 'search'
                    ? 'bg-surface-2 text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Search
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
              ) : (
                <ProjectSearchPanel onSelectFile={onSelectFile} />
              )}
            </div>
          </div>
        </Panel>

        <VerticalResizeHandle />

        {/* Main content area - Editor with tabs */}
        <Panel defaultSize={82}>
          <PanelGroup direction="vertical" className="h-full">
            {/* Editor + Preview (tabbed) */}
            <Panel defaultSize={70}>
              <div className="surface-0 flex h-full flex-col">
                {/* Tab Header */}
                <div className="panel-header flex items-center gap-0 p-0" data-number="02">
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
                      <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
                        <div className="font-mono text-sm">
                          <span className="text-primary">{'{'}</span>
                          <span className="mx-2">No file selected</span>
                          <span className="text-primary">{'}'}</span>
                        </div>
                        <p className="text-xs text-muted-foreground/60">
                          Select a file from the explorer
                        </p>
                      </div>
                    )
                  ) : (
                    <Preview />
                  )}
                </div>
              </div>
            </Panel>

            <HorizontalResizeHandle />

            {/* Terminal */}
            <Panel defaultSize={30} minSize={15}>
              <div className="surface-1 flex h-full flex-col border-t border-border">
                {/* Header */}
                <div className="panel-header flex items-center justify-between" data-number="03">
                  <span>Terminal</span>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden">
                  <Terminal projectId={projectId} />
                </div>
              </div>
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>
    </div>
  )
}
