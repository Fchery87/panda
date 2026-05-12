import { describe, expect, test } from 'bun:test'
import { renderToString } from 'react-dom/server'

import { SharedTranscript } from './SharedTranscript'

describe('SharedTranscript', () => {
  test('renders a read-only transcript with role-aware message layout', () => {
    const html = renderToString(
      <SharedTranscript
        messages={[
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there' },
        ]}
      />
    )

    expect(html).toContain('Hello')
    expect(html).toContain('Hi there')
    expect(html).toContain('User')
    expect(html).toContain('Assistant')
  })

  test('renders a public review summary before the transcript without owner proof details', () => {
    const html = renderToString(
      <SharedTranscript
        publicReviewSummary={{
          outcome: 'complete',
          validation: '1 validation command recorded',
          changedFiles: 2,
          reviewNote:
            'Public share hides raw tool arguments, command output, and owner-only proof detail.',
        }}
        messages={[{ role: 'assistant', content: 'Public transcript starts here' }]}
      />
    )

    expect(html).toContain('Public review summary')
    expect(html).toContain('Outcome')
    expect(html).toContain('complete')
    expect(html).toContain('Validation')
    expect(html).toContain('1 validation command recorded')
    expect(html).toContain('Changed files')
    expect(html).toContain('2')
    expect(html).toContain('Public transcript starts here')
    expect(html.indexOf('Public review summary')).toBeLessThan(
      html.indexOf('Public transcript starts here')
    )
    expect(html).not.toContain('SECRET_TOKEN')
    expect(html).not.toContain('stack trace')
  })
})
