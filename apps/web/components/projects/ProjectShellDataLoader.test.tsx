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

describe('ProjectShellDataLoader structure', () => {
  test('renders ProjectNotFoundGuard when project is null', async () => {
    const content = await readLoader()
    expect(content).toContain('if (project === null)')
    expect(content).toContain('<ProjectNotFoundGuard />')
  })

  test('renders ProjectLoadingGuard when project or files are not ready', async () => {
    const content = await readLoader()
    expect(content).toContain('if (project === undefined || !files)')
    expect(content).toContain('<ProjectLoadingGuard projectLoaded={project !== undefined} />')
  })

  test('delegates all logic to WorkspaceRuntimeProvider', async () => {
    const content = await readLoader()
    expect(content).toContain("import { WorkspaceRuntimeProvider } from '@/components/projects/WorkspaceRuntimeProvider'")
    expect(content).toContain('<WorkspaceRuntimeProvider')
  })

  test('wraps children in AgentRuntimeProvider', async () => {
    const content = await readProvider()
    expect(content).toContain("import { AgentRuntimeProvider } from '@/contexts/AgentRuntimeContext'")
    expect(content).toContain('<AgentRuntimeProvider')
  })

  test('reads UI state from workspaceUiStore instead of prop drilling', async () => {
    const content = await readProvider()
    expect(content).toContain("import { useWorkspaceUiStore } from '@/stores/workspaceUiStore'")
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

  test('uses plan-draft helpers to gate approval and build actions', async () => {
    const content = await readProvider()
    expect(content).toContain("import { canApprovePlan, canBuildFromPlan")
    expect(content).toContain('canApprovePlan(')
    expect(content).toContain('canBuildFromPlan(')
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
