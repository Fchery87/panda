import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { getPlanPanelArtifactIdentity, getPlanPanelDefaultTab, PlanPanel } from './PlanPanel'
import type { GeneratedPlanArtifact } from '@/lib/planning/types'

const generatedPlanArtifact: GeneratedPlanArtifact = {
  chatId: 'chat-1',
  sessionId: 'session-1',
  title: 'Structured Review Plan',
  summary: 'Review the generated plan before editing markdown.',
  markdown: '# Structured Review Plan',
  sections: [
    { id: 'build', title: 'Build', content: 'Implement the inspector changes.', order: 2 },
    { id: 'goal', title: 'Goal', content: 'Make structured review the default.', order: 1 },
  ],
  acceptanceChecks: ['Render sections in order', 'Keep markdown editing available'],
  status: 'ready_for_review',
  generatedAt: 123,
}

describe('PlanPanel', () => {
  test('uses generatedAt in the artifact identity so regenerated plans in the same session reset to review', () => {
    expect(getPlanPanelDefaultTab(generatedPlanArtifact)).toBe('review')
    expect(
      getPlanPanelArtifactIdentity({
        ...generatedPlanArtifact,
        generatedAt: 123,
      })
    ).toBe('session-1:123')
    expect(
      getPlanPanelArtifactIdentity({
        ...generatedPlanArtifact,
        generatedAt: 456,
      })
    ).toBe('session-1:456')
    expect(getPlanPanelArtifactIdentity(null)).toBe('draft')
  })

  test('renders structured review as the default path when a generated plan artifact exists', () => {
    const html = renderToStaticMarkup(
      <PlanPanel
        planDraft="# Draft markdown"
        generatedPlanArtifact={generatedPlanArtifact}
        onChange={() => {}}
        onSave={() => {}}
        isSaving={false}
        lastSavedAt={null}
      />
    )

    expect(html).toContain('Review')
    expect(html).toContain('Markdown')
    expect(html).toContain('Structured Review')
    expect(html).toContain('Structured Review Plan')
    expect(html).toContain('Review the generated plan before editing markdown.')
    expect(html).toContain('Goal')
    expect(html).toContain('Build')
    expect(html.indexOf('Goal')).toBeLessThan(html.indexOf('Build'))
    expect(html).toContain('Render sections in order')
    expect(html).toContain('Keep markdown editing available')
    expect(html).toContain('data-state="active"')
  })

  test('falls back to markdown-first tabs when no generated plan artifact exists', () => {
    const html = renderToStaticMarkup(
      <PlanPanel
        planDraft="# Draft markdown"
        onChange={() => {}}
        onSave={() => {}}
        isSaving={false}
        lastSavedAt={null}
      />
    )

    expect(html).not.toContain('Structured Review')
    expect(html).not.toContain('No structured sections available.')
    expect(html).toContain('Edit')
    expect(html).toContain('Markdown')
  })
})
