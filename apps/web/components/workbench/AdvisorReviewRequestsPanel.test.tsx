import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { AdvisorReviewRequestsList } from './AdvisorReviewRequestsPanel'

describe('AdvisorReviewRequestsList', () => {
  test('renders empty pending request state', () => {
    const html = renderToStaticMarkup(<AdvisorReviewRequestsList requests={[]} />)
    expect(html).toContain('No pending advisor review requests')
  })

  test('renders pending request gates and prompt', () => {
    const html = renderToStaticMarkup(
      <AdvisorReviewRequestsList
        requests={[
          {
            _id: 'request_1',
            artifactId: 'artifact_1',
            gates: ['destructive_command'],
            prompt: 'Review rm -rf tmp',
            status: 'pending',
            createdAt: 1,
          },
        ]}
      />
    )

    expect(html).toContain('Pending advisor request')
    expect(html).toContain('destructive_command')
    expect(html).toContain('Review rm -rf tmp')
  })

  test('renders manual and automatic completion affordances when handlers are supplied', () => {
    const html = renderToStaticMarkup(
      <AdvisorReviewRequestsList
        requests={[
          {
            _id: 'request_1',
            artifactId: 'artifact_1',
            gates: ['destructive_command'],
            prompt: 'Review rm -rf tmp',
            status: 'pending',
            createdAt: 1,
          },
        ]}
        onCompleteRequest={() => {}}
        onRunAdvisorReviewer={() => {}}
      />
    )

    expect(html).toContain('Enter Advisor Output')
    expect(html).toContain('Run Advisor Reviewer')
  })
})
