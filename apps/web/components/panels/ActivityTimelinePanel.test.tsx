import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { ActivityTimelinePanel } from './ActivityTimelinePanel'

describe('ActivityTimelinePanel', () => {
  test('renders audit timeline entries', () => {
    const html = renderToStaticMarkup(
      <ActivityTimelinePanel
        entries={[
          {
            kind: 'review',
            createdAt: 20,
            summary: 'Implementation review passed.',
            role: 'executive',
          },
          {
            kind: 'qa',
            createdAt: 30,
            summary: 'QA passed on the project route.',
          },
        ]}
      />
    )

    expect(html).toContain('Activity')
    expect(html).toContain('Implementation review passed.')
    expect(html).toContain('QA passed on the project route.')
    expect(html).toContain('review')
    expect(html).toContain('qa')
  })

  test('renders empty state when no activity entries exist', () => {
    const html = renderToStaticMarkup(<ActivityTimelinePanel entries={[]} />)

    expect(html).toContain('No activity yet')
  })
})
