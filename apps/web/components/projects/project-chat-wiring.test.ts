import { describe, expect, test } from 'bun:test'
import path from 'node:path'

async function readProjectComponent(fileName: string) {
  const fs = await import('node:fs')
  return fs.readFileSync(path.resolve(import.meta.dir, fileName), 'utf-8')
}

async function readProjectPage() {
  const fs = await import('node:fs')
  return fs.readFileSync(
    path.resolve(import.meta.dir, '../../app/(dashboard)/projects/[projectId]/page.tsx'),
    'utf-8'
  )
}

describe('project chat wiring', () => {
  test('ProjectChatPanel no longer mounts the permission dialog locally', async () => {
    const content = await readProjectComponent('ProjectChatPanel.tsx')

    expect(content).not.toContain(
      "import { PermissionDialog } from '@/components/chat/PermissionDialog'"
    )
    expect(content).not.toContain('<PermissionDialog')
    expect(content).toContain('Run History')
    expect(content).toContain('resetWorkspaceLabel')
    expect(content).toContain('projectId={projectId}')
  })

  test('ProjectWorkspaceLayout renders the provided right panel content directly', async () => {
    const content = await readProjectComponent('ProjectWorkspaceLayout.tsx')

    expect(content).toContain('{rightPanelContent}')
    expect(content).not.toContain(
      '<RightPanel\n                              chatContent={chatPanel}'
    )
  })

  test('ProjectChatPanel keeps the planning inspector reachable when inline inspector rendering is disabled', async () => {
    const content = await readProjectComponent('ProjectChatPanel.tsx')

    expect(content).toContain('const inspectorPanel = (')
    expect(content).toContain('{renderInspectorInline ? inspectorPanel : null}')
    expect(content).toContain('{!renderInspectorInline ? inspectorPanel : null}')
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
    const content = await readProjectPage()

    expect(content).toContain('const openChatInspectorSurface = useCallback(')
    expect(content).toContain("setRightPanelTab('chat')")
    expect(content).toContain('setIsRightPanelOpen(true)')
    expect(content).toContain('setIsChatInspectorOpen(true)')
    expect(content).toContain('setChatInspectorTab(tab)')
    expect(content).toContain('isInspectorOpen={isChatInspectorOpen}')
    expect(content).toContain('onInspectorOpenChange={setIsChatInspectorOpen}')
    expect(content).toContain('onInspectorTabChange={setChatInspectorTab}')
    expect(content).toContain("openChatInspectorSurface('artifacts')")
  })

  test('project page persists architect intake messages and opens the plan inspector', async () => {
    const content = await readProjectPage()

    expect(content).toContain('const addMessageMutation = useMutation(api.messages.add)')
    expect(content).toContain('setIsChatInspectorOpen(true)')
    expect(content).toContain("setChatInspectorTab('plan')")
    expect(content).toContain('await addMessageMutation({')
    expect(content).toContain("role: 'user'")
    expect(content).toContain('content: taskSummary')
    expect(content).toContain("annotations: [{ mode: 'architect' }]")
  })

  test('project page falls back to persisted convex messages when local agent state is empty', async () => {
    const content = await readProjectPage()

    expect(content).toContain(
      'if (!agent.isLoading && agent.messages.length === 0 && convexMessages?.length)'
    )
    expect(content).toContain('attachments: msg.attachments')
  })
})
