import { describe, expect, test } from 'bun:test'
import path from 'node:path'

async function readProjectComponent(fileName: string) {
  const fs = await import('node:fs')
  return fs.readFileSync(path.resolve(import.meta.dir, fileName), 'utf-8')
}

async function readProvider() {
  const fs = await import('node:fs')
  return fs.readFileSync(path.resolve(import.meta.dir, 'WorkspaceRuntimeProvider.tsx'), 'utf-8')
}

async function readHook(fileName: string) {
  const fs = await import('node:fs')
  return fs.readFileSync(path.resolve(import.meta.dir, '../../hooks', fileName), 'utf-8')
}

describe('project chat wiring', () => {
  test('ProjectChatPanel no longer mounts the permission dialog locally', async () => {
    const content = await readProjectComponent('ProjectChatPanel.tsx')

    expect(content).not.toContain(
      "import { PermissionDialog } from '@/components/chat/PermissionDialog'"
    )
    expect(content).not.toContain('<PermissionDialog')
    expect(content).toContain('Run History')
    expect(content).toContain('projectId={projectId}')
  })

  test('ProjectWorkspaceLayout renders workbench and chat as simultaneous mode-aware surfaces', async () => {
    const content = await readProjectComponent('ProjectWorkspaceLayout.tsx')

    expect(content).toContain('CHAT_MODE_CONFIGS[chatMode].layout')
    expect(content).toContain('data-testid="workspace-editor-region"')
    expect(content).toContain('data-testid="workspace-chat-dock"')
    expect(content).toContain('Focus mode changes emphasis, not ownership')
    expect(content).not.toContain("workspaceFocusMode === 'chat' ? chatPanel : workbench")
    expect(content).not.toContain(
      '<RightPanel\n                              chatContent={chatPanel}'
    )
  })

  test('ProjectChatPanel routes planning and review actions into the inspector rail instead of mounting an inline inspector', async () => {
    const content = await readProjectComponent('ProjectChatPanel.tsx')

    expect(content).not.toContain('const inspectorPanel = (')
    expect(content).toContain("const onPlanReview = () => openRightPanelTab('context')")
    expect(content).not.toContain('ProjectChatInspector')
  })

  test('ProjectChatInspector delegates heavy inspector content to focused child modules', async () => {
    const content = await readProjectComponent('ProjectChatInspector.tsx')
    const researchContent = await readProjectComponent(
      '../chat/inspector/InspectorResearchContent.tsx'
    )
    const contextContent = await readProjectComponent(
      '../chat/inspector/InspectorContextContent.tsx'
    )

    expect(content).toContain('import { InspectorResearchContent }')
    expect(content).toContain('import { InspectorContextContent }')
    expect(content).not.toContain('api.researchSources.listByProject')
    expect(content).not.toContain('api.contextChunks.rebuildProject')
    expect(researchContent).toContain('api.researchSources.listByProject')
    expect(contextContent).toContain('api.contextChunks.rebuildProject')
    expect(contextContent).toContain('.panda/rules/*.md')
  })

  test('ProjectChatInspector delegates plan lifecycle content to a focused child module', async () => {
    const content = await readProjectComponent('ProjectChatInspector.tsx')
    const planContent = await readProjectComponent('../chat/inspector/InspectorPlanContent.tsx')

    expect(content).toContain('import {\n  InspectorPlanContent')
    expect(content).toContain('export { InspectorPlanContent }')
    expect(content).not.toContain('function getPlanLifecycleSteps')
    expect(content).not.toContain('function extractPlanFilePaths')
    expect(planContent).toContain('function getPlanLifecycleSteps')
    expect(planContent).toContain('function extractPlanFilePaths')
    expect(planContent).toContain('<PlanPanel')
  })

  test('ProjectChatInspector passes the active generated plan artifact into PlanPanel', async () => {
    const content = await readProjectComponent('ProjectChatInspector.tsx')
    const planContent = await readProjectComponent('../chat/inspector/InspectorPlanContent.tsx')

    expect(planContent).toContain('generatedPlanArtifact?: GeneratedPlanArtifact | null')
    expect(planContent).toContain('generatedPlanArtifact={generatedPlanArtifact}')
    expect(content).toContain('generatedPlanArtifact={planningSession?.generatedPlan ?? null}')
  })

  test('ProjectChatInspector delegates run evidence content to a focused child module', async () => {
    const content = await readProjectComponent('ProjectChatInspector.tsx')
    const runContent = await readProjectComponent('../chat/inspector/InspectorRunContent.tsx')

    expect(content).toContain('import {\n  InspectorRunContent')
    expect(content).toContain('export { InspectorRunContent }')
    expect(content).not.toContain('api.agentRuns.listRunTree')
    expect(content).not.toContain('<AgentEventsPanel />')
    expect(runContent).toContain('api.agentRuns.listRunTree')
    expect(runContent).toContain(
      "import { AgentEventsPanel } from '@/components/panels/AgentEventsPanel'"
    )
    expect(runContent).toContain('Agent events')
    expect(runContent).toContain('<AgentEventsPanel />')
  })

  test('ProjectChatInspector delegates memory and evals content to focused child modules', async () => {
    const content = await readProjectComponent('ProjectChatInspector.tsx')
    const memoryContent = await readProjectComponent('../chat/inspector/InspectorMemoryContent.tsx')
    const evalsContent = await readProjectComponent('../chat/inspector/InspectorEvalsContent.tsx')

    expect(content).toContain('import {\n  InspectorMemoryContent')
    expect(content).toContain('import {\n  InspectorEvalsContent')
    expect(content).toContain('export { InspectorMemoryContent }')
    expect(content).toContain('export { InspectorEvalsContent }')
    expect(content).not.toContain('MemoryBankEditor')
    expect(content).not.toContain('EvalPanel')
    expect(memoryContent).toContain('MemoryBankEditor')
    expect(evalsContent).toContain('EvalPanel')
  })

  test('project page routes review/open actions directly into the shared inspector rail', async () => {
    const providerContent = await readProvider()
    const runtimeValueHook = await readHook('useWorkspaceRuntimeValue.ts')

    expect(runtimeValueHook).toContain("onToggleInspector: () => openRightPanelTab('proof')")
    expect(runtimeValueHook).toContain("onOpenHistory: () => openRightPanelTab('proof')")
    expect(providerContent).toContain("openRightPanelTab('changes')")
    expect(providerContent).not.toContain('onOpenPreviewPanel')
  })

  test('project page persists seeded planning intake messages and opens the plan rail', async () => {
    const content = await readProvider()
    const planningHookContent = await readHook('useProjectPlanningIntake.ts')

    expect(content).toContain('const addMessageMutation = useMutation(api.messages.add)')
    expect(content).toContain('const handleStartPlanningIntake = useProjectPlanningIntake({')
    expect(content).toContain('addMessage: addMessageMutation')
    expect(planningHookContent).toContain("openRightPanelTab('context')")
    expect(planningHookContent).not.toContain('setIsChatInspectorOpen')
    expect(planningHookContent).toContain('await addMessage({')
    expect(planningHookContent).toContain("role: 'user'")
    expect(planningHookContent).toContain('buildPlanningIntakeMessage(seed ?? null)')
    expect(planningHookContent).toContain("annotations: [{ mode: 'plan' }]")
  })

  test('project page falls back to persisted convex messages when local agent state is empty', async () => {
    const content = await readHook('useWorkbenchChatState.ts')

    expect(content).toContain(
      'if (!agent.isLoading && agent.messages.length === 0 && persistedChatMessages.length)'
    )
    expect(content).toContain('attachments: msg.attachments')
  })

  test('WorkspaceRuntimeProvider delegates shell UI state wiring to a focused hook', async () => {
    const providerContent = await readProvider()
    const shellUiHook = await readHook('useProjectShellUiState.ts')

    expect(providerContent).toContain('import { useProjectShellUiState }')
    expect(providerContent).toContain('} = useProjectShellUiState()')
    expect(providerContent).not.toContain('const handleSetRightPanelTab = useCallback')
    expect(shellUiHook).toContain('setRightPanelTabFromAction')
    expect(shellUiHook).toContain('setBottomDockOpenFromAction')
    expect(shellUiHook).toContain('setMobilePrimaryPanelFromAction')
  })

  test('WorkspaceRuntimeProvider delegates execution-session focus actions to a focused hook', async () => {
    const providerContent = await readProvider()
    const focusHook = await readHook('useExecutionSessionFocusState.ts')

    expect(providerContent).toContain('import { useExecutionSessionFocusState }')
    expect(providerContent).toContain('useExecutionSessionFocusState({')
    expect(providerContent).not.toContain('function mapExecutionSessionAction')
    expect(providerContent).not.toContain('const handleFocusPrimaryAction = useCallback')
    expect(focusHook).toContain('function mapExecutionSessionAction')
    expect(focusHook).toContain("openRightPanelTab('proof')")
    expect(focusHook).toContain("setActiveCenterTab('diff')")
  })

  test('WorkspaceRuntimeProvider delegates browser runtime file mounting to a focused hook', async () => {
    const providerContent = await readProvider()
    const runtimeMountHook = await readHook('useProjectRuntimeFileMount.ts')

    expect(providerContent).toContain('import { useProjectRuntimeFileMount }')
    expect(providerContent).toContain('useProjectRuntimeFileMount({')
    expect(providerContent).not.toContain('const mountedRuntimeProjectRef = useRef')
    expect(providerContent).not.toContain('mountProjectFiles(instance')
    expect(runtimeMountHook).toContain('const mountedRuntimeProjectRef = useRef')
    expect(runtimeMountHook).toContain('api.files.batchGet')
    expect(runtimeMountHook).toContain('mountProjectFiles(instance')
  })

  test('WorkspaceRuntimeProvider delegates local import and shell hotkeys to focused hooks', async () => {
    const providerContent = await readProvider()
    const importHook = await readHook('useImportLocalWorkspace.ts')
    const hotkeysHook = await readHook('useWorkspaceShellHotkeys.ts')

    expect(providerContent).toContain('import { useImportLocalWorkspace }')
    expect(providerContent).toContain(
      'const handleImportLocalWorkspace = useImportLocalWorkspace({'
    )
    expect(providerContent).toContain('import { useWorkspaceShellHotkeys }')
    expect(providerContent).toContain('useWorkspaceShellHotkeys()')
    expect(providerContent).not.toContain("fetch('/api/local-workspace/files?maxFiles=500')")
    expect(providerContent).not.toContain("useHotkeys(\n    'mod+i'")
    expect(importHook).toContain("fetch('/api/local-workspace/files?maxFiles=500')")
    expect(importHook).toContain('importWorkspaceFile({')
    expect(hotkeysHook).toContain("useHotkeys(\n    'mod+i'")
    expect(hotkeysHook).toContain("useHotkeys(\n    'mod+/'")
  })

  test('WorkspaceRuntimeProvider delegates workspace layout prop assembly to a focused hook', async () => {
    const providerContent = await readProvider()
    const layoutPropsHook = await readHook('useProjectWorkspaceLayoutProps.tsx')
    const layoutContent = await readProjectComponent('ProjectWorkspaceLayout.tsx')

    expect(providerContent).toContain('import { useProjectWorkspaceLayoutProps }')
    expect(providerContent).toContain('const layoutProps = useProjectWorkspaceLayoutProps({')
    expect(providerContent).not.toContain('chatPanel: <ProjectChatPanel')
    expect(providerContent).not.toContain('activeTaskTitle: agent.isLoading')
    expect(layoutPropsHook).toContain('chatPanel: <ProjectChatPanel projectId={projectId} />')
    expect(layoutPropsHook).toContain('activeTaskTitle: isStreaming')
    expect(layoutContent).toContain('export interface ProjectWorkspaceLayoutProps')
  })

  test('WorkspaceRuntimeProvider delegates WorkspaceRuntimeContext value assembly to a focused hook', async () => {
    const providerContent = await readProvider()
    const runtimeValueHook = await readHook('useWorkspaceRuntimeValue.ts')

    expect(providerContent).toContain('import { useWorkspaceRuntimeValue }')
    expect(providerContent).toContain('const runtimeValue = useWorkspaceRuntimeValue({')
    expect(providerContent).not.toContain('const runtimeValue = useMemo(')
    expect(providerContent).not.toContain('onRevealInExplorer: (folderPath: string) =>')
    expect(runtimeValueHook).toContain('export function useWorkspaceRuntimeValue')
    expect(runtimeValueHook).toContain('onRevealInExplorer: (folderPath: string) =>')
    expect(runtimeValueHook).toContain('onToggleRightPanel: () =>')
  })

  test('workspace disables useAgent persisted message hydration', async () => {
    const providerContent = await readProvider()
    const agentHookContent = await readHook('useAgent.ts')

    expect(providerContent).toContain('hydratePersistedMessages: false')
    expect(providerContent).toContain('getPromptHistoryMessages: () =>')
    expect(providerContent).toContain('promptHistoryMessagesRef.current = messages')
    expect(agentHookContent).toContain('hydratePersistedMessages = true')
  })

  test('ProjectChatPanel adapts selected model IDs before writing chat session state', async () => {
    const content = await readProjectComponent('ProjectChatPanel.tsx')

    expect(content).toContain('const setUiSelectedModel = useChatSessionStore')
    expect(content).toContain('(model: string) => setUiSelectedModel({ modelId: model })')
    expect(content).not.toContain('as unknown as')
  })

  test('useWorkbenchChatState no longer manages a separate inline inspector surface', async () => {
    const content = await readHook('useWorkbenchChatState.ts')

    expect(content).not.toContain('openChatInspectorSurface')
    expect(content).not.toContain('chatInspectorSurfaceTab')
  })

  test('project page derives changed file count from pending artifact previews instead of hardcoding zero', async () => {
    const providerContent = await readProvider()
    const hookContent = await readHook('useArtifactLifecycle.ts')

    expect(hookContent).toContain('const pendingChangedFilesCount = pendingArtifactPreviews.length')
    expect(providerContent).toContain('changedFilesCount: pendingChangedFilesCount')
    expect(providerContent).not.toContain('changedFilesCount={0}')
  })
})
