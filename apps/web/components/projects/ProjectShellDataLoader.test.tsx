import { describe, expect, test } from 'bun:test'
import path from 'node:path'

async function readLoader() {
  const fs = await import('node:fs')
  return fs.readFileSync(path.resolve(import.meta.dir, 'ProjectShellDataLoader.tsx'), 'utf-8')
}

async function readProvider() {
  const fs = await import('node:fs')
  return fs.readFileSync(path.resolve(import.meta.dir, 'WorkspaceRuntimeProvider.tsx'), 'utf-8')
}

async function readWorkbench() {
  const fs = await import('node:fs')
  return fs.readFileSync(path.resolve(import.meta.dir, '../workbench/Workbench.tsx'), 'utf-8')
}

async function readChatSessionHook() {
  const fs = await import('node:fs')
  return fs.readFileSync(
    path.resolve(import.meta.dir, '../../hooks/useProjectChatSession.ts'),
    'utf-8'
  )
}

describe('ProjectShellDataLoader structure', () => {
  test('renders ProjectNotFoundGuard when project is null', async () => {
    const content = await readLoader()
    expect(content).toContain('if (project === null)')
    expect(content).toContain('<ProjectNotFoundGuard />')
  })

  test('renders ProjectLoadingGuard when project or files are not ready', async () => {
    const content = await readLoader()
    expect(content).toContain(
      'if (project === undefined || files === undefined || chats === undefined)'
    )
    expect(content).toContain('<ProjectLoadingGuard projectLoaded={project !== undefined} />')
  })

  test('delegates all logic to WorkspaceRuntimeProvider', async () => {
    const content = await readLoader()
    expect(content).toContain(
      "import { WorkspaceRuntimeProvider } from '@/components/projects/WorkspaceRuntimeProvider'"
    )
    expect(content).toContain('<WorkspaceRuntimeProvider')
  })

  test('loads file metadata at project boot instead of file contents', async () => {
    const content = await readLoader()
    expect(content).toContain('getProjectBootQueryArgs(projectId)')
    expect(content).toContain('api.files.listMetadata')
    expect(content).toContain('projectBootQueryArgs.files')
    expect(content).not.toContain('api.files.list, { projectId }')
  })

  test('loads bounded chat summaries at project boot', async () => {
    const content = await readLoader()
    expect(content).toContain('api.chats.listRecent')
    expect(content).toContain('projectBootQueryArgs.chats')
    expect(content).not.toContain('api.chats.list, { projectId }')
  })

  test('fetches selected older chat without unbounding project boot', async () => {
    const content = await readChatSessionHook()
    expect(content).toContain('const activeChatMissingFromRecent =')
    expect(content).toContain('api.chats.get')
    expect(content).toContain('const availableChats =')
    expect(content).toContain('...args.chats')
    expect(content).toContain('normalizeChatMode(fetchedActiveChat.mode,')
    expect(content).not.toContain('api.chats.list')
  })

  test('keeps provider file state metadata-only', async () => {
    const content = await readProvider()
    expect(content).toContain('interface ProjectFileMetadata')
    expect(content).not.toContain('interface File')
    expect(content).not.toContain('content: string')
  })

  test('tracks selected file content load state separately from content value', async () => {
    const providerContent = await readProvider()
    const workbenchContent = await readWorkbench()

    expect(providerContent).toContain('const selectedFileContentLoaded =')
    expect(providerContent).toContain('const selectedFileContent = selectedFile?.content ??')
    expect(workbenchContent).toContain('selectedFileContentLoaded')
    expect(workbenchContent).toContain('<FileContentLoadingState filePath={selectedFile.path} />')
  })

  test('wraps children in AgentRuntimeProvider', async () => {
    const content = await readProvider()
    expect(content).toContain(
      "import { AgentRuntimeProvider } from '@/contexts/AgentRuntimeContext'"
    )
    expect(content).toContain('<AgentRuntimeProvider')
  })

  test('reads UI state from workspaceUiStore instead of prop drilling', async () => {
    const content = await readProvider()
    expect(content).toContain("from '@/stores/workspaceUiStore'")
    expect(content).toContain('useWorkspaceUiStore()')
    expect(content).not.toContain("from '@/hooks/buildWorkspaceContextValue'")
    expect(content).not.toContain("from '@/hooks/buildProjectChatPanelProps'")
    expect(content).not.toContain("from '@/hooks/buildWorkbenchRightPanelProps'")
  })

  test('reads chat session state from chatSessionStore', async () => {
    const content = await readProvider()
    expect(content).toContain("import { useChatSessionStore } from '@/stores/chatSessionStore'")
    expect(content).toContain('useChatSessionStore()')
  })

  test('reads editor context state from editorContextStore', async () => {
    const content = await readProvider()
    expect(content).toContain("import { useEditorContextStore } from '@/stores/editorContextStore'")
    expect(content).toContain('useEditorContextStore()')
  })

  test('uses planning-session state to gate approval and build actions', async () => {
    const content = await readProvider()
    expect(content).toContain('const canApproveCurrentPlan = planningSession.canApprove')
    expect(content).toContain('const canBuildCurrentPlan = planningSession.canBuild')
    expect(content).not.toContain('canApprovePlan(')
    expect(content).not.toContain('canBuildFromPlan(')
  })

  test('does not import deleted prop-builder hooks', async () => {
    const loaderContent = await readLoader()
    const providerContent = await readProvider()
    expect(loaderContent).not.toContain("from '@/hooks/buildProjectWorkspaceLayoutProps'")
    expect(loaderContent).not.toContain("from '@/hooks/buildProjectWorkspaceDerivedState'")
    expect(providerContent).not.toContain("from '@/hooks/buildProjectWorkspaceLayoutProps'")
    expect(providerContent).not.toContain("from '@/hooks/buildProjectWorkspaceDerivedState'")
  })
})
