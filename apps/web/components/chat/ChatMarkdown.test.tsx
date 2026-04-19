'use client'

import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

import { ChatMarkdown, StreamingChatMarkdown } from './ChatMarkdown'

describe('ChatMarkdown', () => {
  test('renders standard markdown content', () => {
    const markup = renderToStaticMarkup(<ChatMarkdown content={'## Title\n\nHello **world**'} />)

    expect(markup).toContain('Title')
    expect(markup).toContain('world')
    expect(markup).toContain('<h2')
  })

  test('renders streaming content with settled blocks preserved', () => {
    const markup = renderToStaticMarkup(
      <StreamingChatMarkdown content={'## Title\n\nFirst paragraph\n\n- one\n- two'} batchMs={0} />
    )

    expect(markup).toContain('Title')
    expect(markup).toContain('First paragraph')
    expect(markup).toContain('one')
    expect(markup).toContain('two')
    expect(markup).toContain('<h2')
    expect(markup).toContain('<ul')
  })

  test('renders an in-progress trailing fenced code block as a code shell', () => {
    const markup = renderToStaticMarkup(
      <StreamingChatMarkdown content={'Before code\n\n```ts\nconst value = 1;'} batchMs={0} />
    )

    expect(markup).toContain('Before code')
    expect(markup).toContain('const value = 1;')
    expect(markup).toContain('<pre')
  })

  test('renders a trailing unordered list tail without waiting for markdown to settle', () => {
    const markup = renderToStaticMarkup(
      <StreamingChatMarkdown content={'Before list\n\n- first\n- second'} batchMs={0} />
    )

    expect(markup).toContain('Before list')
    expect(markup).toContain('first')
    expect(markup).toContain('second')
    expect(markup).toContain('<ul')
  })

  test('renders a trailing table tail in a stable table shell', () => {
    const markup = renderToStaticMarkup(
      <StreamingChatMarkdown
        content={'Before table\n\n| Name | Value |\n| foo | 1 |'}
        batchMs={0}
      />
    )

    expect(markup).toContain('Before table')
    expect(markup).toContain('Name')
    expect(markup).toContain('foo')
    expect(markup).toContain('<table')
  })

  test('repairs partial inline markdown in the active streaming block', () => {
    const markup = renderToStaticMarkup(
      <StreamingChatMarkdown content={'Hello **bold and [link](https://example.com'} batchMs={0} />
    )

    expect(markup).toContain('bold and')
    expect(markup).toContain('href="https://example.com"')
    expect(markup).toContain('>link</a>')
  })

  test('renders a trailing blockquote tail without waiting for closure', () => {
    const markup = renderToStaticMarkup(
      <StreamingChatMarkdown
        content={'Before quote\n\n> quoted line\n> another line'}
        batchMs={0}
      />
    )

    expect(markup).toContain('Before quote')
    expect(markup).toContain('quoted line')
    expect(markup).toContain('another line')
    expect(markup).toContain('<blockquote')
  })
})
