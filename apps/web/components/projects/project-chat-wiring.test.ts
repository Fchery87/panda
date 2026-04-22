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

  test('ProjectWorkspaceLayout renders the provided right panel content directly', async () => {
    const content = await readProjectComponent('ProjectWorkspaceLayout.tsx')

    expect(content).toContain('{rightPanelContent}')
    expect(content).not.toContain(
      '<RightPanel\n                              chatContent={chatPanel}'
    )
  })

  test('ProjectChatPanel keeps the planning inspector reachable', async () => {
    const content = await readProjectComponent('ProjectChatPanel.tsx')

    expect(content).toContain('const inspectorPanel = (')
    expect(content).toContain('onStartPlanningIntake={onStartPlanningIntake}')
    expect(content).toContain('onAnswerPlanningQuestion={onAnswerPlanningQuestion}')
    expect(content).toContain('onClearPlanningIntake={onClearPlanningIntake}')
  })

  test('ProjectChatInspector passes the active generated plan artifact into PlanPanel', async () => {
    const content = await readProjectComponent('ProjectChatInspector.tsx')

    expect(content).toContain('generatedPlanArtifact?: GeneratedPlanArtifact | null')
    expect(content).toContain('generatedPlanArtifact={generatedPlanArtifact}')
    expect(content).toContain('generatedPlanArtifact={planningSession?.generatedPlan ?? null}')
  })

  test('project page routes review/open actions into the non-inline chat inspector surface', async () => {
    const providerContent = await readProvider()
    const hookContent = await readHook('useWorkbenchChatState.ts')

    expect(hookContent).toContain('const openChatInspectorSurface = useCallback(')
    expect(hookContent).toContain("setRightPanelTab('chat')")
    expect(hookContent).toContain('setIsRightPanelOpen(true)')
    expect(hookContent).toContain('setIsChatInspectorOpen(true)')
    expect(hookContent).toContain('setChatInspectorTab(tab)')
    expect(providerContent).toContain("openChatInspectorSurface('artifacts')")
    expect(providerContent).toContain("onOpenPreviewPanel: () => setActiveCenterTab('preview')")
  })

  test('project page persists architect intake messages and opens the plan inspector', async () => {
    const content = await readProvider()
    const planningHookContent = await readHook('useProjectPlanningIntake.ts')

    expect(content).toContain('const addMessageMutation = useMutation(api.messages.add)')
    expect(content).toContain('const handleStartPlanningIntake = useProjectPlanningIntake({')
    expect(content).toContain('addMessage: addMessageMutation')
    expect(planningHookContent).toContain('setIsChatInspectorOpen(true)')
    expect(planningHookContent).toContain("setChatInspectorTab('plan')")
    expect(planningHookContent).toContain('await addMessage({')
    expect(planningHookContent).toContain("role: 'user'")
    expect(planningHookContent).toContain('content: taskSummary')
    expect(planningHookContent).toContain("annotations: [{ mode: 'plan' }]")
  })

  test('project page falls back to persisted convex messages when local agent state is empty', async () => {
    const content = await readHook('useWorkbenchChatState.ts')

    expect(content).toContain(
      'if (!agent.isLoading && agent.messages.length === 0 && convexMessages?.length)'
    )
    expect(content).toContain('attachments: msg.attachments')
  })

  test('project page derives changed file count from pending artifact previews instead of hardcoding zero', async () => {
    const providerContent = await readProvider()
    const hookContent = await readHook('useArtifactLifecycle.ts')

    expect(hookContent).toContain('const pendingChangedFilesCount = pendingArtifactPreviews.length')
    expect(providerContent).toContain('changedFilesCount: pendingChangedFilesCount')
    expect(providerContent).not.toContain('changedFilesCount={0}')
  })
})
