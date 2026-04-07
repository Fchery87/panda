import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { DecisionPanel } from './DecisionPanel'

describe('DecisionPanel', () => {
  test('renders decision summaries and affected files', () => {
    const html = renderToStaticMarkup(
      <DecisionPanel
        decisions={[
          {
            summary: 'Use Convex as the canonical state store.',
            category: 'architecture',
            relatedFilePaths: ['convex/forge.ts'],
            createdByRole: 'executive',
          },
        ]}
      />
    )

    expect(html).toContain('Decisions')
    expect(html).toContain('Use Convex as the canonical state store.')
    expect(html).toContain('architecture')
    expect(html).toContain('convex/forge.ts')
  })

  test('renders empty state when no decisions exist', () => {
    const html = renderToStaticMarkup(<DecisionPanel decisions={[]} />)

    expect(html).toContain('No decisions logged')
  })
})
