import { describe, expect, test } from 'bun:test'
import {
  buildWorkflowArtifactMarkdown,
  buildWorkflowArtifactMaterializationDraft,
  buildWorkflowArtifactMaterializedPath,
} from './materialization'

describe('workflow artifact materialization', () => {
  test('builds portable .panda artifact paths', () => {
    const path = buildWorkflowArtifactMaterializedPath({
      chatId: 'chat123',
      artifactId: 'artifact12345678',
      kind: 'implementation_plan',
      title: 'My Implementation Plan!',
      createdAt: Date.parse('2026-05-25T00:00:00.000Z'),
    })

    expect(path).toContain('.panda/artifacts/chat123/implementation_plan/')
    expect(path).toContain('my-implementation-plan')
    expect(path).toContain('12345678.md')
  })

  test('builds markdown with metadata frontmatter', () => {
    const markdown = buildWorkflowArtifactMarkdown({
      chatId: 'chat123',
      artifactId: 'artifact123',
      kind: 'research',
      title: 'Research Notes',
      content: 'Findings here.',
    })

    expect(markdown).toContain('id: artifact123')
    expect(markdown).toContain('# Research Notes')
    expect(markdown).toContain('Findings here.')
  })

  test('returns a materialization draft', () => {
    const draft = buildWorkflowArtifactMaterializationDraft({
      chatId: 'chat123',
      artifactId: 'artifact123',
      kind: 'handoff',
      title: 'Handoff',
      content: 'Next steps.',
    })

    expect(draft.path).toMatch(/^\.panda\/artifacts\//)
    expect(draft.content).toContain('Next steps.')
  })
})
