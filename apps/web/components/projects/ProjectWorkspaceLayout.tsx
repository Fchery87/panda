'use client'

import { AnimatePresence, motion } from 'framer-motion'
import type { Id } from '@convex/_generated/dataModel'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { ArtifactPanel } from '@/components/artifacts/ArtifactPanel'
import { CommandPalette } from '@/components/command-palette/CommandPalette'
import { SpecDrawer } from '@/components/chat/SpecDrawer'
import { StatusBar } from '@/components/workbench/StatusBar'
import { Workbench } from '@/components/workbench/Workbench'
import { useSidebar } from '@/hooks/useSidebar'
import { cn } from '@/lib/utils'
import type { FormalSpecification } from '@/lib/agent/spec/types'
import type { ChatMode } from '@/lib/agent/prompt-library'
import type { WorkspaceArtifactPreview } from '@/components/workbench/artifact-preview'

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
  mobilePrimaryPanel: 'workspace' | 'chat'
  onMobilePrimaryPanelChange: (panel: 'workspace' | 'chat') => void
  mobileUnreadCount: number
  isMobileKeyboardOpen: boolean
  chatPanel: React.ReactNode
  isChatPanelOpen: boolean
  isArtifactPanelOpen: boolean
  onArtifactPanelOpenChange: (open: boolean) => void
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
  isChatPanelOpen,
  isArtifactPanelOpen,
  onArtifactPanelOpenChange,
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
}: ProjectWorkspaceLayoutProps) {
  const { activeSection, isFlyoutOpen, handleSectionChange, toggleFlyout } = useSidebar()

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
      onOpenArtifacts={() => onArtifactPanelOpenChange(true)}
      onEditorDirtyChange={onEditorDirtyChange}
      sidebarActiveSection={activeSection}
      isSidebarFlyoutOpen={isFlyoutOpen}
      onSidebarSectionChange={handleSectionChange}
      onToggleSidebarFlyout={toggleFlyout}
    />
  )

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div className="relative flex-1 overflow-hidden">
        {isMobileLayout ? (
          <div className="flex h-full flex-col">
            <div className="flex-1 overflow-hidden">
              {mobilePrimaryPanel === 'workspace' ? workbench : chatPanel}
            </div>
            {!isMobileKeyboardOpen && (
              <div className="surface-1 grid min-h-12 grid-cols-2 border-t border-border pb-[env(safe-area-inset-bottom)] font-mono text-xs uppercase tracking-widest">
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
                  Workspace
                </button>
                <button
                  type="button"
                  onClick={() => onMobilePrimaryPanelChange('chat')}
                  className={cn(
                    'relative h-full',
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
              </div>
            )}
          </div>
        ) : (
          <PanelGroup direction="horizontal" className="h-full" autoSaveId="panda-workbench-outer">
            <Panel
              defaultSize={isChatPanelOpen ? (isCompactDesktopLayout ? 64 : 70) : 100}
              minSize={40}
              className="flex flex-col"
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
                  className="flex flex-col"
                >
                  {chatPanel}
                </Panel>
              </>
            )}
          </PanelGroup>
        )}

        <AnimatePresence>
          {isArtifactPanelOpen && (
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="shadow-sharp-lg absolute bottom-0 right-0 top-0 z-40 w-72 border-l border-border bg-background xl:w-80"
            >
              <ArtifactPanel
                projectId={projectId}
                chatId={activeChatId}
                isOpen={true}
                onClose={() => onArtifactPanelOpenChange(false)}
                position="right"
              />
            </motion.div>
          )}
        </AnimatePresence>

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
