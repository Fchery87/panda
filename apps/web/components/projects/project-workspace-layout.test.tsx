import { describe, expect, test, mock } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { ProjectWorkspaceLayoutView } from './ProjectWorkspaceLayout'

mock.module('next/navigation', () => ({
  useRouter: () => ({ push: () => {}, replace: () => {} }),
  usePathname: () => '',
  useSearchParams: () => new URLSearchParams(),
}))

describe('ProjectWorkspaceLayout desktop shell', () => {
  test('renders the desktop right rail chat panel', () => {
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
        mobilePrimaryPanel="workspace"
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

    expect(html).toContain('right-panel')
  })

  test('renders chat-first mobile navigation with proof and preview access', () => {
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
    expect(html).toContain('aria-label="Show chat timeline"')
    expect(html).toContain('aria-label="Show run proof"')
    expect(html).toContain('aria-label="Show runtime preview"')
    expect(html).toContain('Work')
    expect(html).toContain('Chat')
    expect(html).toContain('Proof')
    expect(html).toContain('Preview')
    expect(html).toContain('chat-panel')
  })
})
