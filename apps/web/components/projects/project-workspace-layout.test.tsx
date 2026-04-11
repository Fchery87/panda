import { describe, expect, test, mock } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { ProjectWorkspaceLayout } from './ProjectWorkspaceLayout'

mock.module('next/navigation', () => ({
  useRouter: () => ({ push: () => {}, replace: () => {} }),
  usePathname: () => '',
  useSearchParams: () => new URLSearchParams(),
}))

mock.module('@/contexts/WorkspaceContext', () => ({
  useWorkspace: () => ({ handleSectionChange: () => {} }),
}))

describe('ProjectWorkspaceLayout desktop shell', () => {
  test('renders the desktop right rail chat panel', () => {
    const html = renderToStaticMarkup(
      <ProjectWorkspaceLayout
        projectId={'project' as never}
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
        isSpecDrawerOpen={false}
        onSpecDrawerOpenChange={() => {}}
        onApplyPendingArtifact={() => {}}
        onRejectPendingArtifact={() => {}}
      />
    )

    expect(html).toContain('right-panel')
  })
})
