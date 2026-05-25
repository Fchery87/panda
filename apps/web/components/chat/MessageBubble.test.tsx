import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

import { buildAskUserAnswerPrompt, MessageBubble } from './MessageBubble'
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

function userMessage(overrides: Partial<Message> = {}): Message {
  return {
    _id: 'user-1',
    role: 'user',
    content: 'create a folder named docs',
    createdAt: 100,
    annotations: {
      mode: 'code',
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

describe('MessageBubble ask_user tool cards', () => {
  const askUserMessage = assistantMessage({
    content: '',
    toolCalls: [
      {
        id: 'tool-1',
        name: 'ask_user',
        args: {},
        status: 'completed',
        result: {
          durationMs: 1,
          output: JSON.stringify({
            status: 'pending',
            questionnaire: {
              rationale: 'Need direction before editing.',
              questions: [
                {
                  id: 'direction',
                  prompt: 'Which implementation direction?',
                  recommended: 'minimal',
                  options: [
                    { value: 'minimal', label: 'Minimal patch' },
                    { value: 'refactor', label: 'Refactor' },
                  ],
                },
              ],
            },
          }),
        },
      },
    ],
  })

  test('renders pending structured user questions from ask_user tool output', () => {
    const html = renderToStaticMarkup(<MessageBubble message={askUserMessage} />)

    expect(html).toContain('User decision')
    expect(html).toContain('Need direction before editing.')
    expect(html).toContain('Which implementation direction?')
    expect(html).toContain('Minimal patch')
    expect(html).toContain('Recommended')
  })

  test('builds a structured follow-up prompt for option clicks', () => {
    const prompt = buildAskUserAnswerPrompt({
      prompt: 'Which implementation direction?',
      optionLabel: 'Minimal patch',
      optionValue: 'minimal',
    })

    expect(prompt).toContain('Which implementation direction?')
    expect(prompt).toContain('Minimal patch')
    expect(prompt).toContain('minimal')
  })

  test('renders pending questions from live ask_user tool-call arguments before tool result arrives', () => {
    const html = renderToStaticMarkup(
      <MessageBubble
        message={assistantMessage({
          content: '',
          toolCalls: [
            {
              id: 'tool-live',
              name: 'ask_user',
              args: {
                rationale: 'Need a live runtime decision.',
                questions: [
                  {
                    id: 'scope',
                    prompt: 'Which scope?',
                    recommended: 'small',
                    options: [{ value: 'small', label: 'Small' }],
                  },
                ],
              },
              status: 'running',
            },
          ],
        })}
        isStreaming
        onAskUserAnswer={() => undefined}
      />
    )

    expect(html).toContain('User decision · pending')
    expect(html).toContain('Need a live runtime decision.')
    expect(html).toContain('Which scope?')
    expect(html).toContain('Small')
  })
})

describe('MessageBubble routing receipts', () => {
  test('renders a visible natural-language auto-routing receipt on user messages', () => {
    const html = renderToStaticMarkup(
      <MessageBubble
        message={userMessage({
          annotations: {
            mode: 'code',
            autoModeSwitch: {
              fromMode: 'plan',
              toMode: 'code',
              confidence: 'high',
              rationale: 'The request asks for a concrete file-system change.',
              boundary: 'write-capable',
            },
          },
        })}
      />
    )

    expect(html).toContain('Routed by Panda')
    expect(html).toContain('high confidence')
    expect(html).toContain('write-capable')
    expect(html).toContain('Plan')
    expect(html).toContain('Agent · Guided')
    expect(html).toContain('concrete file-system change')
  })
})
