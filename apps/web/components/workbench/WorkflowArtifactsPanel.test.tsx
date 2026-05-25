import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { WorkflowArtifactList } from './WorkflowArtifactsPanel'

describe('WorkflowArtifactList', () => {
  test('renders empty workflow artifact state', () => {
    const html = renderToStaticMarkup(<WorkflowArtifactList artifacts={[]} />)
    expect(html).toContain('No workflow artifacts yet')
  })

  test('renders workflow artifact metadata and preview content', () => {
    const html = renderToStaticMarkup(
      <WorkflowArtifactList
        artifacts={[
          {
            _id: 'artifact_1',
            kind: 'implementation_plan',
            title: 'Plan implement',
            status: 'draft',
            sourceStage: 'plan',
            content: 'Implement the verified plan in slices.',
            createdAt: 100,
          },
        ]}
      />
    )

    expect(html).toContain('Plan implement')
    expect(html).toContain('Implementation Plan')
    expect(html).toContain('Stage')
    expect(html).toContain('Implement the verified plan in slices')
  })
})
