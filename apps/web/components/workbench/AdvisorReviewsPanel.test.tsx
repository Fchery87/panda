import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { AdvisorReviewsList } from './AdvisorReviewsPanel'

describe('AdvisorReviewsList', () => {
  test('renders empty advisor review state', () => {
    const html = renderToStaticMarkup(<AdvisorReviewsList reviews={[]} />)
    expect(html).toContain('No advisor reviews yet')
  })

  test('renders persisted advisor decision details', () => {
    const html = renderToStaticMarkup(
      <AdvisorReviewsList
        reviews={[
          {
            _id: 'review_1',
            gates: ['destructive_command'],
            status: 'blocked',
            summary: 'Do not run this command.',
            reviewer: 'advisor-reviewer',
            createdAt: 1,
            risks: [
              {
                severity: 'high',
                finding: 'Deletes files.',
                recommendation: 'Use a scoped directory.',
              },
            ],
          },
        ]}
      />
    )

    expect(html).toContain('Advisor review')
    expect(html).toContain('blocked')
    expect(html).toContain('destructive_command')
    expect(html).toContain('Deletes files')
  })
})
