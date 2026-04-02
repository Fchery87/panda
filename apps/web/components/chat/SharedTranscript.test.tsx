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
})
