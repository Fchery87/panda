import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { InspectorPlanContent } from './ProjectChatInspector'
import type { GeneratedPlanArtifact } from '@/lib/planning/types'

const artifact: GeneratedPlanArtifact = {
  chatId: 'chat-1',
  sessionId: 'session-1',
  title: 'Implement generated file review',
  summary: 'Update apps/web/components/workbench/FileTree.tsx and apps/web/components/workbench/Workbench.tsx.',
  markdown: 'Expected changes in apps/web/components/workbench/FileTree.tsx.',
  sections: [],
  acceptanceChecks: ['Review generated files centrally'],
  status: 'accepted',
  generatedAt: 1,
}

describe('InspectorPlanContent lifecycle', () => {
  test('shows lifecycle, expected files, actual changed files, and Review Diff action', () => {
    const html = renderToStaticMarkup(
      <InspectorPlanContent
        planDraft="Draft plan"
        generatedPlanArtifact={artifact}
        planStatus="approved"
        onPlanDraftChange={() => {}}
        onSavePlanDraft={() => {}}
        onApprovePlan={() => {}}
        onBuildFromPlan={() => {}}
        isSavingPlanDraft={false}
        approveDisabled={false}
        buildDisabled={false}
        pendingDiffEntries={[
          {
            artifactId: 'artifact-1',
            path: 'apps/web/components/workbench/Workbench.tsx',
            status: 'modified',
            reviewStatus: 'pending',
            hunks: [],
          },
        ]}
        onReviewDiff={() => {}}
      />
    )

    expect(html).toContain('Implementation lifecycle')
    expect(html).toContain('Expected files')
    expect(html).toContain('apps/web/components/workbench/FileTree.tsx')
    expect(html).toContain('Actual changed files')
    expect(html).toContain('apps/web/components/workbench/Workbench.tsx')
    expect(html).toContain('Open Review Diff')
  })
})
