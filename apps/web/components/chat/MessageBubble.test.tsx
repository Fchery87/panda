import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

import { MessageBubble } from './MessageBubble'
import type { Message } from './types'

function assistantMessage(overrides: Partial<Message> = {}): Message {
  return {
    _id: 'assistant-1',
    role: 'assistant',
    content: 'The answer text.',
    createdAt: 100,
    annotations: {
      mode: 'build',
      model: 'test-model',
    },
    ...overrides,
  }
}

describe('MessageBubble Thinking rendering', () => {
  test('renders live Thinking before answer text exists without an empty answer bubble', () => {
    const html = renderToStaticMarkup(
      <MessageBubble
        message={assistantMessage({
          content: '',
          reasoningContent: 'Inspecting the files before editing.',
        })}
        isStreaming
      />
    )

    expect(html).toContain('Thinking')
    expect(html).toContain('Inspecting the files before editing.')
    expect(html).toContain('aria-expanded="true"')
    expect(html).not.toContain('selection:bg-primary/20 selection:text-foreground')
  })

  test('renders historical Thinking collapsed when a summary exists', () => {
    const html = renderToStaticMarkup(
      <MessageBubble
        message={assistantMessage({
          content: 'Implemented the panel.',
          reasoningContent: 'Mapped the current chat panel seams.',
        })}
      />
    )

    expect(html).toContain('Thinking')
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('Mapped the current chat panel seams.')
    expect(html).toContain('Implemented the panel.')
  })

  test('renders unavailable Thinking indicator from reasoning tokens', () => {
    const html = renderToStaticMarkup(
      <MessageBubble
        message={assistantMessage({
          annotations: {
            mode: 'build',
            reasoningTokens: 1200,
          },
        })}
      />
    )

    expect(html).toContain('Thinking used')
    expect(html).toContain('summary unavailable')
  })
})
