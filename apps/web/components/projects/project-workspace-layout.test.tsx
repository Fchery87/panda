import { describe, expect, test, mock } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { useWorkspaceUiStore } from '@/stores/workspaceUiStore'
import { ProjectWorkspaceLayoutView } from './ProjectWorkspaceLayout'

mock.module('next/navigation', () => ({
  useRouter: () => ({ push: () => {}, replace: () => {} }),
  usePathname: () => '',
  useSearchParams: () => new URLSearchParams(),
}))

mock.module('convex/react', () => ({
  useQuery: () => [],
}))

mock.module('@/components/workbench/Terminal', () => ({
  Terminal: () => <div>terminal-panel</div>,
}))

describe('ProjectWorkspaceLayout desktop shell', () => {
  test('renders workbench and chat dock simultaneously in code mode with inspector alongside it', () => {
    useWorkspaceUiStore.setState({ workspaceFocusMode: 'workbench' })
    const html = renderToStaticMarkup(
      <ProjectWorkspaceLayoutView
        projectId={'project' as never}
        activeSection="files"
        isFlyoutOpen={false}
        onSidebarSectionChange={() => {}}
        onToggleFlyout={() => {}}
        onSelectChat={() => {}}
        onNewChat={() => {}}
        files={[]}
        selectedFilePath={null}
        openTabs={[]}
        onSelectFile={() => {}}
        onCloseTab={() => {}}
        onCreateFile={async () => {}}
        onRenameFile={async () => {}}
        onDeleteFile={async () => {}}
        onSaveFile={async () => {}}
        onEditorDirtyChange={() => {}}
        isMobileLayout={false}
        isCompactDesktopLayout={false}
        mobilePrimaryPanel="work"
        onMobilePrimaryPanelChange={() => {}}
        mobileUnreadCount={0}
        isMobileKeyboardOpen={false}
        chatPanel={<div>chat-panel</div>}
        rightPanelContent={<div>right-panel</div>}
        isRightPanelOpen={true}
        chatMode="code"
        onModeChange={() => {}}
        cursorPosition={null}
        isStreaming={false}
        currentSpec={null}
        openSpecInspect={() => {}}
        onApplyPendingArtifact={() => {}}
        onRejectPendingArtifact={() => {}}
        sessionRailSummary={{ state: 'idle', label: 'Idle', count: 0, tasks: [] }}
      />
    )

    expect(html).toContain('data-testid="workspace-editor-region"')
    expect(html).toContain('data-testid="workspace-chat-dock"')
    expect(html).toContain('panda-workbench-inner')
    expect(html).toContain('chat-panel')
    expect(html).toContain('right-panel')
  })

  test('renders named execution session shell regions without moving surfaces', () => {
    const html = renderToStaticMarkup(
      <ProjectWorkspaceLayoutView
        projectId={'project' as never}
        activeSection="files"
        isFlyoutOpen={false}
        onSidebarSectionChange={() => {}}
        onToggleFlyout={() => {}}
        onSelectChat={() => {}}
        onNewChat={() => {}}
        files={[]}
        selectedFilePath={null}
        openTabs={[]}
        onSelectFile={() => {}}
        onCloseTab={() => {}}
        onCreateFile={async () => {}}
        onRenameFile={async () => {}}
        onDeleteFile={async () => {}}
        onSaveFile={async () => {}}
        onEditorDirtyChange={() => {}}
        isMobileLayout={false}
        isCompactDesktopLayout={false}
        mobilePrimaryPanel="work"
        onMobilePrimaryPanelChange={() => {}}
        mobileUnreadCount={0}
        isMobileKeyboardOpen={false}
        chatPanel={<div>chat-panel</div>}
        rightPanelContent={<div>right-panel</div>}
        isRightPanelOpen={true}
        isBottomDockOpen={true}
        chatMode="code"
        onModeChange={() => {}}
        cursorPosition={null}
        isStreaming={false}
        currentSpec={null}
        openSpecInspect={() => {}}
        onApplyPendingArtifact={() => {}}
        onRejectPendingArtifact={() => {}}
        sessionRailSummary={{ state: 'idle', label: 'Idle', count: 0, tasks: [] }}
      />
    )

    expect(html).toContain('data-testid="execution-session-rail-region"')
    expect(html).toContain('data-testid="workspace-editor-region"')
    expect(html).toContain('data-testid="workspace-chat-dock"')
    expect(html).toContain('data-testid="execution-session-timeline-region"')
    expect(html).toContain('data-testid="execution-session-work-tray-region"')
    expect(html).toContain('data-testid="execution-session-terminal-drawer-region"')
    expect(html).toContain('right-panel')
    expect(html).toContain('Terminal')
    expect(html).not.toContain('Agent Events')
  })

  test('renders the workbench as the primary session canvas while keeping chat dock available', () => {
    useWorkspaceUiStore.setState({ workspaceFocusMode: 'workbench' })
    const html = renderToStaticMarkup(
      <ProjectWorkspaceLayoutView
        projectId={'project' as never}
        activeSection="files"
        isFlyoutOpen={false}
        onSidebarSectionChange={() => {}}
        onToggleFlyout={() => {}}
        onSelectChat={() => {}}
        onNewChat={() => {}}
        files={[]}
        selectedFilePath={null}
        openTabs={[]}
        onSelectFile={() => {}}
        onCloseTab={() => {}}
        onCreateFile={async () => {}}
        onRenameFile={async () => {}}
        onDeleteFile={async () => {}}
        onSaveFile={async () => {}}
        onEditorDirtyChange={() => {}}
        isMobileLayout={false}
        isCompactDesktopLayout={false}
        mobilePrimaryPanel="work"
        onMobilePrimaryPanelChange={() => {}}
        mobileUnreadCount={0}
        isMobileKeyboardOpen={false}
        chatPanel={<div>chat-panel</div>}
        rightPanelContent={<div>right-panel</div>}
        isRightPanelOpen={false}
        chatMode="code"
        onModeChange={() => {}}
        cursorPosition={null}
        isStreaming={false}
        currentSpec={null}
        openSpecInspect={() => {}}
        onApplyPendingArtifact={() => {}}
        onRejectPendingArtifact={() => {}}
        sessionRailSummary={{ state: 'idle', label: 'Idle', count: 0, tasks: [] }}
      />
    )

    expect(html).toContain('data-testid="workspace-editor-region"')
    expect(html).toContain('data-testid="workspace-chat-dock"')
    expect(html).toContain('data-testid="execution-session-timeline-region"')
    expect(html).toContain('panda-workbench-inner')
    expect(html).toContain('chat-panel')
  })

  test('renders session-centered rail language', () => {
    const html = renderToStaticMarkup(
      <ProjectWorkspaceLayoutView
        projectId={'project' as never}
        activeSection="tasks"
        isFlyoutOpen={true}
        onSidebarSectionChange={() => {}}
        onToggleFlyout={() => {}}
        onSelectChat={() => {}}
        onNewChat={() => {}}
        files={[]}
        selectedFilePath={null}
        openTabs={[]}
        onSelectFile={() => {}}
        onCloseTab={() => {}}
        onCreateFile={async () => {}}
        onRenameFile={async () => {}}
        onDeleteFile={async () => {}}
        onSaveFile={async () => {}}
        onEditorDirtyChange={() => {}}
        isMobileLayout={false}
        isCompactDesktopLayout={false}
        mobilePrimaryPanel="work"
        onMobilePrimaryPanelChange={() => {}}
        mobileUnreadCount={0}
        isMobileKeyboardOpen={false}
        chatPanel={<div>chat-panel</div>}
        rightPanelContent={<div>right-panel</div>}
        isRightPanelOpen={false}
        chatMode="code"
        onModeChange={() => {}}
        cursorPosition={null}
        isStreaming={false}
        currentSpec={null}
        openSpecInspect={() => {}}
        onApplyPendingArtifact={() => {}}
        onRejectPendingArtifact={() => {}}
        sessionRailSummary={{ state: 'idle', label: 'Idle', count: 0, tasks: [] }}
      />
    )

    expect(html).toContain('New Session')
    expect(html).toContain('No execution sessions yet')
  })

  test('labels workspace areas and support surfaces by job', () => {
    const html = renderToStaticMarkup(
      <ProjectWorkspaceLayoutView
        projectId={'project' as never}
        activeSection="files"
        isFlyoutOpen={false}
        onSidebarSectionChange={() => {}}
        onToggleFlyout={() => {}}
        onSelectChat={() => {}}
        onNewChat={() => {}}
        files={[]}
        selectedFilePath={null}
        openTabs={[]}
        onSelectFile={() => {}}
        onCloseTab={() => {}}
        onCreateFile={async () => {}}
        onRenameFile={async () => {}}
        onDeleteFile={async () => {}}
        onSaveFile={async () => {}}
        onEditorDirtyChange={() => {}}
        isMobileLayout={false}
        isCompactDesktopLayout={false}
        mobilePrimaryPanel="work"
        onMobilePrimaryPanelChange={() => {}}
        mobileUnreadCount={0}
        isMobileKeyboardOpen={false}
        chatPanel={<div>chat-panel</div>}
        rightPanelContent={<div>right-panel</div>}
        isRightPanelOpen={false}
        chatMode="code"
        onModeChange={() => {}}
        cursorPosition={null}
        isStreaming={false}
        currentSpec={null}
        openSpecInspect={() => {}}
        onApplyPendingArtifact={() => {}}
        onRejectPendingArtifact={() => {}}
        sessionRailSummary={{ state: 'idle', label: 'Idle', count: 0, tasks: [] }}
      />
    )

    expect(html).toContain('aria-label="Sessions"')
    expect(html).toContain('Focus Chat')
    expect(html).toContain('Focus Editor')
    expect(html).toContain('Focus Run')
    expect(html).toContain('Focus Changes')
    expect(html).toContain('aria-label="Explorer"')
    expect(html).toContain('aria-label="Source Control"')
  })

  test('renders desktop focus mode switcher without changing mobile panels', () => {
    const html = renderToStaticMarkup(
      <ProjectWorkspaceLayoutView
        projectId={'project' as never}
        activeSection="files"
        isFlyoutOpen={false}
        onSidebarSectionChange={() => {}}
        onToggleFlyout={() => {}}
        onSelectChat={() => {}}
        onNewChat={() => {}}
        files={[]}
        selectedFilePath={null}
        openTabs={[]}
        onSelectFile={() => {}}
        onCloseTab={() => {}}
        onCreateFile={async () => {}}
        onRenameFile={async () => {}}
        onDeleteFile={async () => {}}
        onSaveFile={async () => {}}
        onEditorDirtyChange={() => {}}
        isMobileLayout={false}
        isCompactDesktopLayout={false}
        mobilePrimaryPanel="work"
        onMobilePrimaryPanelChange={() => {}}
        mobileUnreadCount={0}
        isMobileKeyboardOpen={false}
        chatPanel={<div>chat-panel</div>}
        rightPanelContent={<div>right-panel</div>}
        isRightPanelOpen={true}
        chatMode="code"
        onModeChange={() => {}}
        cursorPosition={null}
        isStreaming={false}
        currentSpec={null}
        openSpecInspect={() => {}}
        onApplyPendingArtifact={() => {}}
        onRejectPendingArtifact={() => {}}
        sessionRailSummary={{ state: 'idle', label: 'Idle', count: 0, tasks: [] }}
      />
    )

    expect(html).toContain('aria-label="Workspace focus modes"')
    expect(html).toContain('data-workspace-focus-mode="workbench"')
    expect(html).toContain('aria-pressed="true"')
  })

  test('renders chat-first mobile navigation with run access', () => {
    const html = renderToStaticMarkup(
      <ProjectWorkspaceLayoutView
        projectId={'project' as never}
        activeSection="files"
        isFlyoutOpen={false}
        onSidebarSectionChange={() => {}}
        onToggleFlyout={() => {}}
        onSelectChat={() => {}}
        onNewChat={() => {}}
        files={[]}
        selectedFilePath={null}
        openTabs={[]}
        onSelectFile={() => {}}
        onCloseTab={() => {}}
        onCreateFile={async () => {}}
        onRenameFile={async () => {}}
        onDeleteFile={async () => {}}
        onSaveFile={async () => {}}
        onEditorDirtyChange={() => {}}
        isMobileLayout={true}
        isCompactDesktopLayout={false}
        mobilePrimaryPanel="chat"
        onMobilePrimaryPanelChange={() => {}}
        mobileUnreadCount={0}
        isMobileKeyboardOpen={false}
        chatPanel={<div>chat-panel</div>}
        rightPanelContent={<div>right-panel</div>}
        isRightPanelOpen={false}
        chatMode="code"
        onModeChange={() => {}}
        cursorPosition={null}
        isStreaming={false}
        currentSpec={null}
        openSpecInspect={() => {}}
        onApplyPendingArtifact={() => {}}
        onRejectPendingArtifact={() => {}}
        sessionRailSummary={{ state: 'idle', label: 'Idle', count: 0, tasks: [] }}
      />
    )

    expect(html).toContain('role="tablist"')
    expect(html).toContain('aria-label="Show editor"')
    expect(html).toContain('aria-label="Show chat timeline"')
    expect(html).toContain('aria-label="Show run evidence"')
    expect(html).toContain('Editor')
    expect(html).toContain('Chat')
    expect(html).toContain('Run')
    expect(html).toContain('Changes')
    expect(html).toContain('chat-panel')
  })
})
