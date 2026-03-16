'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Id } from '@convex/_generated/dataModel'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { CommandPalette } from '@/components/command-palette/CommandPalette'
import { RightPanel } from '@/components/panels/RightPanel'
import { SpecDrawer } from '@/components/chat/SpecDrawer'
import { StatusBar } from '@/components/workbench/StatusBar'
import { Workbench } from '@/components/workbench/Workbench'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { cn } from '@/lib/utils'
import type { FormalSpecification } from '@/lib/agent/spec/types'
import type { ChatMode } from '@/lib/agent/prompt-library'
import type { WorkspaceArtifactPreview } from '@/components/workbench/artifact-preview'
import type { SidebarSection } from '@/components/sidebar/SidebarRail'

type OpenTab = {
  path: string
  isDirty?: boolean
}

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
  openTabs: OpenTab[]
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
  automationMode: 'manual' | 'auto'
  onAutomationModeChange: (mode: 'manual' | 'auto') => void
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
  isChatPanelOpen,
  automationMode,
  onAutomationModeChange,
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
}: ProjectWorkspaceLayoutProps) {
  const { handleSectionChange } = useWorkspace()
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

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
    />
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
            {/* Mobile sidebar overlay */}
            <AnimatePresence>
              {isMobileSidebarOpen && (
                <>
                  {/* Backdrop */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsMobileSidebarOpen(false)}
                    className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm"
                  />
                  {/* Sidebar panel */}
                  <motion.div
                    initial={{ x: '-100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '-100%' }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="surface-1 absolute inset-y-0 left-0 z-50 w-64 border-r border-border"
                  >
                    <div className="flex h-full flex-col p-4">
                      <div className="mb-4 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                        Navigation
                      </div>
                      {[
                        { section: 'explorer' as SidebarSection, label: 'Explorer' },
                        { section: 'search' as SidebarSection, label: 'Search' },
                        { section: 'history' as SidebarSection, label: 'History' },
                        { section: 'specs' as SidebarSection, label: 'Specifications' },
                        { section: 'git' as SidebarSection, label: 'Source Control' },
                        { section: 'terminal' as SidebarSection, label: 'Terminal' },
                      ].map(({ section, label }) => (
                        <button
                          key={section}
                          type="button"
                          onClick={() => {
                            handleSectionChange(section)
                            setIsMobileSidebarOpen(false)
                            onMobilePrimaryPanelChange('workspace')
                          }}
                          className="hover:bg-surface-2 flex items-center gap-3 px-3 py-2.5 font-mono text-sm text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <PanelGroup
            key={`${isReviewPanelOpen ? 'with-review' : 'without-review'}-${isChatPanelOpen ? 'with-chat' : 'without-chat'}`}
            direction="horizontal"
            className="h-full min-h-0 min-w-0"
            autoSaveId="panda-workbench-outer"
          >
            {isReviewPanelOpen && (
              <>
                <Panel
                  defaultSize={30}
                  minSize={25}
                  maxSize={45}
                  className="flex min-h-0 min-w-0 flex-col"
                >
                  <div className="flex h-full min-h-0 min-w-0 flex-col bg-background">
                    <div className="surface-1 flex min-h-11 items-center justify-between border-b border-border px-4 font-mono text-xs uppercase tracking-wide">
                      <span>Review</span>
                      <button
                        onClick={() => onReviewPanelOpenChange(false)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{reviewPanel}</div>
                  </div>
                </Panel>
                <PanelResizeHandle className="h-full w-px bg-border transition-colors hover:bg-primary" />
              </>
            )}

            <Panel
              defaultSize={
                isChatPanelOpen && isReviewPanelOpen
                  ? 40
                  : isChatPanelOpen || isReviewPanelOpen
                    ? isCompactDesktopLayout && !isReviewPanelOpen
                      ? 64
                      : 70
                    : 100
              }
              minSize={30}
              className="flex min-h-0 min-w-0 flex-col"
            >
              {workbench}
            </Panel>

            {isChatPanelOpen && (
              <>
                <PanelResizeHandle className="h-full w-px bg-border transition-colors hover:bg-primary" />

                <Panel
                  defaultSize={isCompactDesktopLayout ? 36 : 30}
                  minSize={isCompactDesktopLayout ? 30 : 25}
                  maxSize={isCompactDesktopLayout ? 45 : 50}
                  className="flex min-h-0 min-w-0 flex-col"
                >
                  <RightPanel
                    chatContent={chatPanel}
                    chatInput={null}
                    automationMode={automationMode}
                    onAutomationModeChange={onAutomationModeChange}
                    isStreaming={isStreaming}
                  />
                </Panel>
              </>
            )}
          </PanelGroup>
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
