import { describe, expect, mock, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { FileTabs } from './FileTabs'
import {
  PlanArtifactTab,
  createPlanArtifactWorkspaceTab,
  upsertPlanArtifactWorkspaceTab,
} from './PlanArtifactTab'
import { Workbench } from './Workbench'
import type { GeneratedPlanArtifact } from '@/lib/planning/types'

const sampleArtifact: GeneratedPlanArtifact = {
  chatId: 'chat_sample',
  sessionId: 'plan_sample_session',
  title: 'Sample plan artifact',
  summary: 'A virtual plan tab should render beside file tabs.',
  markdown: `# Sample plan artifact

This plan tab is synthetic for phase 3.1.

## Acceptance Checks
- Plan tab renders
- File tabs remain intact`,
  sections: [
    {
      id: 'scope',
      title: 'Scope',
      content: 'Show the generated plan as a workspace artifact.',
      order: 1,
    },
  ],
  acceptanceChecks: ['Plan tab renders', 'File tabs remain intact'],
  status: 'ready_for_review',
  generatedAt: 1234567890,
}

mock.module('@/hooks/useShortcuts', () => ({
  useShortcuts: () => {},
}))

describe('PlanArtifactTab', () => {
  test('creates a virtual plan tab with a synthetic workspace path', () => {
    const tab = createPlanArtifactWorkspaceTab(sampleArtifact)

    expect(tab.kind).toBe('plan')
    expect(tab.path).toBe('plan:plan_sample_session')
    expect(tab.title).toBe(sampleArtifact.title)
    expect(tab.path).not.toContain(sampleArtifact.title)
  })

  test('renders the generated plan artifact in the workspace area', () => {
    const html = renderToStaticMarkup(<PlanArtifactTab artifact={sampleArtifact} />)

    expect(html).toContain('Plan Artifact')
    expect(html).toContain(sampleArtifact.title)
    expect(html).toContain(sampleArtifact.summary)
    expect(html).toContain('Sample plan artifact')
    expect(html).toContain('Acceptance checks')
    expect(html).toContain('Plan tab renders')
  })

  test('labels plan tabs distinctly beside file tabs', () => {
    const planTab = createPlanArtifactWorkspaceTab(sampleArtifact)
    const html = renderToStaticMarkup(
      <FileTabs
        tabs={[{ path: 'src/index.ts' }, planTab]}
        activePath={planTab.path}
        onSelect={() => {}}
        onClose={() => {}}
      />
    )

    expect(html).toContain('index.ts')
    expect(html).toContain('Plan: Sample plan artifact')
    expect(html).toContain('Close plan Sample plan artifact')
  })

  test('upserts plan tabs without duplicating file tabs', () => {
    const firstPlanTab = createPlanArtifactWorkspaceTab(sampleArtifact)
    const refreshedArtifact: GeneratedPlanArtifact = {
      ...sampleArtifact,
      title: 'Sample plan artifact v2',
      generatedAt: sampleArtifact.generatedAt + 1,
    }
    const nextTabs = upsertPlanArtifactWorkspaceTab(
      [{ path: 'src/index.ts', isDirty: true }, firstPlanTab],
      refreshedArtifact
    )

    expect(nextTabs).toHaveLength(2)
    expect(nextTabs[0]).toEqual({ path: 'src/index.ts', isDirty: true })
    expect(nextTabs[1]).toMatchObject({
      path: 'plan:plan_sample_session',
      title: 'Sample plan artifact v2',
      kind: 'plan',
    })
  })

  test('Workbench renders a selected virtual plan tab instead of the file editor', () => {
    const planTab = createPlanArtifactWorkspaceTab(sampleArtifact)

    const html = renderToStaticMarkup(
      <Workbench
        projectId={'project' as never}
        isMobileLayout={false}
        files={[
          {
            _id: 'file_1' as never,
            path: 'src/index.ts',
            content: 'export const value = 1',
            isBinary: false,
            updatedAt: 1,
          },
        ]}
        selectedFilePath={planTab.path}
        openTabs={[{ path: 'src/index.ts' }, planTab]}
        onSelectFile={() => {}}
        onCloseTab={() => {}}
        onCreateFile={() => {}}
        onRenameFile={() => {}}
        onDeleteFile={() => {}}
        onSaveFile={() => {}}
        onApplyPendingArtifact={() => {}}
        onRejectPendingArtifact={() => {}}
        onEditorDirtyChange={() => {}}
      />
    )

    expect(html).toContain('Plan Artifact')
    expect(html).toContain(sampleArtifact.title)
    expect(html).toContain('Plan: Sample plan artifact')
  })
})
