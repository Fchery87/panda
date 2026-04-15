import { describe, expect, mock, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Dispatch, SetStateAction } from 'react'
import { FileTabs } from './FileTabs'
import {
  PlanArtifactTab,
  createPlanArtifactWorkspaceTab,
  upsertPlanArtifactWorkspaceTab,
} from './PlanArtifactTab'
import { Workbench } from './Workbench'
import {
  WorkspaceProvider,
  type WorkspaceContextValue,
  type WorkspaceOpenTab,
} from '@/contexts/WorkspaceContext'
import type { GeneratedPlanArtifact } from '@/lib/planning/types'
import type { ChatMode } from '@/lib/agent/prompt-library'

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

function noopDispatch<T>(value: SetStateAction<T>) {
  void value
}

function createWorkspaceValue(
  overrides: Partial<WorkspaceContextValue> = {}
): WorkspaceContextValue {
  return {
    projectId: 'project' as never,
    activeChatId: 'chat' as never,
    chatMode: 'architect' as ChatMode,
    onSelectChat: () => {},
    onNewChat: () => {},
    activeSection: 'files',
    isFlyoutOpen: false,
    handleSectionChange: () => {},
    toggleFlyout: () => {},
    selectedFilePath: null,
    setSelectedFilePath: noopDispatch as Dispatch<SetStateAction<string | null>>,
    selectedFileLocation: null,
    setSelectedFileLocation: noopDispatch as Dispatch<
      SetStateAction<{ line: number; column: number; nonce: number } | null>
    >,
    openTabs: [],
    setOpenTabs: noopDispatch as Dispatch<SetStateAction<WorkspaceOpenTab[]>>,
    cursorPosition: null,
    setCursorPosition: noopDispatch as Dispatch<
      SetStateAction<{ line: number; column: number } | null>
    >,
    isMobileLayout: false,
    isCompactDesktopLayout: false,
    mobilePrimaryPanel: 'workspace',
    setMobilePrimaryPanel: noopDispatch as Dispatch<
      SetStateAction<'workspace' | 'chat' | 'review'>
    >,
    ...overrides,
  }
}

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
    const workspaceValue = createWorkspaceValue({
      openTabs: [{ path: 'src/index.ts' }, planTab],
      selectedFilePath: planTab.path,
    })

    const html = renderToStaticMarkup(
      <WorkspaceProvider value={workspaceValue}>
        <Workbench
          projectId={'project' as never}
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
      </WorkspaceProvider>
    )

    expect(html).toContain('Plan Artifact')
    expect(html).toContain(sampleArtifact.title)
    expect(html).toContain('Plan: Sample plan artifact')
  })
})
